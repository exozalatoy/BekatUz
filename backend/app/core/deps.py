from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db
from app.core.errors import DomainError
from app.core.security import decode_token
from app.models import User

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db=Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise DomainError("Not authenticated", 401)
    payload = decode_token(credentials.credentials, "access")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise DomainError("User not found", 401)
    if user.is_blocked:
        raise DomainError("Account blocked", 403)
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db=Depends(get_db),
) -> User | None:
    if credentials is None or not credentials.credentials:
        return None
    payload = decode_token(credentials.credentials, "access")
    user = db.get(User, int(payload["sub"]))
    if user is None or user.is_blocked:
        return None
    return user


def require_role(*roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise DomainError("Forbidden", 403)
        return user

    return dependency


def get_user_from_token(db, token: str) -> User:
    payload = decode_token(token, "access")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise DomainError("User not found", 401)
    if user.is_blocked:
        raise DomainError("Account blocked", 403)
    return user


require_admin = require_role("admin")
require_driver = require_role("driver")
