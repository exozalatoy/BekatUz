from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.schemas.user import UserOut


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\+998\d{9}$")
    password: str = Field(min_length=6, max_length=128)
    password_confirm: str = Field(min_length=6, max_length=128)
    role: Literal["passenger", "driver"] = "passenger"
    email: EmailStr | None = None
    vehicle_category: (
        Literal["Avtobus", "Mikroavtobus", "Gazel", "Yengil avto"] | None
    ) = None
    telegram_id: str | None = None

    @model_validator(mode="after")
    def _passwords_match(self) -> "RegisterIn":
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self


class RegisterOut(BaseModel):
    user_id: int
    phone: str
    message: str
    dev_code: str | None = None


class VerifyCodeIn(BaseModel):
    phone: str = Field(pattern=r"^\+998\d{9}$")
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendCodeIn(BaseModel):
    phone: str = Field(pattern=r"^\+998\d{9}$")


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VerifyOut(TokenPair):
    user: UserOut


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3)
    password: str = Field(min_length=1)
    remember: bool = False


class LoginOut(TokenPair):
    user: UserOut


class RefreshIn(BaseModel):
    refresh: str


class RefreshOut(BaseModel):
    access_token: str
    refresh_token: str | None = None


class LogoutIn(BaseModel):
    refresh: str


class ForgotIn(BaseModel):
    identifier: str


class ForgotOut(BaseModel):
    message: str
    dev_token: str | None = None


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)


class UserUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    language: Literal["uz", "ru", "en"] | None = None
    notifications_enabled: bool | None = None
    dark_mode: bool | None = None
    avatar_url: str | None = None


class Timestamped(BaseModel):
    model_config = ConfigDict(from_attributes=True)
