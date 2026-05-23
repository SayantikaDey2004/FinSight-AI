
from bcrypt import hashpw,checkpw,gensalt

def hash_password(password:str)->bytes:
    new_hasshed_password=hashpw(password.encode("UTF-8"),gensalt(20))
    return new_hasshed_password
def verify_password(password:str,hashed_pw:bytes)->bool:
    return checkpw(password.encode("UTF-8"),hashed_pw)

