from fastapi import FastAPI, Request, Depends
from fastapi.security import OAuth2PasswordBearer
from app.models.pydantic_models import LoginRequest, SignupRequest, ResetPasswordRequest, ForgotPasswordRequest
from app.db.database import insert_data, update_password, delete_data, get_data
from modules.hashed_password import create_hashed_password,check_password
from modules.token import create_token, decode_token

app = FastAPI()

outh = OAuth2PasswordBearer(tokenUrl="/token")

@app.get("/")
def home(request: Request):
    return {"message": "success"}

@app.post("/token")
def new_token(data: dict):
    try:
        token = create_token(data)
    except Exception as e:
        return {"error": str(e)}
    else:
        return {"access_token": token, "token_type": "bearer"}

@app.post("/signup")
async def new_user(data: SignupRequest):
    hash_pw = create_hashed_password(data.password)
    data.password = hash_pw.decode("UTF-8")
    try:
        d = insert_data(data.dict())
    except Exception as e:
        return {"Error": f"Signup failed: {str(e)}"}
    else:
        token = create_token({"email": data.email})
        return {"new_user": d, "token": token}

@app.post("/login")
async def user_login(data:LoginRequest):
    k=get_data(data.email)
    if not k:
        return {"login":False}
    else:
        if(check_password(data.password,k.get("password"))):
            token=create_token(data.dict())
            return {"login":True,"token":token,"name":k.get("name"),"email":k.get("email")}
        else:
            return {"login":False,"error":"password didnt match"}

@app.post("/update_password")
def update_pass(data: LoginRequest,token=Depends(outh)):
    try:
        d = update_password(data.email, create_hashed_password(data.password))
    except Exception as e:
        return {"response": str(e)}
    else:
        return {"password": d}

@app.post("/delete_user")
def delete_user(email:str,token=Depends(outh)):
    try:
        d = delete_data(email)
    except Exception as e:
        return {"response": str(e)}
    else:
        return {"delete": d}

@app.post("/logout")
def user_logout(request: Request, token=Depends(outh)):
    token=""
    # In stateless JWT, logout is client-side (just discard token).
    return {"logout": "successful"}

@app.get("/profile")
async def get_profile(request:Request,token=Depends(outh)):
    try:
        data=decode_token(token)
    except Exception as e:
        return {"error":e}
    else:
        return {"user_data":data}
