from fastapi import APIRouter, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.schemas import (
    SignupRequest, LoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    RefreshTokenRequest, TokenResponse, UserResponse, MessageResponse,
)
from app.models.user import User
from app.middleware.auth_middleware import get_current_user
from app.controllers import auth_controller

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


# ── Public Routes (no token needed) ─────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(data: SignupRequest):
    """
    Register a new user.
    Returns access_token + refresh_token + user profile.
    """
    return await auth_controller.signup(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """
    Log in with email and password.
    Returns access_token + refresh_token + user profile.
    """
    return await auth_controller.login(data)


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest):
    """
    Exchange a valid refresh_token for a new access_token + refresh_token pair.
    Call this when you get a 401 from any protected route.
    """
    return await auth_controller.refresh_token(data)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(data: ForgotPasswordRequest):
    """
    Send a password reset email.
    Always returns success (prevents email enumeration).
    """
    return await auth_controller.forgot_password(data)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest):
    """
    Set a new password using the token from the reset email.
    Token expires after 15 minutes.
    """
    return await auth_controller.reset_password(data)


# ── Protected Routes (Bearer token required) ─────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently logged-in user's profile.
    Frontend uses this to restore session on page refresh.
    """
    return await auth_controller.get_me(current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Log out — invalidates the refresh token server-side.
    Frontend should also delete tokens from localStorage/cookies.
    """
    return await auth_controller.logout(current_user)
