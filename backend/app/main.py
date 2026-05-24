from __future__ import annotations

import datetime as dt
import os
import json
from typing import Any

import jwt
from bson import ObjectId
from fastapi import Depends, FastAPI, File, HTTPException, Header, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from pathlib import Path

# Load environment from backend/.env (kept out of VCS)
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

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
from app.services.recurring_payment_service import detect_recurring_payments
from app.services.statement_service import analyze_statement_files, generate_dashboard_ai_summary
from app.services.unusual_transaction_service import compute_unusual_flag
from app.routes.statement_routes import router as statement_router
from modules.hashed_password import check_password, create_hashed_password
from modules.send_email import send_email


app = FastAPI(title="FinSightAI API")


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip().rstrip("/") for item in os.getenv(name, default).split(",") if item.strip()]


FRONTEND_URL = os.getenv("FRONTEND_URL", "https://finsightai-delta.vercel.app").strip().rstrip("/")
ALLOWED_ORIGINS = _csv_env(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
)
if FRONTEND_URL:
    ALLOWED_ORIGINS.append(FRONTEND_URL)



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
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    user_id = str(user.get("_id", user.get("id", user.get("email", ""))))
    access_token = _create_token({"sub": user_id, "email": user["email"], "purpose": "access"}, 20)
    refresh_token = _create_token({"sub": user_id, "email": user["email"], "purpose": "refresh"}, 60 * 24 * 7)
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

def _empty_dashboard_payload() -> dict[str, Any]:
    return {
        "healthScore": 0,
        "totalIncome": 0,
        "totalExpense": 0,
        "currentBalance": 0,
        "savings": 0,
        "incomeChangePct": 0,
        "expenseChangePct": 0,
        "savingsPct": 0,
        "transactionCount": 0,
        "monthlyData": [],
        "categories": [],
        "recurring": [],
        "unusual": [],
        "aiInsights": [],
        "txList": [],
    }


@app.get("/api/v1/dashboard/summary")
async def get_dashboard_summary(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    user_id = _require_authenticated_user_id(credentials)
    stored = get_latest_statement_analysis(user_id)

    if not stored:
        return _empty_dashboard_payload()

    return _build_dashboard_payload(stored)
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
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    collection.update_one(
        {"email": data.email},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires_at": (dt.datetime.utcnow() + dt.timedelta(minutes=30)).isoformat(),
            }
        },
    )

    # Send email with Bravo SMTP containing the reset link.
    # Frontend remains unchanged; response body is kept compatible.
    try:
        html_body = f"""
        <html>
          <body style=\"font-family: Arial, sans-serif;\">
            <p>Hello,</p>
            <p>You requested a password reset for your FinSightAI account.</p>
            <p>
              <a href=\"{reset_url}\" style=\"display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;\">
                Reset your password
              </a>
            </p>
            <p>If you didn’t request this, you can ignore this email.</p>
            <p>Thanks,<br/>FinSightAI Team</p>
          </body>
        </html>
        """.strip()

        send_email(
            to_email=data.email,
            subject="FinSightAI Password Reset",
            html_body=html_body,
        )
    except Exception:
        # Do not block the existing flow if email fails.
        # (Frontend may rely on token/url returned below.)
        pass

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


