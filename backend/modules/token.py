from jwt import encode,decode
from dotenv import load_dotenv
import datetime
import os
load_dotenv()
def create_token(data:dict)->str:
    user=data.copy()
    user["iat"]=datetime.datetime.utcnow()
    user["exp"]=datetime.datetime.utcnow()+datetime.timedelta(minutes=20)
    token=encode(user,os.getenv("Secret_key"),algorithm=os.getenv("algorithm"))
    return token

def decode_token(token:str)->dict | None:
    try:
        data=decode(token,os.getenv("Secret_key"),algorithms=[os.getenv("algorithm")])
    except Exception:
        return None
    else:
        return data