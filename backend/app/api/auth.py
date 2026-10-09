import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select

from app.core.config import settings
from app.core.database import get_db, utcnow
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.core.ratelimit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import DriverProfile, RefreshToken, TelegramCode, User
from app.schemas.auth import (
    ForgotIn,
    ForgotOut,
    LoginIn,
    LoginOut,
    LogoutIn,
    RefreshIn,
    RefreshOut,
    RegisterIn,
    RegisterOut,
    ResendCodeIn,
    ResetIn,
    VerifyCodeIn,
    VerifyOut,
)
from app.schemas.common import DevMessageOut, DetailOut
from app.schemas.user import UserOut, user_out
from app.services.telegram import MAX_ATTEMPTS, send_code, send_text

router = APIRouter(tags=["auth"])

_rl_register = rate_limit("register", 5, 60)
_rl_verify = rate_limit("verify", 10, 60)
_rl_resend = rate_limit("resend", 3, 60)
_rl_login = rate_limit("login", 10, 60)


def _issue_tokens(db, user: User) -> dict:
    access_token = create_access_token(user.id)
    refresh_token, jti = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            jti=jti,
            user_id=user.id,
            expires_at=utcnow() + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_out(user),
    }


@router.post("/auth/register", response_model=RegisterOut, status_code=201)
def register(
    body: RegisterIn,
    db=Depends(get_db),
    _limited=Depends(_rl_register),
):
    existing = db.scalar(select(User).where(User.phone == body.phone))
    if existing is not None:
        raise DomainError("Phone number already registered", 409)
    if body.email:
        email_exists = db.scalar(select(User).where(User.email == str(body.email)))
        if email_exists is not None:
            raise DomainError("Email already registered", 409)
    user = User(
        full_name=body.full_name,
        phone=body.phone,
        email=str(body.email) if body.email else None,
        password_hash=hash_password(body.password),
        role=body.role,
        telegram_id=body.telegram_id,
        is_verified=False,
    )
    db.add(user)
    db.flush()
    if user.role == "driver":
        db.add(
            DriverProfile(
                user_id=user.id,
                vehicle_category=body.vehicle_category or "Yengil avto",
            )
        )
    db.commit()
    dev_code = send_code(db, user.phone, user.telegram_id)
    return RegisterOut(
        user_id=user.id,
        phone=user.phone,
        message="Tasdiqlash kodi yuborildi",
        dev_code=dev_code,
    )


@router.post("/auth/verify-code", response_model=VerifyOut)
def verify_code(
    body: VerifyCodeIn,
    db=Depends(get_db),
    _limited=Depends(_rl_verify),
):
    user = db.scalar(select(User).where(User.phone == body.phone))
    if user is None:
        raise DomainError("User not found", 404)
    row = db.scalar(
        select(TelegramCode)
        .where(TelegramCode.phone == body.phone)
        .order_by(TelegramCode.id.desc())
    )
    if row is None:
        raise DomainError("Code not found or expired", 400)
    if row.expires_at < utcnow():
        raise DomainError("Code expired", 400)
    if row.attempts >= MAX_ATTEMPTS:
        raise DomainError("Too many attempts, request a new code", 429)
    if row.code != body.code:
        row.attempts += 1
        db.commit()
        raise DomainError("Invalid code", 400)
    user.is_verified = True
    db.query(TelegramCode).filter(TelegramCode.phone == body.phone).delete()
    db.commit()
    return VerifyOut(**_issue_tokens(db, user))


@router.post("/auth/resend-code", response_model=DevMessageOut)
def resend_code(
    body: ResendCodeIn,
    db=Depends(get_db),
    _limited=Depends(_rl_resend),
):
    user = db.scalar(select(User).where(User.phone == body.phone))
    if user is None:
        raise DomainError("User not found", 404)
    if user.is_verified:
        raise DomainError("User already verified", 400)
    dev_code = send_code(db, user.phone, user.telegram_id)
    return DevMessageOut(message="Tasdiqlash kodi qayta yuborildi", dev_code=dev_code)


@router.post("/auth/login", response_model=LoginOut)
def login(
    body: LoginIn,
    db=Depends(get_db),
    _limited=Depends(_rl_login),
):
    identifier = body.identifier.strip()
    user = db.scalar(
        select(User).where(or_(User.phone == identifier, User.email == identifier))
    )
    if user is None or not verify_password(user.password_hash, body.password):
        raise DomainError("Invalid credentials", 401)
    if user.is_blocked:
        raise DomainError("Account blocked", 403)
    return LoginOut(**_issue_tokens(db, user))


@router.post("/auth/refresh", response_model=RefreshOut)
def refresh(body: RefreshIn, db=Depends(get_db)):
    payload = decode_token(body.refresh, "refresh")
    row = db.scalar(select(RefreshToken).where(RefreshToken.jti == payload["jti"]))
    if row is None:
        raise DomainError("Invalid refresh token", 401)
    if row.used:
        raise DomainError("Refresh token already used", 401)
    if row.expires_at < utcnow():
        raise DomainError("Refresh token expired", 401)
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise DomainError("User not found", 401)
    if user.is_blocked:
        raise DomainError("Account blocked", 403)
    row.used = True
    db.commit()
    tokens = _issue_tokens(db, user)
    return RefreshOut(
        access_token=tokens["access_token"], refresh_token=tokens["refresh_token"]
    )


@router.post("/auth/logout", response_model=DetailOut)
def logout(body: LogoutIn, db=Depends(get_db)):
    try:
        payload = decode_token(body.refresh, "refresh")
    except DomainError:
        return DetailOut(detail="Logged out")
    row = db.scalar(select(RefreshToken).where(RefreshToken.jti == payload["jti"]))
    if row is not None and not row.used:
        row.used = True
        db.commit()
    return DetailOut(detail="Logged out")


@router.get("/auth/me", response_model=UserOut)
def auth_me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.post("/auth/forgot-password", response_model=ForgotOut)
def forgot_password(body: ForgotIn, db=Depends(get_db)):
    identifier = body.identifier.strip()
    user = db.scalar(
        select(User).where(or_(User.phone == identifier, User.email == identifier))
    )
    if user is None:
        raise DomainError("User not found", 404)
    token = secrets.token_hex(24)
    user.reset_token = token
    user.reset_token_expires = utcnow() + timedelta(minutes=30)
    db.commit()
    dev_token = None
    if not settings.telegram_enabled:
        dev_token = token
    else:
        try:
            send_text(
                f"Bekat Uz parolni tiklash tokeni: {token}",
                telegram_id=user.telegram_id,
            )
        except Exception:
            dev_token = token
    return ForgotOut(message="Parolni tiklash tokeni yuborildi", dev_token=dev_token)


@router.post("/auth/reset-password", response_model=DetailOut)
def reset_password(body: ResetIn, db=Depends(get_db)):
    user = db.scalar(select(User).where(User.reset_token == body.token))
    if user is None:
        raise DomainError("Invalid token", 400)
    if user.reset_token_expires is None or user.reset_token_expires < utcnow():
        raise DomainError("Token expired", 400)
    user.password_hash = hash_password(body.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return DetailOut(detail="Password has been reset")
