from fastapi import APIRouter, UploadFile, File, HTTPException, Header, BackgroundTasks
import jwt
import os
from fastapi.responses import JSONResponse
from typing import List

from app.services.statement_service import analyze_statement_files
from app.db.database import save_statement_analysis

router = APIRouter(prefix="/statements", tags=["Statements"])


@router.post("/upload")
async def upload_statement(background: BackgroundTasks, files: List[UploadFile] = File(...), authorization: str | None = Header(default=None)):
    """Accept multiple statement files, save a quick placeholder result and schedule background analysis."""
    # Read files into memory (small files expected) and build metadata
    uploaded_meta = []
    raw_files = []
    for f in files:
        b = await f.read()
        uploaded_meta.append({"name": f.filename or "file", "size": len(b), "type": f.content_type})
        raw_files.append({"filename": f.filename or "file", "bytes": b, "content_type": f.content_type})

    # Determine storage key from authorization header (if present) - decode token to email like main app
    user_key = "anonymous"
    if authorization:
        token = authorization.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(token, os.getenv("Secret_key", "finsight-dev-secret"), algorithms=[os.getenv("algorithm", "HS256")])
            user_key = str(payload.get("email") or payload.get("id") or payload.get("sub") or "anonymous")
        except Exception:
            user_key = "anonymous"

    # Save a quick placeholder so frontend sees immediate success
    placeholder = {
        "uploaded_at": __import__("datetime").datetime.utcnow().isoformat(),
        "files": uploaded_meta,
        "summary": {"total_income": 0, "total_expense": 0, "net_savings": 0, "savings_rate": 0, "top_spending_category": "N/A", "transaction_count": 0, "category_breakdown": {}},
        "transactions": [],
        "recurring": [],
        "unusual": [],
        "ai_summary": {},
        "monthly_trend": [],
    }
    stored = save_statement_analysis(user_key, placeholder)
    stored.pop("_id", None)

    # Schedule background analysis to update the saved record when done
    def _bg_analyze_and_save(user_key: str, raw_files: list):
        try:
            # call service analyzer that accepts raw bytes
            from app.services.statement_service import analyze_statement_from_bytes
            result = analyze_statement_from_bytes(raw_files)
            save_statement_analysis(user_key, result)
        except Exception as e:
            print(f"[statement_routes] Background analysis failed: {e}")

    background.add_task(_bg_analyze_and_save, user_key, raw_files)

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