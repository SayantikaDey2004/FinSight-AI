import secrets
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from beanie.operators import Set

from app.models.user import User
from app.models.schemas import (
    SignupRequest, LoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    RefreshTokenRequest, TokenResponse, UserResponse, MessageResponse,
)
from app.utils.password import hash_password, verify_password
from app.utils.jwt import (
    create_access_token, create_refresh_token, verify_refresh_token,
)
from app.utils.email import send_password_reset_email, send_welcome_email
from app.config.settings import settings


def _user_to_response(user: User) -> UserResponse:
    """Helper: converts a User DB object → safe UserResponse (no password/tokens)."""
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


# ── SIGNUP ───────────────────────────────────────────────────────────────────

async def signup(data: SignupRequest) -> TokenResponse:
    # 1. Check if email already registered
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # 2. Hash the password (NEVER store plain text)
    hashed = hash_password(data.password)

    # 3. Create tokens
    # We need the user id first — save user, then generate tokens
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hashed,
    )
    await user.insert()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    # 4. Store refresh token in DB (so we can invalidate it on logout)
    await user.update(Set({User.refresh_token: refresh_token}))

    # 5. Send welcome email (non-blocking — don't fail signup if email fails)
    try:
        await send_welcome_email(user.email, user.name)
    except Exception:
        pass  # Email failure should NOT break signup in a hackathon

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_response(user),
    )


# ── LOGIN ────────────────────────────────────────────────────────────────────

async def login(data: LoginRequest) -> TokenResponse:
    # 1. Find user by email
    user = await User.find_one(User.email == data.email)

    # 2. Verify password
    # NOTE: We check both conditions before raising — avoids user enumeration attacks
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # 3. Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated.",
        )

    # 4. Generate fresh tokens
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    # 5. Update refresh token and last-login timestamp in DB
    await user.update(Set({
        User.refresh_token: refresh_token,
        User.updated_at: datetime.utcnow(),
    }))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_response(user),
    )


# ── LOGOUT ───────────────────────────────────────────────────────────────────

async def logout(current_user: User) -> MessageResponse:
    """
    Invalidates the refresh token stored in DB.
    The access token will naturally expire (15 min).
    Frontend should delete both tokens from its storage.
    """
    await current_user.update(Set({User.refresh_token: None}))
    return MessageResponse(message="Logged out successfully.")


# ── REFRESH TOKEN ─────────────────────────────────────────────────────────────

async def refresh_token(data: RefreshTokenRequest) -> TokenResponse:
    # 1. Verify the refresh token's JWT signature
    user_id = verify_refresh_token(data.refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please log in again.",
        )

    # 2. Check token matches what's stored in DB (rotation security)
    user = await User.get(user_id)
    if not user or user.refresh_token != data.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked. Please log in again.",
        )

    # 3. Issue brand-new tokens (rotation — old refresh token is replaced)
    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))

    await user.update(Set({User.refresh_token: new_refresh_token}))

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=_user_to_response(user),
    )


# ── FORGOT PASSWORD ───────────────────────────────────────────────────────────

async def forgot_password(data: ForgotPasswordRequest) -> MessageResponse:
    user = await User.find_one(User.email == data.email)

    # IMPORTANT: Always return the same message whether or not the email exists.
    # This prevents attackers from knowing which emails are registered.
    generic_msg = MessageResponse(
        message="If this email is registered, you'll receive a reset link shortly."
    )

    if not user:
        return generic_msg  # Pretend success — don't reveal email existence

    # Generate a secure random token (not JWT — simpler for reset flow)
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

    await user.update(Set({
        User.reset_token: reset_token,
        User.reset_token_expires: expires,
    }))

    try:
        await send_password_reset_email(user.email, user.name, reset_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email. Please try again.",
        )

    return generic_msg


# ── RESET PASSWORD ────────────────────────────────────────────────────────────

async def reset_password(data: ResetPasswordRequest) -> MessageResponse:
    # Find user by the reset token
    user = await User.find_one(User.reset_token == data.token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    # Check token hasn't expired
    if not user.reset_token_expires or datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one.",
        )

    # Hash new password and clear the reset token
    await user.update(Set({
        User.hashed_password: hash_password(data.new_password),
        User.reset_token: None,          # Token used — delete it
        User.reset_token_expires: None,
        User.refresh_token: None,        # Force re-login on all devices
        User.updated_at: datetime.utcnow(),
    }))

    return MessageResponse(message="Password reset successfully. Please log in with your new password.")


# ── GET CURRENT USER (ME) ─────────────────────────────────────────────────────

async def get_me(current_user: User) -> UserResponse:
    """Returns the logged-in user's profile. Used by frontend to restore session."""
    return _user_to_response(current_user)