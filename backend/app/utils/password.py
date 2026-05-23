from passlib.context import CryptContext

# bcrypt is the gold standard for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hashes a plain-text password. Call this on signup."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if a plain-text password matches the stored hash. Call this on login."""
    return pwd_context.verify(plain_password, hashed_password)
