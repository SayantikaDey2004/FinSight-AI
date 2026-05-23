from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.config.settings import settings


def create_access_token(user_id: str) -> str:
    """
    Creates a short-lived JWT (15 min by default).
    This is sent with every API request in the Authorization header.
    """
    payload = {
        "sub": user_id,                # subject = user's MongoDB _id
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),      # issued at
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """
    Creates a long-lived JWT (7 days by default).
    Used ONLY to get a new access token when the old one expires.
    """
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.effective_refresh_secret, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> Optional[str]:
    """
    Decodes and validates an access token.
    Returns the user_id (str) if valid, raises an error if not.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[str]:
    """
    Decodes and validates a refresh token.
    Returns the user_id if valid.
    """
    try:
        payload = jwt.decode(token, settings.effective_refresh_secret, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload.get("sub")
    except JWTError:
        return None
