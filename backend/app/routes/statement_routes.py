from fastapi import APIRouter, UploadFile, File, HTTPException, Header
import jwt
import os
from fastapi.responses import JSONResponse
from typing import List

from app.services.statement_service import analyze_statement_files
from app.db.database import save_statement_analysis

router = APIRouter(prefix="/statements", tags=["Statements"])


@router.post("/upload")
async def upload_statement(files: List[UploadFile] = File(...), authorization: str | None = Header(default=None)):
    """Accept multiple statement files, analyze them with OCR/Gemini, save the result, and return it."""
    try:
        analysis = await analyze_statement_files(files)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    user_key = "anonymous"
    if authorization:
        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(token, os.getenv("Secret_key", "finsight-dev-secret"), algorithms=[os.getenv("algorithm", "HS256")])
            user_key = str(payload.get("email") or payload.get("id") or payload.get("sub") or "anonymous")
        except Exception:
            user_key = "anonymous"

    stored = save_statement_analysis(user_key, analysis)
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
async def save_analysis(payload: dict, authorization: str | None = Header(default=None)):
    """Save a previously generated analysis payload under the requesting user key."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    user_key = "anonymous"
    if authorization:
        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload_decoded = jwt.decode(token, os.getenv("Secret_key", "finsight-dev-secret"), algorithms=[os.getenv("algorithm", "HS256")])
            user_key = str(payload_decoded.get("email") or payload_decoded.get("id") or payload_decoded.get("sub") or "anonymous")
        except Exception:
            user_key = "anonymous"

    stored = save_statement_analysis(user_key, payload)
    stored.pop("_id", None)
    return JSONResponse(content=stored)