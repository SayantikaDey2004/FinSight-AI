from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt import verify_access_token
from app.models.user import User

# This tells FastAPI to look for "Authorization: Bearer <token>" in request headers
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """
    Dependency — inject this into any route that needs authentication.

    Usage in a route:
        @router.get("/profile")
        async def profile(current_user: User = Depends(get_current_user)):
            ...

    What it does:
    1. Extracts the Bearer token from the Authorization header
    2. Verifies the JWT signature and expiry
    3. Looks up the user in MongoDB
    4. Returns the User object (or raises 401 if anything fails)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Step 1: Verify the token
    token = credentials.credentials
    user_id = verify_access_token(token)

    if not user_id:
        raise credentials_exception

    # Step 2: Check user still exists in DB
    user = await User.get(user_id)
    if not user:
        raise credentials_exception

    # Step 3: Check user is not banned
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact support.",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Alias — same as get_current_user but makes intent explicit in route signatures."""
    return current_user
