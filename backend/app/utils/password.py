from bcrypt import hashpw, checkpw, gensalt


def hash_password(password: str) -> str:
    hashed_password = hashpw(password.encode("utf-8"), gensalt())
    return hashed_password.decode("utf-8")


def verify_password(password: str, hashed_pw: str | bytes) -> bool:
    if isinstance(hashed_pw, str):
        hashed_pw = hashed_pw.encode("utf-8")
    return checkpw(password.encode("utf-8"), hashed_pw)
