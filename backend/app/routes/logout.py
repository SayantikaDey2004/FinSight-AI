from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import jwt
import os

# ─── Config ───────────────────────────────────────────────────────────────────
MONGO_URI   = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME     = os.getenv("MONGO_DB_NAME", "finsight")
JWT_SECRET  = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGO    = "HS256"

# ─── DB Client ────────────────────────────────────────────────────────────────
mongo_client = AsyncIOMotorClient(MONGO_URI)
db           = mongo_client[DB_NAME]
users_col    = db["users"]
tokens_col   = db["revoked_tokens"]   # blacklist for logout

# ─── Auth ─────────────────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials

    # Check if token has been revoked (logged out)
    revoked = await tokens_col.find_one({"token": token})
    if revoked:
        raise HTTPException(status_code=401, detail="Token has been revoked. Please log in again.")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload is missing user ID.")

    user = await users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return user


def serialize_user(user: dict) -> dict:
    """Strip sensitive fields and convert ObjectId to string."""
    return {
        "id":         str(user["_id"]),
        "name":       user.get("name", ""),
        "email":      user.get("email", ""),
        "created_at": user.get("created_at", "").isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at", ""),
        "avatar_url": user.get("avatar_url", ""),
        "plan":       user.get("plan", "free"),
    }


# ─── Router ───────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me")
async def get_user_details(current_user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's profile from MongoDB.
    Requires: Authorization: Bearer <token>
    """
    return {"user": serialize_user(current_user)}


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    Blacklists the current JWT so it cannot be reused.
    Requires: Authorization: Bearer <token>
    """
    token = credentials.credentials

    # Decode without verifying expiry so we can store TTL
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO], options={"verify_exp": False})
        exp = payload.get("exp")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    already_revoked = await tokens_col.find_one({"token": token})
    if already_revoked:
        return {"message": "Already logged out."}

    await tokens_col.insert_one({
        "token":      token,
        "revoked_at": datetime.now(timezone.utc),
        # MongoDB TTL index on this field auto-deletes expired tokens from blacklist
        "expires_at": datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None,
    })

    return {"message": "Logged out successfully."}