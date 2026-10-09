import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error

from app.core.config import settings
from app.core.errors import DomainError

_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    if not password_hash:
        return False
    try:
        return _password_hasher.verify(password_hash, password)
    except Exception:
        return False


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    return _create_token_with_jti(
        subject, token_type, expires_delta, uuid.uuid4().hex
    )


def _create_token_with_jti(
    subject: str, token_type: str, expires_delta: timedelta, jti: str
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": jti,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int) -> str:
    return _create_token(
        str(user_id),
        "access",
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: int) -> tuple[str, str]:
    jti = uuid.uuid4().hex
    token = _create_token_with_jti(
        str(user_id),
        "refresh",
        timedelta(days=settings.refresh_token_expire_days),
        jti,
    )
    return token, jti


def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise DomainError("Token expired", 401)
    except jwt.InvalidTokenError:
        raise DomainError("Invalid token", 401)
    if payload.get("type") != expected_type:
        raise DomainError("Invalid token type", 401)
    if not payload.get("sub"):
        raise DomainError("Invalid token", 401)
    return payload
