from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime


class User(Document):
    """
    This is the MongoDB collection schema.
    Beanie maps this class → 'users' collection automatically.
    """

    # Core fields
    name: str
    email: EmailStr
    hashed_password: str

    # Status flags
    is_active: bool = True          # False = banned/deactivated
    is_verified: bool = False       # True after email verification (optional feature)

    # Password reset (stored temporarily)
    reset_token: Optional[str] = None
    reset_token_expires: Optional[datetime] = None

    # Refresh token (for logout/invalidation)
    refresh_token: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"              # MongoDB collection name
        indexes = [
            "email",                # Fast lookups by email
        ]

    class Config:
        # Don't expose hashed_password or tokens in JSON responses
        json_schema_extra = {
            "example": {
                "name": "Rahul Sharma",
                "email": "rahul@example.com",
            }
        }