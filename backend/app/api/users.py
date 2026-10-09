from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import DomainError
from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.auth import PasswordChangeIn, UserUpdateIn
from app.schemas.common import DetailOut
from app.schemas.user import UserOut, user_out

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/users/me", response_model=UserOut)
def update_me(
    body: UserUpdateIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    if "email" in data and data["email"] is not None:
        other = db.scalar(
            select(User).where(User.email == data["email"], User.id != user.id)
        )
        if other is not None:
            raise DomainError("Email already in use", 409)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    return user_out(user)


@router.put("/users/me/password", response_model=DetailOut)
def change_password(
    body: PasswordChangeIn,
    user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if not verify_password(user.password_hash, body.old_password):
        raise DomainError("Old password is incorrect", 400)
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return DetailOut(detail="Password updated")
