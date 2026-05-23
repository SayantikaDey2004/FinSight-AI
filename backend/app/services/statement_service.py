import base64
import json
import os
import re
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import UploadFile

from app.services.unusual_transaction_service import compute_unusual_flag



CATEGORY_KEYWORDS = {
    "food": "Food",
    "restaurant": "Food",
    "swiggy": "Food",
    "zomato": "Food",
    "coffee": "Coffee",
    "cafe": "Coffee",
    "transport": "Transport",
    "cab": "Transport",
    "uber": "Transport",
    "ola": "Transport",
    "shop": "Shopping",
    "amazon": "Shopping",
    "myntra": "Shopping",
    "utilities": "Utilities",
    "electric": "Utilities",
    "water": "Utilities",
    "internet": "Internet",
    "broadband": "Internet",
    "health": "Health",
    "pharmacy": "Health",
    "hospital": "Health",
    "travel": "Travel",
    "flight": "Travel",
    "airlines": "Travel",
    "education": "Education",
    "course": "Education",
    "salary": "Salary",
    "freelance": "Freelance",
    "rent": "Rent",
    "movie": "Entertainment",
    "cinema": "Entertainment",
    "gym": "Health",
    "grocer": "Groceries",
}

DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d %Y",
    "%B %d %Y",
    "%d %b, %Y",
    "%d %B, %Y",
]


def _guess_mime_type(filename: str | None, content_type: str | None) -> str:
    if content_type:
        return content_type
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".jpg") or name.endswith(".jpeg"):
        return "image/jpeg"
    if name.endswith(".webp"):
        return "image/webp"
    if name.endswith(".csv"):
        return "text/csv"
    return "application/octet-stream"


def _gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY")


