

from bcrypt import hashpw, checkpw, gensalt


def hash_password(password: str) -> str:
    new_hashed_password = hashpw(password.encode("UTF-8"), gensalt(12))
    return new_hashed_password.decode("UTF-8")


def verify_password(password: str, hashed_pw: str | bytes) -> bool:
    if isinstance(hashed_pw, str):
        hashed_pw = hashed_pw.encode("UTF-8")
    return checkpw(password.encode("UTF-8"), hashed_pw)
>>>>>>> 0299964cb20c1b94e3f76a9de0ceebfb0be04994

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)