from __future__ import annotations

import datetime as dt
import os
import json
from typing import Any

import jwt
from bson import ObjectId
from fastapi import Depends, FastAPI, File, HTTPException, Header, UploadFile, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from pathlib import Path

# Load environment from backend/.env (kept out of VCS)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.db.database import (
    collection,
    delete_data,
    get_data,
    get_latest_statement_analysis,
    insert_data,
    save_statement_analysis,
    update_password,
)
from app.models.pydantic_models import ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, SignupRequest
from app.services.statement_service import analyze_statement_files, analyze_statement_from_bytes
from app.routes.statement_routes import router as statement_router
from modules.hashed_password import check_password, create_hashed_password



app = FastAPI(title="FinSightAI API")


@app.get("/api/v1/admin/gemini_key")
async def admin_gemini_key():
    """Returns whether a Gemini API key is configured on the backend (masked)."""
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY")
    if not key:
        return {"present": False, "masked": None}
    k = str(key).strip()
    masked = "*" * max(0, len(k) - 4) + k[-4:]
    return {"present": True, "masked": masked}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_scheme = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("Secret_key", "finsight-dev-secret")
JWT_ALGORITHM = os.getenv("algorithm", "HS256")


def _create_token(payload: dict[str, Any], expires_minutes: int) -> str:
    token_payload = payload.copy()
    token_payload["iat"] = dt.datetime.utcnow()
    token_payload["exp"] = dt.datetime.utcnow() + dt.timedelta(minutes=expires_minutes)
    return jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def _normalize_user(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document.get("_id", document.get("id", document.get("email", "")))),
        "name": document.get("name", ""),
        "email": document.get("email", ""),
        "is_active": bool(document.get("is_active", True)),
        "is_verified": bool(document.get("is_verified", False)),
        "created_at": document.get("created_at", dt.datetime.utcnow().isoformat()),
    }


def _get_user_by_email(email: str) -> dict[str, Any] | None:
    return collection.find_one({"email": email})


def _auth_payload(user: dict[str, Any]) -> dict[str, Any]:
    access_token = _create_token({"email": user["email"], "purpose": "access"}, 20)
    refresh_token = _create_token({"email": user["email"], "purpose": "refresh"}, 60 * 24 * 7)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _normalize_user(user),
    }