def _require_authenticated_user_id(credentials: HTTPAuthorizationCredentials | None) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    decoded = _decode_token(credentials.credentials)
    if not decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = decoded.get("sub") or decoded.get("id")
    if user_id:
        return str(user_id)

    email = decoded.get("email")
    if email:
        user = _get_user_by_email(str(email))
        if user:
            return str(user.get("_id"))

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def _build_dashboard_payload(stored: dict[str, Any]) -> dict[str, Any]:
    transactions = stored.get("transactions", []) or []

    total_income = round(sum(float(tx.get("amount") or 0.0) for tx in transactions if float(tx.get("amount") or 0.0) > 0), 2)
    total_expense = round(sum(abs(float(tx.get("amount") or 0.0)) for tx in transactions if float(tx.get("amount") or 0.0) < 0), 2)
    current_balance = round(total_income - total_expense, 2)

    category_breakdown: dict[str, float] = {}
    debit_amounts: list[float] = []
    for tx in transactions:
        amount = float(tx.get("amount") or 0.0)
        if amount < 0:
            category = str(tx.get("category") or "Other")
            category_breakdown[category] = category_breakdown.get(category, 0.0) + abs(amount)
            debit_amounts.append(abs(amount))

    cat_colors = ["#22c55e", "#0ea5e9", "#f97316", "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6"]
    sorted_categories = sorted(category_breakdown.items(), key=lambda item: item[1], reverse=True)
    categories = [
        {
            "name": cat,
            "amount": round(amount, 2),
            "pct": round((amount / total_expense) * 100) if total_expense > 0 else 0,
            "color": cat_colors[index % len(cat_colors)],
        }
        for index, (cat, amount) in enumerate(sorted_categories)
    ]

    recurring_raw = detect_recurring_payments(transactions)
    recurring = [
        {
            "name": item["name"],
            "date": item["date"],
            "amount": item["amount"],
            "status": item["status"],
            "icon": item.get("icon", "🔄"),
            "color": item.get("color", "#0ea5e9"),
            "category": item.get("category", "Other"),
            "count": item.get("count", 0),
            "avg_amount": item.get("avg_amount", item["amount"]),
            "cadence_months": item.get("cadence_months", 1),
            "next_due_date": item.get("next_due_date"),
        }
        for item in recurring_raw
    ]

    unusual_tx = [tx for tx in transactions if bool(tx.get("unusual"))]
    if not unusual_tx and debit_amounts:
        median = sorted(debit_amounts)[len(debit_amounts) // 2]
        total_debits = sum(debit_amounts)
        for tx in transactions:
            if compute_unusual_flag(tx, debit_median=median, debit_total=total_debits):
                unusual_tx.append(tx)

    unusual = [
        {
            "name": tx.get("merchant", "Unknown"),
            "reason": tx.get("note") or tx.get("narration") or "Flagged by analysis.",
            "amount": abs(float(tx.get("amount") or 0.0)),
            "icon": "⚠️",
        }
        for tx in unusual_tx
    ]

    monthly: dict[str, dict[str, float]] = {}
    for tx in transactions:
        date_key = str(tx.get("date") or "")[:7]
        if not date_key:
            continue
        monthly.setdefault(date_key, {"income": 0.0, "expense": 0.0})
        amount = float(tx.get("amount") or 0.0)
        if amount > 0:
            monthly[date_key]["income"] += amount
        else:
            monthly[date_key]["expense"] += abs(amount)

    monthly_data = []
    for key in sorted(monthly.keys()):
        try:
            month_label = dt.datetime.strptime(key, "%Y-%m").strftime("%b %Y")
        except ValueError:
            month_label = key
        monthly_data.append({"month": month_label, "income": round(monthly[key]["income"], 2), "expense": round(monthly[key]["expense"], 2)})

    ai_source = {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": current_balance,
        "savings_rate": round((current_balance / total_income) * 100) if total_income > 0 else 0,
        "top_spending_category": categories[0]["name"] if categories else "N/A",
        "transaction_count": len(transactions),
        "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
    }
    ai = generate_dashboard_ai_summary(ai_source, recurring_raw, unusual_tx, transactions)

    tx_list = [
        {
            "date": tx.get("date"),
            "name": tx.get("merchant", "Unknown"),
            "bank": tx.get("bank", "Statement"),
            "cat": tx.get("category", "Other"),
            "catColor": "#0ea5e9",
            "icon": "💳",
            "iconBg": "#1e3a5f",
            "amount": float(tx.get("amount") or 0.0),
            "status": "flagged" if tx in unusual_tx else "completed",
        }
        for tx in transactions[:20]
    ]

    return {
        "healthScore": ai.get("health_score", 0),
        "totalIncome": total_income,
        "totalExpense": total_expense,
        "currentBalance": current_balance,
        "savings": current_balance,
        "incomeChangePct": 0,
        "expenseChangePct": 0,
        "savingsPct": round((current_balance / total_income) * 100) if total_income > 0 else 0,
        "transactionCount": len(transactions),
        "monthlyData": monthly_data,
        "categories": categories,
        "recurring": recurring,
        "unusual": unusual,
        "aiInsights": [
            {"icon": "🧠", "title": "Overview", "text": ai.get("overview", "")},
            *[{"icon": "📌", "title": "Observation", "text": obs} for obs in ai.get("observations", [])],
            *[{"icon": "💡", "title": "Recommendation", "text": rec} for rec in ai.get("recommendations", [])],
        ],
        "txList": tx_list,
    }




app.include_router(statement_router)


@app.post("/api/v1/statements/upload")
async def upload_statement(files: list[UploadFile] = File(...), credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    """Accept statement files, analyze them immediately, and save the OCR result."""
    try:
        analysis = await analyze_statement_files(files)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {error}")

    user_id = _require_authenticated_user_id(credentials)
    print(f"[main] upload_statement: saving analysis for user_id={user_id} transactions={len(analysis.get('transactions',[]) or [])}")
    stored = save_statement_analysis(user_id, analysis)
    stored.pop("_id", None)
    return stored


@app.get("/api/v1/statements/latest")
async def latest_statement(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)):
    user_id = _require_authenticated_user_id(credentials)
    stored = get_latest_statement_analysis(user_id)

    if not stored:
        raise HTTPException(status_code=404, detail="No uploaded statement analysis found.")

    stored.pop("_id", None)
    return json.loads(json.dumps(stored, default=str))


@app.get("/health")
def health():
    return {"status": "ok"}