def _gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def _extract_json_block(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


def _invoke_gemini(prompt: str, file_bytes: bytes, mime_type: str) -> dict[str, Any]:
    api_key = _gemini_api_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64.b64encode(file_bytes).decode("utf-8"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{_gemini_model()}:generateContent?key={api_key}"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini OCR request failed: {error_body or error.reason}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Gemini OCR request failed: {error.reason}") from error

    data = json.loads(raw)
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
    if not text:
        raise RuntimeError("Gemini returned an empty OCR payload.")

    return _extract_json_block(text)


def _normalize_date(value: str | None) -> str:
    if not value:
        return datetime.utcnow().date().isoformat()

    candidate = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(candidate, fmt).date().isoformat()
        except ValueError:
            continue

    candidate = candidate.replace(".", "-")
    try:
        return datetime.fromisoformat(candidate).date().isoformat()
    except ValueError:
        return datetime.utcnow().date().isoformat()


def _infer_category(merchant: str, note: str) -> str:
    source = f"{merchant} {note}".lower()
    for keyword, category in CATEGORY_KEYWORDS.items():
        if keyword in source:
            return category
    return "Other"


def _normalize_amount(raw_amount: Any) -> float:
    if raw_amount is None:
        return 0.0
    if isinstance(raw_amount, (int, float)):
        return float(raw_amount)
    cleaned = re.sub(r"[^0-9.\-]", "", str(raw_amount))
    if not cleaned or cleaned in {"-", ".", "-."}:
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _normalize_transaction(raw_item: dict[str, Any], transaction_id: int) -> dict[str, Any]:
    merchant = str(
        raw_item.get("merchant")
        or raw_item.get("narration")
        or raw_item.get("description")
        or raw_item.get("payee")
        or raw_item.get("particulars")
        or "Unknown"
    ).strip() or "Unknown"
    note = str(raw_item.get("note") or raw_item.get("description") or merchant).strip()
    category = str(raw_item.get("category") or _infer_category(merchant, note)).strip() or "Other"

    raw_type = str(raw_item.get("type") or "").lower().strip()
    debit_value = _normalize_amount(raw_item.get("debit"))
    credit_value = _normalize_amount(raw_item.get("credit"))
    amount_value = _normalize_amount(raw_item.get("amount"))

    if raw_type not in {"credit", "debit"}:
        if credit_value > 0 and debit_value <= 0:
            raw_type = "credit"
        elif debit_value > 0 and credit_value <= 0:
            raw_type = "debit"
        elif amount_value < 0:
            raw_type = "debit"
        elif amount_value > 0:
            raw_type = "credit"
        else:
            raw_type = "debit"

    if raw_type == "credit":
        signed_amount = abs(credit_value or amount_value)
        debit_value = 0.0
        credit_value = abs(credit_value or amount_value)
    else:
        signed_amount = -abs(debit_value or amount_value)
        debit_value = abs(debit_value or amount_value)
        credit_value = 0.0

    return {
        "id": transaction_id,
        "date": _normalize_date(str(raw_item.get("date") or raw_item.get("transaction_date") or raw_item.get("posted_date") or "")),
        "merchant": merchant,
        "narration": merchant,
        "category": category,
        "amount": round(signed_amount, 2),
        "debit": round(debit_value, 2),
        "credit": round(credit_value, 2),
        "balance": round(_normalize_amount(raw_item.get("balance")), 2),
        "type": raw_type,
        "note": note,
        "unusual": bool(raw_item.get("unusual", False)),
    }


def _compute_summary(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    total_income = round(sum(item["amount"] for item in transactions if item["type"] == "credit"), 2)
    total_expense = round(sum(abs(item["amount"]) for item in transactions if item["type"] == "debit"), 2)
    net_savings = round(total_income - total_expense, 2)
    savings_rate = round((net_savings / total_income) * 100) if total_income > 0 else 0
    category_breakdown: dict[str, float] = defaultdict(float)
    for item in transactions:
        if item["type"] == "debit":
            category_breakdown[item["category"]] += abs(item["amount"])
    top_category = max(category_breakdown.items(), key=lambda entry: entry[1])[0] if category_breakdown else "N/A"
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": net_savings,
        "savings_rate": savings_rate,
        "top_spending_category": top_category,
        "transaction_count": len(transactions),
        "category_breakdown": {key: round(value, 2) for key, value in category_breakdown.items()},
    }


def _mark_unusual(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flag unusual debit transactions.

    Heuristics:
    - Statistical spike vs median (existing behavior)
    - Also flag if amount is a large share of total debits
    - Also look for semantic unusual merchants/notes (best-effort)
    """

    debit_values = [abs(item["amount"]) for item in transactions if item["type"] == "debit"]
    median_debit = sorted(debit_values)[len(debit_values) // 2] if debit_values else 0
    total_debits = float(sum(debit_values)) if debit_values else 0.0
    threshold = max(10000.0, median_debit * 3 if median_debit else 10000.0)

    # Simple keyword-based risk hints (no extra models)
    unusual_keywords = [
        "atm",
        "cash",
        "withdraw",
        "chargeback",
        "reversal",
        "fine",
        "penalty",
        "fraud",
        "international",
        "imps",
        "neft",
        "rtgs",
    ]

    for item in transactions:
        if item["type"] != "debit":
            continue

        amt = abs(float(item.get("amount") or 0.0))
        share_of_debits = (amt / total_debits) if total_debits > 0 else 0.0

        note_blob = f"{item.get('merchant','')} {item.get('note','')} {item.get('narration','')} {item.get('category','')}".lower()
        keyword_risk = any(k in note_blob for k in unusual_keywords)

        is_spike = amt >= threshold
        is_large_share = share_of_debits >= 0.15  # >=15% of total debits
        is_keyword_unusual = keyword_risk

        if is_spike or is_large_share or is_keyword_unusual:
            item["unusual"] = True

    return transactions



from app.services.recurring_payment_service import detect_recurring_payments


def _build_recurring(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Improved heuristic recurring detection based on transaction date cadence.
    # Returns items compatible with frontend recurring cards.
    return detect_recurring_payments(transactions)



def _build_monthly_trend(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for item in transactions:
        month = item["date"][:7]
        if item["type"] == "credit":
            monthly[month]["income"] += item["amount"]
        else:
            monthly[month]["expense"] += abs(item["amount"])

    return [
        {
            "month": month,
            "income": round(values["income"], 2),
            "expense": round(values["expense"], 2),
        }
        for month, values in sorted(monthly.items())
    ]


def _build_ai_summary(summary: dict[str, Any], recurring: list[dict[str, Any]], unusual: list[dict[str, Any]]) -> dict[str, Any]:
    health_score = 82
    if summary["savings_rate"] < 0:
        health_score -= 20
    elif summary["savings_rate"] < 20:
        health_score -= 8
    if unusual:
        health_score -= min(12, len(unusual) * 3)
    health_score = max(0, min(100, health_score))

    observations = [
        f"Processed {summary['transaction_count']} transactions.",
        f"Highest spending category: {summary['top_spending_category']}.",
    ]
    if recurring:
        observations.append(f"Detected {len(recurring)} recurring merchant(s).")
    if unusual:
        observations.append(f"Flagged {len(unusual)} unusual debit transaction(s).")

    recommendations = [
        "Review high-value debits and subscriptions.",
        "Set alerts for unusual spending spikes.",
    ]
    if summary["savings_rate"] < 20:
        recommendations.insert(0, "Reduce discretionary spending to improve savings rate.")

    return {
        "overview": (
            f"OCR extracted {summary['transaction_count']} transactions. "
            f"Net savings are ₹{abs(summary['net_savings']):,.0f} and spending is led by {summary['top_spending_category']}."
        ),
        "observations": observations,
        "recommendations": recommendations,
        "health_score": health_score,
        "health_score_reason": "Computed from savings rate, recurring spend, and unusual transactions.",
    }


async def _read_upload_file(upload_file: UploadFile) -> tuple[str, bytes, str]:
    file_bytes = await upload_file.read()
    mime_type = _guess_mime_type(upload_file.filename, upload_file.content_type)
    return upload_file.filename or "statement", file_bytes, mime_type


def _analyze_file_bytes(file_bytes: bytes, filename: str, mime_type: str) -> list[dict[str, Any]]:
    prompt = (
        "You are an OCR engine and bank statement parser. Extract every transaction from the uploaded statement. "
        "Return only valid JSON with this exact shape: {\"transactions\": [{\"date\": \"YYYY-MM-DD\", \"merchant\": \"string\", \"category\": \"string\", "
        "\"amount\": number, \"type\": \"credit\" | \"debit\", \"note\": \"string\", \"unusual\": boolean}]}. "
        "Use amount as a positive number in the JSON. Set type to credit for money in and debit for money out. "
        "If category is unclear, choose one of: Food, Coffee, Transport, Shopping, Utilities, Health, Travel, Education, Salary, Freelance, Rent, Internet, Groceries, Entertainment, Other. "
        "If the statement has running balances, include them when visible; otherwise omit balance."
    )
    parsed = _invoke_gemini(prompt, file_bytes, mime_type)
    transactions: list[dict[str, Any]] = []
    for item in parsed.get("transactions", []):
        if isinstance(item, dict):
            transactions.append(item)
    return transactions


async def analyze_statement_files(upload_files: list[UploadFile]) -> dict[str, Any]:
    if not upload_files:
        raise ValueError("Please upload at least one statement file.")

    extracted_transactions: list[dict[str, Any]] = []
    uploaded_files: list[dict[str, Any]] = []

    for upload_file in upload_files:
        filename, file_bytes, mime_type = await _read_upload_file(upload_file)
        uploaded_files.append({"name": filename, "size": len(file_bytes), "type": mime_type})

        extracted_transactions.extend(_analyze_file_bytes(file_bytes, filename, mime_type))

    normalized_transactions = [
        _normalize_transaction(item, index + 1)
        for index, item in enumerate(extracted_transactions)
    ]
    normalized_transactions.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
    for index, item in enumerate(normalized_transactions, start=1):
        item["id"] = index

    normalized_transactions = _mark_unusual(normalized_transactions)
    summary = _compute_summary(normalized_transactions)
    recurring = _build_recurring(normalized_transactions)
    unusual = [item for item in normalized_transactions if item["unusual"]]
    monthly_trend = _build_monthly_trend(normalized_transactions)
    ai_summary = _build_ai_summary(summary, recurring, unusual)

    return {
        "uploaded_at": datetime.utcnow().isoformat(),
        "files": uploaded_files,
        "summary": summary,
        "transactions": normalized_transactions,
        "recurring": recurring,
        "unusual": unusual,
        "ai_summary": ai_summary,
        "monthly_trend": monthly_trend,
    }


async def analyze_statement(file_bytes: bytes, filename: str | None = None, content_type: str | None = None) -> dict[str, Any]:
    mime_type = _guess_mime_type(filename, content_type)
    transactions = _analyze_file_bytes(file_bytes, filename or "statement", mime_type)
    normalized_transactions = [
        _normalize_transaction(item, index + 1)
        for index, item in enumerate(transactions)
    ]
    normalized_transactions.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
    for index, item in enumerate(normalized_transactions, start=1):
        item["id"] = index

    normalized_transactions = _mark_unusual(normalized_transactions)
    summary = _compute_summary(normalized_transactions)
    recurring = _build_recurring(normalized_transactions)
    unusual = [item for item in normalized_transactions if item["unusual"]]
    monthly_trend = _build_monthly_trend(normalized_transactions)
    ai_summary = _build_ai_summary(summary, recurring, unusual)

    return {
        "uploaded_at": datetime.utcnow().isoformat(),
        "files": [{"name": filename or "statement", "size": len(file_bytes), "type": mime_type}],
        "summary": summary,
        "transactions": normalized_transactions,
        "recurring": recurring,
        "unusual": unusual,
        "ai_summary": ai_summary,
        "monthly_trend": monthly_trend,
    }