def _require_bearer(credentials: HTTPAuthorizationCredentials | None) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = _decode_token(credentials.credentials)
    if not payload or not payload.get("email"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return str(payload["email"])

@app.get("/")
def home():
    return {"message": "success"}

@app.get("/api/v1/dashboard/summary")
async def get_dashboard_summary(authorization: str | None = Header(default=None)):
    user_key = _statement_user_key(authorization)
    stored = get_latest_statement_analysis(user_key)
    if not stored:
        stored = get_latest_statement_analysis("anonymous")

    if not stored:
        # Return empty dashboard instead of 404
        return {
            "healthScore": 0, "totalIncome": 0, "totalExpense": 0,
            "currentBalance": 0, "savings": 0, "incomeChangePct": 0,
            "expenseChangePct": 0, "savingsPct": 0, "transactionCount": 0,
            "monthlyData": [], "categories": [], "recurring": [],
            "unusual": [], "aiInsights": [], "txList": []
        }

    summary = stored.get("summary", {})
    cat_colors = ["#22c55e","#0ea5e9","#f97316","#8b5cf6","#ec4899","#f59e0b","#14b8a6"]
    categories = [
        {"name": cat, "amount": amt,
         "pct": round(amt / max(summary.get("total_expense",1),1) * 100),
         "color": cat_colors[i % len(cat_colors)]}
        for i, (cat, amt) in enumerate(summary.get("category_breakdown", {}).items())
    ]
    recurring = [
        {"name": r["name"], "date": "monthly", "amount": r["avg_amount"],
         "status": "active", "icon": "🔄", "color": "#0ea5e9"}
        for r in stored.get("recurring", [])
    ]
    unusual = [
        {"name": u["merchant"], "reason": f"Flagged: ₹{abs(u['amount']):,.0f}",
         "amount": abs(u["amount"]), "icon": "⚠️"}
        for u in stored.get("unusual", [])
    ]
    ai = stored.get("ai_summary", {})
    ai_insights = [
        {"icon": "🧠", "title": "Overview", "text": ai.get("overview","")},
        *[{"icon": "📌", "title": "Observation", "text": obs} for obs in ai.get("observations",[])],
        *[{"icon": "💡", "title": "Recommendation", "text": rec} for rec in ai.get("recommendations",[])]
    ]
    txList = [
        {"date": t["date"], "name": t["merchant"], "bank": "Statement",
         "cat": t["category"], "catColor": "#0ea5e9", "icon": "💳",
         "iconBg": "#1e3a5f", "amount": t["amount"],
         "status": "flagged" if t.get("unusual") else "completed"}
        for t in stored.get("transactions", [])[:20]
    ]
    net = summary.get("net_savings", 0)
    return {
        "healthScore": ai.get("health_score", 0),
        "totalIncome": summary.get("total_income", 0),
        "totalExpense": summary.get("total_expense", 0),
        "currentBalance": net,
        "savings": net,
        "incomeChangePct": 0,
        "expenseChangePct": 0,
        "savingsPct": summary.get("savings_rate", 0),
        "transactionCount": summary.get("transaction_count", 0),
        "monthlyData": stored.get("monthly_trend", []),
        "categories": categories,
        "recurring": recurring,
        "unusual": unusual,
        "aiInsights": ai_insights,
        "txList": txList,
    }
@app.post("/api/v1/auth/signup")
async def signup(data: SignupRequest):
    if _get_user_by_email(data.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists with this email.")

    hashed_password = create_hashed_password(data.password).decode("utf-8")
    user_document = {
        "name": data.name,
        "email": data.email,
        "password": hashed_password,
        "is_active": True,
        "is_verified": False,
        "created_at": dt.datetime.utcnow().isoformat(),
    }

    inserted = collection.insert_one(user_document)
    user_document["_id"] = inserted.inserted_id or ObjectId()

    return _auth_payload(user_document)

@app.post("/api/v1/auth/login")
async def login(data: LoginRequest):
    user = _get_user_by_email(data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not check_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return _auth_payload(user)


@app.post("/api/v1/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = _get_user_by_email(data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for that email.")

    reset_token = _create_token({"email": data.email, "purpose": "reset_password"}, 30)
    reset_url = f"http://localhost:5173/reset-password?token={reset_token}"

    collection.update_one(
        {"email": data.email},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires_at": (dt.datetime.utcnow() + dt.timedelta(minutes=30)).isoformat(),
            }
        },
    )

    return {
        "message": "Password reset instructions are ready.",
        "success": True,
        "reset_token": reset_token,
        "reset_url": reset_url,
    }


@app.post("/api/v1/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    payload = _decode_token(data.token)
    if not payload or payload.get("purpose") != "reset_password" or not payload.get("email"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user = _get_user_by_email(str(payload["email"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for that token")

    new_hashed_password = create_hashed_password(data.new_password).decode("utf-8")
    collection.update_one(
        {"email": user["email"]},
        {
            "$set": {"password": new_hashed_password},
            "$unset": {"reset_token": "", "reset_token_expires_at": ""},
        },
    )

    return {"message": "Password updated successfully.", "success": True}


@app.get("/api/v1/auth/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    email = _require_bearer(credentials)
    user = _get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return _normalize_user(user)


@app.patch("/api/v1/auth/me")
async def update_current_user(payload: dict[str, str], credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    email = _require_bearer(credentials)
    user = _get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_name = payload.get("name", user.get("name", "")).strip()
    new_email = payload.get("email", user.get("email", "")).strip().lower()

    if new_email != email and _get_user_by_email(new_email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with that email already exists.")

    collection.update_one(
        {"email": email},
        {"$set": {"name": new_name, "email": new_email}},
    )

    updated = _get_user_by_email(new_email)
    if not updated:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to update profile")

    return _normalize_user(updated)


@app.post("/api/v1/auth/logout")
async def logout():
    return {"message": "Logged out successfully.", "success": True}


@app.get("/api/v1/dashboard/summary")
async def dashboard_summary(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    email = _require_bearer(credentials)
    user = _get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    display_name = user.get("name", "FinSight user")
    return {
        "healthScore": 742,
        "totalIncome": 185000,
        "totalExpense": 132400,
        "currentBalance": 52600,
        "savings": 52600,
        "incomeChangePct": 12,
        "expenseChangePct": -4,
        "savingsPct": 28,
        "transactionCount": 42,
        "monthlyData": [
            {"month": "Jan", "income": 120000, "expense": 86000},
            {"month": "Feb", "income": 128000, "expense": 91000},
            {"month": "Mar", "income": 141000, "expense": 94000},
            {"month": "Apr", "income": 156000, "expense": 100500},
            {"month": "May", "income": 172000, "expense": 121000},
            {"month": "Jun", "income": 185000, "expense": 132400},
        ],
        "categories": [
            {"name": "Housing", "amount": 42000, "pct": 32, "color": "#38bdf8"},
            {"name": "Food", "amount": 23000, "pct": 17, "color": "#22c55e"},
            {"name": "Transport", "amount": 18000, "pct": 14, "color": "#f59e0b"},
            {"name": "Lifestyle", "amount": 49500, "pct": 37, "color": "#a78bfa"},
        ],
        "recurring": [
            {"name": "Rent", "date": "5 Jun", "amount": 26000, "status": "active", "icon": "🏠", "color": "#38bdf8"},
            {"name": "Streaming", "date": "12 Jun", "amount": 1499, "status": "due", "icon": "🎬", "color": "#a78bfa"},
        ],
        "unusual": [
            {"name": "Weekend transfer", "reason": "Marked unusual because it is 3x above your typical debit amount.", "amount": 24500, "icon": "⚠️"},
        ],
        "aiInsights": [
            {"icon": "📈", "title": "Income growth", "text": f"Your income trend is up and {display_name} is keeping a healthy buffer each month."},
            {"icon": "🧠", "title": "Spending pattern", "text": "Lifestyle spending is the largest discretionary bucket. A small cap here would raise savings quickly."},
        ],
        "txList": [
            {"date": "2026-05-19", "name": "Salary Credit", "bank": "HDFC", "cat": "Income", "catColor": "#22c55e", "icon": "⬆️", "iconBg": "#22c55e", "amount": 125000, "status": "completed"},
            {"date": "2026-05-18", "name": "Grocery Mart", "bank": "SBI", "cat": "Food", "catColor": "#f59e0b", "icon": "🛒", "iconBg": "#f59e0b", "amount": -8400, "status": "completed"},
            {"date": "2026-05-17", "name": "Ride Share", "bank": "ICICI", "cat": "Transport", "catColor": "#38bdf8", "icon": "🚕", "iconBg": "#38bdf8", "amount": -1250, "status": "pending"},
        ],
    }


def _statement_user_key(authorization: str | None) -> str:
    if not authorization:
        return "anonymous"

    token = authorization.removeprefix("Bearer ").strip()
    decoded = _decode_token(token)
    if not decoded:
        return "anonymous"

    return str(decoded.get("email") or decoded.get("id") or decoded.get("sub") or "anonymous")




app.include_router(statement_router)


@app.post("/api/v1/statements/upload")
async def upload_statement(background: BackgroundTasks, files: list[UploadFile] = File(...), authorization: str | None = Header(default=None)):
    """Accept statement files, save a quick placeholder, and process OCR/analysis in the background."""
    uploaded_meta = []
    raw_files = []
    for f in files:
        b = await f.read()
        uploaded_meta.append({"name": f.filename or "file", "size": len(b), "type": f.content_type})
        raw_files.append({"filename": f.filename or "file", "bytes": b, "content_type": f.content_type})

    user_key = _statement_user_key(authorization)
    placeholder = {
        "uploaded_at": dt.datetime.utcnow().isoformat(),
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

    def _bg_analyze_and_save(user_key: str, raw_files: list[dict[str, Any]]):
        try:
            result = analyze_statement_from_bytes(raw_files)
            save_statement_analysis(user_key, result)
        except Exception as error:
            print(f"[main.upload_statement] Background analysis failed: {error}")

    background.add_task(_bg_analyze_and_save, user_key, raw_files)
    return stored


@app.get("/api/v1/statements/latest")
async def latest_statement(authorization: str | None = Header(default=None)):
    user_key = _statement_user_key(authorization)
    stored = get_latest_statement_analysis(user_key)
    if not stored and user_key != "anonymous":
        stored = get_latest_statement_analysis("anonymous")

    if not stored:
        raise HTTPException(status_code=404, detail="No uploaded statement analysis found.")

    stored.pop("_id", None)
    return json.loads(json.dumps(stored, default=str))


@app.get("/health")
def health():
    return {"status": "ok"}
