
from bcrypt import hashpw, checkpw, gensalt


def hash_password(password: str) -> str:
    new_hashed_password = hashpw(password.encode("UTF-8"), gensalt(12))
    return new_hashed_password.decode("UTF-8")


def verify_password(password: str, hashed_pw: str | bytes) -> bool:
    if isinstance(hashed_pw, str):
        hashed_pw = hashed_pw.encode("UTF-8")
    return checkpw(password.encode("UTF-8"), hashed_pw)

