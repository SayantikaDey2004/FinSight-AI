from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.database import get_data
import jwt, os


AUTH_SCHEME = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(AUTH_SCHEME)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, os.getenv("Secret_key", "finsight-dev-secret"), algorithms=[os.getenv("algorithm", "HS256")])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = str(payload.get("email"))
    user = get_data(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user.get("_id", "")),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "is_active": bool(user.get("is_active", True)),
        "is_verified": bool(user.get("is_verified", False)),
        "created_at": user.get("created_at", ""),
    }
# from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.services.statement_service import analyze_statement                   

router = APIRouter(prefix="/statements", tags=["Statements"])

@router.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a statement for the logged-in user.

    This returns the same analysis payload as /analyze but requires auth.
    """
    file_bytes = await file.read()

    try:
        result = await analyze_statement(file_bytes, file.filename, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    return JSONResponse(content=result)

@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Upload a bank statement (PDF or CSV) and receive full financial analysis.
 
    Returns:
    - summary         : income, expense, savings, category breakdown
    - transactions    : all parsed and categorized rows
    - recurring       : detected recurring payments
    - unusual         : statistical outlier transactions
    - ai_summary      : Claude-generated insights, score, recommendations
    - monthly_trend   : month-wise income vs expense
    """
    file_bytes = await file.read()
 
    try:
        result = analyze_statement(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
 
    return JSONResponse(content=result)