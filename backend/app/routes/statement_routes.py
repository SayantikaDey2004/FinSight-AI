from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import os
from fastapi.responses import JSONResponse
from typing import List

from app.services.statement_service import analyze_statement_files
from app.db.database import get_data, save_statement_analysis

router = APIRouter(prefix="/statements", tags=["Statements"])
auth_scheme = HTTPBearer(auto_error=False)


def _require_user_id(credentials: HTTPAuthorizationCredentials | None) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, os.getenv("Secret_key", "finsight-dev-secret"), algorithms=[os.getenv("algorithm", "HS256")])
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from error

    user_id = payload.get("sub") or payload.get("id")
    if user_id:
        return str(user_id)

    email = payload.get("email")
    if email:
        user = get_data(str(email))
        if user and user.get("_id"):
            return str(user["_id"])

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


@router.post("/upload")
async def upload_statement(files: List[UploadFile] = File(...), credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    """Accept multiple statement files, analyze them with OCR/Gemini, save the result, and return it."""
    try:
        analysis = await analyze_statement_files(files)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    user_id = _require_user_id(credentials)
    print(f"[routes] upload_statement: saving analysis for user_id={user_id} transactions={len(analysis.get('transactions',[]) or [])}")
    stored = save_statement_analysis(user_id, analysis)
    stored.pop("_id", None)
    return JSONResponse(content=stored)


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """Analyze a single uploaded file immediately and return the analysis (no storage)."""
    file_bytes = await file.read()
    try:
        result = analyze_statement_files([file])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    return JSONResponse(content=await result)


@router.post("/save")
async def save_analysis(payload: dict, credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    """Save a previously generated analysis payload under the requesting user key."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    user_id = _require_user_id(credentials)
    stored = save_statement_analysis(user_id, payload)
    stored.pop("_id", None)
    return JSONResponse(content=stored)