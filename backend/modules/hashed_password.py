from bcrypt import hashpw,checkpw,gensalt

def create_hashed_password(data:str)->bytes:
    new_password=hashpw(data.encode("Utf-8"),gensalt(16))
    return new_password

def check_password(plain_password: str, hashed_password: str) -> bool:
    return checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
