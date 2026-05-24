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
from app.services import parser_service

# ── Category keyword map (Indian bank statement context) ─────────────────────
from app.services.unusual_transaction_service import compute_unusual_flag



CATEGORY_KEYWORDS = {
    # Food & Dining
    "swiggy": "Food & Dining",
    "zomato": "Food & Dining",
    "food": "Food & Dining",
    "restaurant": "Food & Dining",
    "hotel": "Food & Dining",
    "cafe": "Food & Dining",
    "coffee": "Food & Dining",
    "vilas": "Food & Dining",
    "ananda": "Food & Dining",
    "kitchen": "Food & Dining",
    "dhaba": "Food & Dining",
    "bakery": "Food & Dining",

    # Transport
    "uber": "Transport",
    "ola": "Transport",
    "cab": "Transport",
    "rapido": "Transport",
    "metro": "Transport",
    "irctc": "Transport",
    "railway": "Transport",
    "season ticket": "Transport",
    "petrol": "Transport",
    "fuel": "Transport",
    "fasttag": "Transport",
    "atm withdrawal": "ATM Withdrawal",
    "atm with": "ATM Withdrawal",

    # Shopping
    "amazon": "Shopping",
    "flipkart": "Shopping",
    "myntra": "Shopping",
    "ajio": "Shopping",
    "nykaa": "Shopping",
    "lifestyle": "Shopping",
    "life style": "Shopping",
    "shoppers": "Shopping",
    "reliance": "Shopping",
    "big bazaar": "Shopping",
    "dmart": "Shopping",
    "thangamaligai": "Shopping",
    "jewel": "Shopping",
    "purchase": "Shopping",

    # Groceries
    "bigbasket": "Groceries",
    "big basket": "Groceries",
    "grofer": "Groceries",
    "blinkit": "Groceries",
    "zepto": "Groceries",
    "supermarket": "Groceries",
    "grocery": "Groceries",
    "vegetables": "Groceries",

    # Utilities & Bills
    "electricity": "Utilities",
    "electric": "Utilities",
    "tneb": "Utilities",
    "bescom": "Utilities",
    "water": "Utilities",
    "gas": "Utilities",
    "bbmp": "Utilities",
    "municipal": "Utilities",
    "billdesk": "Utilities",
    "indiaideas": "Utilities",

    # Internet & Mobile
    "airtel": "Internet & Mobile",
    "jio": "Internet & Mobile",
    "vi ": "Internet & Mobile",
    "vodafone": "Internet & Mobile",
    "bsnl": "Internet & Mobile",
    "broadband": "Internet & Mobile",
    "internet": "Internet & Mobile",
    "recharge": "Internet & Mobile",
    "prepaid": "Internet & Mobile",

    # Entertainment & Subscriptions
    "netflix": "Subscriptions",
    "spotify": "Subscriptions",
    "hotstar": "Subscriptions",
    "prime": "Subscriptions",
    "youtube": "Subscriptions",
    "zee5": "Subscriptions",
    "sonyliv": "Subscriptions",
    "movie": "Entertainment",
    "cinema": "Entertainment",
    "pvr": "Entertainment",
    "inox": "Entertainment",
    "bookmyshow": "Entertainment",
    "google": "Subscriptions",

    # Health
    "pharmacy": "Healthcare",
    "medical": "Healthcare",
    "hospital": "Healthcare",
    "clinic": "Healthcare",
    "apollo": "Healthcare",
    "health": "Healthcare",
    "gym": "Healthcare",
    "fitness": "Healthcare",
    "1mg": "Healthcare",
    "netmeds": "Healthcare",

    # Travel
    "flight": "Travel",
    "airline": "Travel",
    "indigo": "Travel",
    "air india": "Travel",
    "spicejet": "Travel",
    "makemytrip": "Travel",
    "goibibo": "Travel",
    "ixigo": "Travel",
    "yatra": "Travel",
    "cleartrip": "Travel",
    "oyo": "Travel",
    "hotel booking": "Travel",

    # Education
    "education": "Education",
    "school": "Education",
    "college": "Education",
    "university": "Education",
    "udemy": "Education",
    "coursera": "Education",
    "byju": "Education",
    "unacademy": "Education",
    "tuition": "Education",
    "fees": "Education",

    # Income / Credits
    "salary": "Salary",
    "neft": "Bank Transfer",
    "imps": "Bank Transfer",
    "rtgs": "Bank Transfer",
    "credit of interest": "Interest",
    "interest": "Interest",
    "dividend": "Investment",
    "refund": "Refund",
    "cashback": "Refund",
    "reversal": "Refund",

    # Insurance & Investment
    "lic": "Insurance",
    "insurance": "Insurance",
    "premium": "Insurance",
    "mutual fund": "Investment",
    "sip": "Investment",
    "zerodha": "Investment",
    "groww": "Investment",
    "upstox": "Investment",

    # UPI & Wallets
    "paytm": "UPI Transfer",
    "phonepe": "UPI Transfer",
    "googlepay": "UPI Transfer",
    "gpay": "UPI Transfer",
    "amazonpay": "UPI Transfer",
    "upi": "UPI Transfer",
    "wallet": "UPI Transfer",

    # Rent & Housing
    "rent": "Rent",
    "housing": "Rent",
    "maintenance": "Rent",
    "society": "Rent",

    # Bank Charges
    "charges": "Bank Charges",
    "cgst": "Bank Charges",
    "sgst": "Bank Charges",
    "igst": "Bank Charges",
    "penalty": "Bank Charges",
    "fee": "Bank Charges",
}

DATE_FORMATS = [
    "%d %b %y",
    "%d %b %Y",
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %B %Y",
    "%d %b, %Y",
]


# ── Gemini helpers ────────────────────────────────────────────────────────────

def _gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY")


def _gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _guess_mime_type(filename: str | None, content_type: str | None) -> str:
    if content_type and content_type != "application/octet-stream":
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
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as response:
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


# ── CSV parser (no Gemini needed) ─────────────────────────────────────────────

def _parse_csv_bytes(file_bytes: bytes) -> list[dict[str, Any]]:
    import csv
    import io
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []

    # Normalize headers to lowercase for matching
    def find_col(headers: list[str], *candidates: str) -> str | None:
        for c in candidates:
            for h in headers:
                if c.lower() in h.lower():
                    return h
        return None

    headers = list(rows[0].keys())
    date_col = find_col(headers, "date", "txn date", "transaction date", "value date")
    desc_col = find_col(headers, "description", "narration", "particulars", "details", "remarks")
    debit_col = find_col(headers, "debit", "withdrawal", "dr")
    credit_col = find_col(headers, "credit", "deposit", "cr")
    balance_col = find_col(headers, "balance")
    amount_col = find_col(headers, "amount") if not debit_col else None

    transactions = []
    for row in rows:
        date_val = row.get(date_col, "") if date_col else ""
        desc_val = row.get(desc_col, "") if desc_col else ""
        debit_val = row.get(debit_col, "") if debit_col else ""
        credit_val = row.get(credit_col, "") if credit_col else ""
        balance_val = row.get(balance_col, "") if balance_col else ""
        amount_val = row.get(amount_col, "") if amount_col else ""

        if not date_val and not desc_val:
            continue

        transactions.append({
            "date": date_val.strip(),
            "merchant": desc_val.strip(),
            "debit": debit_val.strip(),
            "credit": credit_val.strip(),
            "balance": balance_val.strip(),
            "amount": amount_val.strip(),
        })

    return transactions


# ── Normalisation helpers ─────────────────────────────────────────────────────

def _normalize_date(value: str | None) -> str:
    if not value:
        return datetime.utcnow().date().isoformat()

    candidate = value.strip()
    # Remove extra whitespace
    candidate = re.sub(r"\s+", " ", candidate)

    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(candidate, fmt).date().isoformat()
        except ValueError:
            continue

    # Try replacing dots/slashes
    for sep in [".", "/"]:
        candidate2 = candidate.replace(sep, "-")
        try:
            return datetime.fromisoformat(candidate2).date().isoformat()
        except ValueError:
            pass

    return datetime.utcnow().date().isoformat()


def _clean_amount(raw: Any) -> float:
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return abs(float(raw))
    # Remove currency symbols, commas, spaces
    cleaned = re.sub(r"[₹$£€,\s]", "", str(raw))
    cleaned = re.sub(r"[^0-9.\-]", "", cleaned)
    if not cleaned or cleaned in {"-", ".", "-."}:
        return 0.0
    try:
        return abs(float(cleaned))
    except ValueError:
        return 0.0


def _infer_category(description: str) -> str:
    desc_lower = description.lower()
    for keyword, category in CATEGORY_KEYWORDS.items():
        if keyword in desc_lower:
            return category
    return "Other"


def _normalize_transaction(raw: dict[str, Any], txn_id: int) -> dict[str, Any]:
    # Extract merchant/description
    merchant = str(
        raw.get("merchant") or raw.get("narration") or raw.get("description")
        or raw.get("payee") or raw.get("particulars") or "Unknown"
    ).strip() or "Unknown"

    # Clean up long UPI reference strings - extract readable name
    merchant_clean = merchant
    if "UPI/" in merchant.upper():
        # Try to extract payee name from UPI string
        parts = merchant.split("/")
        # UPI strings like: UPI/REF/PAYEE_NAME/VPA/...
        if len(parts) >= 3:
            candidate = parts[2].strip()
            if candidate and len(candidate) > 2 and not candidate.isdigit():
                merchant_clean = candidate
    elif "NEFT" in merchant.upper() or "IMPS" in merchant.upper():
        # Extract beneficiary name
        parts = merchant.split()
        if len(parts) >= 4:
            merchant_clean = " ".join(parts[3:6])

    note = merchant  # keep original as note
    category = str(raw.get("category") or _infer_category(merchant)).strip() or "Other"

    debit_val = _clean_amount(raw.get("debit") or raw.get("withdrawal"))
    credit_val = _clean_amount(raw.get("credit") or raw.get("deposit"))
    amount_val = _clean_amount(raw.get("amount"))
    balance_val = _clean_amount(raw.get("balance"))

    raw_type = str(raw.get("type") or "").lower().strip()

    # Determine transaction type
    if raw_type not in {"credit", "debit"}:
        if credit_val > 0 and debit_val == 0:
            raw_type = "credit"
        elif debit_val > 0 and credit_val == 0:
            raw_type = "debit"
        elif amount_val != 0:
            raw_type = "credit" if raw.get("type", "").lower() == "credit" else "debit"
        else:
            raw_type = "debit"

    if raw_type == "credit":
        final_amount = credit_val or amount_val
        debit_val = 0.0
        credit_val = final_amount
    else:
        final_amount = -(debit_val or amount_val)
        credit_val = 0.0
        debit_val = abs(final_amount)

    return {
        "id": txn_id,
        "date": _normalize_date(str(raw.get("date") or raw.get("transaction_date") or raw.get("value_date") or "")),
        "merchant": merchant_clean,
        "narration": note,
        "category": category,
        "amount": round(final_amount, 2),
        "debit": round(debit_val, 2),
        "credit": round(credit_val, 2),
        "balance": round(balance_val, 2),
        "type": raw_type,
        "note": note,
        "unusual": bool(raw.get("unusual", False)),
    }


# ── Analytics ─────────────────────────────────────────────────────────────────

def _compute_summary(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    total_income = round(sum(t["credit"] for t in transactions if t["type"] == "credit"), 2)
    total_expense = round(sum(t["debit"] for t in transactions if t["type"] == "debit"), 2)
    net_savings = round(total_income - total_expense, 2)
    savings_rate = round((net_savings / total_income) * 100) if total_income > 0 else 0

    category_breakdown: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t["type"] == "debit":
            category_breakdown[t["category"]] += t["debit"]

    # Sort by amount desc
    category_breakdown = dict(
        sorted(category_breakdown.items(), key=lambda x: x[1], reverse=True)
    )

    top_category = list(category_breakdown.keys())[0] if category_breakdown else "N/A"

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": net_savings,
        "savings_rate": savings_rate,
        "top_spending_category": top_category,
        "transaction_count": len(transactions),
        "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
    }


def _mark_unusual(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    debit_amounts = [t["debit"] for t in transactions if t["type"] == "debit" and t["debit"] > 0]
    if not debit_amounts:
        return transactions

    avg = sum(debit_amounts) / len(debit_amounts)
    sorted_amounts = sorted(debit_amounts)
    median = sorted_amounts[len(sorted_amounts) // 2]
    # Use 3x median OR 2x average as threshold, whichever is lower
    threshold = min(median * 3, avg * 2.5, max(debit_amounts) * 0.5)
    threshold = max(threshold, 5000.0)  # minimum ₹5000 to be unusual

    for t in transactions:
        if t["type"] == "debit" and t["debit"] >= threshold:
            t["unusual"] = True
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
    # Group by cleaned merchant name + category
    grouped: dict[str, list[float]] = defaultdict(list)
    for t in transactions:
        if t["type"] != "debit":
            continue
        key = f"{t['merchant'].lower().strip()}|{t['category']}"
        grouped[key].append(t["debit"])

    recurring = []
    for key, amounts in grouped.items():
        if len(amounts) < 2:
            continue
        merchant, category = key.split("|", 1)
        recurring.append({
            "name": merchant.title(),
            "count": len(amounts),
            "avg_amount": round(sum(amounts) / len(amounts), 2),
            "total_amount": round(sum(amounts), 2),
            "category": category,
        })

    return sorted(recurring, key=lambda x: (-x["count"], -x["avg_amount"]))
    # Improved heuristic recurring detection based on transaction date cadence.
    # Returns items compatible with frontend recurring cards.
    return detect_recurring_payments(transactions)



def _build_monthly_trend(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    monthly: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for t in transactions:
        month = t["date"][:7]  # YYYY-MM
        if t["type"] == "credit":
            monthly[month]["income"] += t["credit"]
        else:
            monthly[month]["expense"] += t["debit"]

    # Format month labels nicely: "Jun 2019"
    result = []
    for month_key in sorted(monthly.keys()):
        try:
            label = datetime.strptime(month_key, "%Y-%m").strftime("%b %Y")
        except ValueError:
            label = month_key
        result.append({
            "month": label,
            "income": round(monthly[month_key]["income"], 2),
            "expense": round(monthly[month_key]["expense"], 2),
        })
    return result


def _build_ai_summary(
    summary: dict[str, Any],
    recurring: list[dict[str, Any]],
    unusual: list[dict[str, Any]],
    transactions: list[dict[str, Any]],
) -> dict[str, Any]:
    sr = summary["savings_rate"]
    health_score = 75  # base

    if sr >= 30:
        health_score += 15
    elif sr >= 20:
        health_score += 8
    elif sr >= 10:
        health_score += 0
    elif sr >= 0:
        health_score -= 8
    else:
        health_score -= 20

    if unusual:
        health_score -= min(15, len(unusual) * 3)
    if len(recurring) > 5:
        health_score -= 5

    health_score = max(10, min(100, health_score))

    # Build observations
    observations = [
        f"Analysed {summary['transaction_count']} transactions across your statement.",
        f"Total credits: ₹{summary['total_income']:,.2f} | Total debits: ₹{summary['total_expense']:,.2f}.",
        f"Your highest spending category is {summary['top_spending_category']}.",
    ]

    if recurring:
        top_rec = recurring[0]
        observations.append(
            f"Detected {len(recurring)} recurring payment(s). "
            f"'{top_rec['name']}' appears {top_rec['count']} times averaging ₹{top_rec['avg_amount']:,.0f}."
        )

    if unusual:
        observations.append(
            f"{len(unusual)} unusual high-value debit(s) flagged — "
            f"largest: ₹{max(u['debit'] for u in unusual):,.0f}."
        )

    if sr > 0:
        observations.append(f"You saved {sr}% of your income this period.")
    else:
        observations.append("Your expenses exceeded your income this period — consider reviewing spending.")

    # Build recommendations
    recommendations = []
    if sr < 20:
        recommendations.append("Aim for a 20–30% savings rate. Review discretionary spending in top categories.")
    if unusual:
        recommendations.append("Review the flagged high-value transactions to ensure they are authorised.")
    if len(recurring) > 3:
        recommendations.append("Audit your recurring payments — cancel unused subscriptions to free up cash.")

    cat_breakdown = summary.get("category_breakdown", {})
    if "ATM Withdrawal" in cat_breakdown and cat_breakdown["ATM Withdrawal"] > summary["total_expense"] * 0.2:
        recommendations.append("High ATM usage detected. Consider using digital payments for better expense tracking.")
    if "UPI Transfer" in cat_breakdown:
        recommendations.append("UPI transfers are frequent — ensure all transfers are to verified contacts.")
    if not recommendations:
        recommendations.append("Your finances look healthy. Keep maintaining your current spending discipline.")
        recommendations.append("Consider investing your surplus savings in SIPs or fixed deposits.")

    # Overview sentence
    net = summary["net_savings"]
    direction = "saved" if net >= 0 else "overspent by"
    overview = (
        f"Your statement shows ₹{summary['total_income']:,.0f} in credits and "
        f"₹{summary['total_expense']:,.0f} in debits. "
        f"You {direction} ₹{abs(net):,.0f} this period. "
        f"Spending is led by {summary['top_spending_category']}."
    )

    return {
        "overview": overview,
        "observations": observations,
        "recommendations": recommendations,
        "health_score": health_score,
        "health_score_reason": (
            f"Score based on {sr}% savings rate, "
            f"{len(unusual)} unusual transaction(s), and {len(recurring)} recurring payment(s)."
        ),
    }


# ── Gemini PDF/image extraction ───────────────────────────────────────────────

GEMINI_PROMPT = """You are an expert Indian bank statement OCR parser.

Extract ALL transactions from this bank statement PDF/image. For EACH transaction return:
- date: exactly as shown (e.g. "17 Jun 19", "2019-06-17", "17/06/2019")
- merchant: the full description/narration text
- debit: withdrawal amount as a positive number (0 if not a debit)
- credit: deposit amount as a positive number (0 if not a credit)  
- balance: running balance after transaction (0 if not shown)
- type: "debit" if money went out, "credit" if money came in

IMPORTANT RULES:
1. ATM withdrawals are DEBIT transactions
2. Salary/NEFT/IMPS credits are CREDIT transactions
3. UPI payments going OUT are DEBIT, incoming UPI are CREDIT
4. Interest credited is CREDIT
5. Bank charges (CGST, SGST, fees) are DEBIT
6. Include every single row in the statement - do not skip any
7. Use the exact amounts from the Withdrawal column as debit, Deposit column as credit
8. BALANCE FORWARD rows should be skipped

Return ONLY this JSON shape, no other text:
{"transactions": [{"date": "string", "merchant": "string", "debit": number, "credit": number, "balance": number, "type": "debit|credit"}]}"""


def _analyze_file_bytes(file_bytes: bytes, filename: str, mime_type: str) -> list[dict[str, Any]]:
    # CSV — parse directly without Gemini
    if mime_type == "text/csv" or filename.lower().endswith(".csv"):
        return _parse_csv_bytes(file_bytes)

    # PDF / image — use Gemini OCR
    parsed = _invoke_gemini(GEMINI_PROMPT, file_bytes, mime_type)
    transactions = []
    for item in parsed.get("transactions", []):
        if isinstance(item, dict):
            transactions.append(item)
    return transactions


async def _read_upload_file(upload_file: UploadFile) -> tuple[str, bytes, str]:
    file_bytes = await upload_file.read()
    mime_type = _guess_mime_type(upload_file.filename, upload_file.content_type)
    return upload_file.filename or "statement", file_bytes, mime_type


# ── Public API ────────────────────────────────────────────────────────────────

async def analyze_statement_files(upload_files: list[UploadFile]) -> dict[str, Any]:
    if not upload_files:
        raise ValueError("Please upload at least one statement file.")

    all_raw: list[dict[str, Any]] = []
    uploaded_meta: list[dict[str, Any]] = []

    for uf in upload_files:
        filename, file_bytes, mime_type = await _read_upload_file(uf)
        uploaded_meta.append({"name": filename, "size": len(file_bytes), "type": mime_type})
        all_raw.extend(_analyze_file_bytes(file_bytes, filename, mime_type))

    # Normalize all transactions
    normalized = [_normalize_transaction(r, i + 1) for i, r in enumerate(all_raw)]

    # Sort newest first
    normalized.sort(key=lambda t: t["date"], reverse=True)
    for i, t in enumerate(normalized, start=1):
        t["id"] = i

    # Analytics
    normalized = _mark_unusual(normalized)
    summary = _compute_summary(normalized)
    recurring = _build_recurring(normalized)
    unusual = [t for t in normalized if t["unusual"]]
    monthly_trend = _build_monthly_trend(normalized)
    ai_summary = _build_ai_summary(summary, recurring, unusual, normalized)

    return {
        "uploaded_at": datetime.utcnow().isoformat(),
        "files": uploaded_meta,
        "summary": summary,
        "transactions": normalized,
        "recurring": recurring,
        "unusual": unusual,
        "ai_summary": ai_summary,
        "monthly_trend": monthly_trend,
    }


async def analyze_statement(
    file_bytes: bytes,
    filename: str | None = None,
    content_type: str | None = None,
) -> dict[str, Any]:
    mime_type = _guess_mime_type(filename, content_type)
    raw = _analyze_file_bytes(file_bytes, filename or "statement", mime_type)
    normalized = [_normalize_transaction(r, i + 1) for i, r in enumerate(raw)]
    normalized.sort(key=lambda t: t["date"], reverse=True)
    for i, t in enumerate(normalized, start=1):
        t["id"] = i

    normalized = _mark_unusual(normalized)
    summary = _compute_summary(normalized)
    recurring = _build_recurring(normalized)
    unusual = [t for t in normalized if t["unusual"]]
    monthly_trend = _build_monthly_trend(normalized)
    ai_summary = _build_ai_summary(summary, recurring, unusual, normalized)

    return {
        "uploaded_at": datetime.utcnow().isoformat(),
        "files": [{"name": filename or "statement", "size": len(file_bytes), "type": mime_type}],
        "summary": summary,
        "transactions": normalized,
        "recurring": recurring,
        "unusual": unusual,
        "ai_summary": ai_summary,
        "monthly_trend": monthly_trend,
    }

# import base64
# import json
# import os
# import re
# import urllib.error
# import urllib.request
# from collections import defaultdict
# from datetime import datetime
from typing import Any

from fastapi import UploadFile
from app.services import parser_service
from app.services.unusual_transaction_service import compute_unusual_flag

# ── Category keyword map (Indian bank statement context) ─────────────────────
#     "transport": "Transport",
#     "cab": "Transport",
#     "uber": "Transport",
#     "ola": "Transport",
#     "shop": "Shopping",
#     "amazon": "Shopping",
#     "myntra": "Shopping",
#     "utilities": "Utilities",
#     "electric": "Utilities",
#     "water": "Utilities",
#     "internet": "Internet",
#     "broadband": "Internet",
#     "health": "Health",
#     "pharmacy": "Health",
#     "hospital": "Health",
#     "travel": "Travel",
#     "flight": "Travel",
#     "airlines": "Travel",
#     "education": "Education",
#     "course": "Education",
#     "salary": "Salary",
#     "freelance": "Freelance",
#     "rent": "Rent",
#     "movie": "Entertainment",
#     "cinema": "Entertainment",
#     "gym": "Health",
#     "grocer": "Groceries",
# }

# DATE_FORMATS = [
#     "%Y-%m-%d",
#     "%Y/%m/%d",
#     "%d/%m/%Y",
#     "%d-%m-%Y",
#     "%d %b %Y",
#     "%d %B %Y",
#     "%b %d %Y",
#     "%B %d %Y",
#     "%d %b, %Y",
#     "%d %B, %Y",
# ]


# def _guess_mime_type(filename: str | None, content_type: str | None) -> str:
#     if content_type:
#         return content_type
#     name = (filename or "").lower()
#     if name.endswith(".pdf"):
#         return "application/pdf"
#     if name.endswith(".png"):
#         return "image/png"
#     if name.endswith(".jpg") or name.endswith(".jpeg"):
#         return "image/jpeg"
#     if name.endswith(".webp"):
#         return "image/webp"
#     if name.endswith(".csv"):
#         return "text/csv"
#     return "application/octet-stream"


# def _gemini_api_key() -> str | None:
#     return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY")


# def _gemini_model() -> str:
#     return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


# def _extract_json_block(text: str) -> dict[str, Any]:
#     cleaned = text.strip()
#     if cleaned.startswith("```"):
#         cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
#         cleaned = re.sub(r"\s*```$", "", cleaned)
#     return json.loads(cleaned)


# def _invoke_gemini(prompt: str, file_bytes: bytes, mime_type: str) -> dict[str, Any]:
#     api_key = _gemini_api_key()
#     if not api_key:
#         raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")

#     payload = {
#         "contents": [
#             {
#                 "role": "user",
#                 "parts": [
#                     {"text": prompt},
#                     {
#                         "inlineData": {
#                             "mimeType": mime_type,
#                             "data": base64.b64encode(file_bytes).decode("utf-8"),
#                         }
#                     },
#                 ],
#             }
#         ],
#         "generationConfig": {
#             "temperature": 0.1,
#             "responseMimeType": "application/json",
#         },
#     }

#     url = f"https://generativelanguage.googleapis.com/v1beta/models/{_gemini_model()}:generateContent?key={api_key}"
#     request = urllib.request.Request(
#         url,
#         data=json.dumps(payload).encode("utf-8"),
#         headers={"Content-Type": "application/json"},
#         method="POST",
#     )

#     try:
#         with urllib.request.urlopen(request, timeout=120) as response:
#             raw = response.read().decode("utf-8")
#     except urllib.error.HTTPError as error:
#         error_body = error.read().decode("utf-8", errors="ignore")
#         raise RuntimeError(f"Gemini OCR request failed: {error_body or error.reason}") from error
#     except urllib.error.URLError as error:
#         raise RuntimeError(f"Gemini OCR request failed: {error.reason}") from error

#     data = json.loads(raw)
#     candidates = data.get("candidates") or []
#     if not candidates:
#         raise RuntimeError("Gemini returned no candidates.")

#     parts = candidates[0].get("content", {}).get("parts", [])
#     text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
#     if not text:
#         raise RuntimeError("Gemini returned an empty OCR payload.")

#     return _extract_json_block(text)


# def _normalize_date(value: str | None) -> str:
#     if not value:
#         return datetime.utcnow().date().isoformat()

#     candidate = value.strip()
#     for fmt in DATE_FORMATS:
#         try:
#             return datetime.strptime(candidate, fmt).date().isoformat()
#         except ValueError:
#             continue

#     candidate = candidate.replace(".", "-")
#     try:
#         return datetime.fromisoformat(candidate).date().isoformat()
#     except ValueError:
#         return datetime.utcnow().date().isoformat()


# def _infer_category(merchant: str, note: str) -> str:
#     source = f"{merchant} {note}".lower()
#     for keyword, category in CATEGORY_KEYWORDS.items():
#         if keyword in source:
#             return category
#     return "Other"


# def _normalize_amount(raw_amount: Any) -> float:
#     if raw_amount is None:
#         return 0.0
#     if isinstance(raw_amount, (int, float)):
#         return float(raw_amount)
#     cleaned = re.sub(r"[^0-9.\-]", "", str(raw_amount))
#     if not cleaned or cleaned in {"-", ".", "-."}:
#         return 0.0
#     try:
#         return float(cleaned)
#     except ValueError:
#         return 0.0


# def _normalize_transaction(raw_item: dict[str, Any], transaction_id: int) -> dict[str, Any]:
#     merchant = str(
#         raw_item.get("merchant")
#         or raw_item.get("narration")
#         or raw_item.get("description")
#         or raw_item.get("payee")
#         or raw_item.get("particulars")
#         or "Unknown"
#     ).strip() or "Unknown"
#     note = str(raw_item.get("note") or raw_item.get("description") or merchant).strip()
#     category = str(raw_item.get("category") or _infer_category(merchant, note)).strip() or "Other"

#     raw_type = str(raw_item.get("type") or "").lower().strip()
#     debit_value = _normalize_amount(raw_item.get("debit"))
#     credit_value = _normalize_amount(raw_item.get("credit"))
#     amount_value = _normalize_amount(raw_item.get("amount"))

#     if raw_type not in {"credit", "debit"}:
#         if credit_value > 0 and debit_value <= 0:
#             raw_type = "credit"
#         elif debit_value > 0 and credit_value <= 0:
#             raw_type = "debit"
#         elif amount_value < 0:
#             raw_type = "debit"
#         elif amount_value > 0:
#             raw_type = "credit"
#         else:
#             raw_type = "debit"

#     if raw_type == "credit":
#         signed_amount = abs(credit_value or amount_value)
#         debit_value = 0.0
#         credit_value = abs(credit_value or amount_value)
#     else:
#         signed_amount = -abs(debit_value or amount_value)
#         debit_value = abs(debit_value or amount_value)
#         credit_value = 0.0

#     return {
#         "id": transaction_id,
#         "date": _normalize_date(str(raw_item.get("date") or raw_item.get("transaction_date") or raw_item.get("posted_date") or "")),
#         "merchant": merchant,
#         "narration": merchant,
#         "category": category,
#         "amount": round(signed_amount, 2),
#         "debit": round(debit_value, 2),
#         "credit": round(credit_value, 2),
#         "balance": round(_normalize_amount(raw_item.get("balance")), 2),
#         "type": raw_type,
#         "note": note,
#         "unusual": bool(raw_item.get("unusual", False)),
#     }


# def _compute_summary(transactions: list[dict[str, Any]]) -> dict[str, Any]:
#     total_income = round(sum(item["amount"] for item in transactions if item["type"] == "credit"), 2)
#     total_expense = round(sum(abs(item["amount"]) for item in transactions if item["type"] == "debit"), 2)
#     net_savings = round(total_income - total_expense, 2)
#     savings_rate = round((net_savings / total_income) * 100) if total_income > 0 else 0
#     category_breakdown: dict[str, float] = defaultdict(float)
#     for item in transactions:
#         if item["type"] == "debit":
#             category_breakdown[item["category"]] += abs(item["amount"])
#     top_category = max(category_breakdown.items(), key=lambda entry: entry[1])[0] if category_breakdown else "N/A"
#     return {
#         "total_income": total_income,
#         "total_expense": total_expense,
#         "net_savings": net_savings,
#         "savings_rate": savings_rate,
#         "top_spending_category": top_category,
#         "transaction_count": len(transactions),
#         "category_breakdown": {key: round(value, 2) for key, value in category_breakdown.items()},
#     }


# def _mark_unusual(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
#     debit_values = [abs(item["amount"]) for item in transactions if item["type"] == "debit"]
#     median_debit = sorted(debit_values)[len(debit_values) // 2] if debit_values else 0
#     threshold = max(10000.0, median_debit * 3 if median_debit else 10000.0)

#     for item in transactions:
#         if item["type"] == "debit" and (abs(item["amount"]) >= threshold or abs(item["amount"]) >= 0.15 * max(sum(debit_values), 1)):
#             item["unusual"] = True

#     return transactions


# def _build_recurring(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
#     grouped: dict[tuple[str, str], list[float]] = defaultdict(list)
#     for item in transactions:
#         if item["type"] != "debit":
#             continue
#         key = (item["merchant"].lower(), item["category"])
#         grouped[key].append(abs(item["amount"]))

#     recurring = []
#     for (merchant, category), amounts in grouped.items():
#         if len(amounts) < 2:
#             continue
#         recurring.append({
#             "name": merchant.title(),
#             "count": len(amounts),
#             "avg_amount": round(sum(amounts) / len(amounts), 2),
#             "category": category,
#         })

#     recurring.sort(key=lambda item: (-item["count"], item["name"]))
#     return recurring


# def _build_monthly_trend(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
#     monthly: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
#     for item in transactions:
#         month = item["date"][:7]
#         if item["type"] == "credit":
#             monthly[month]["income"] += item["amount"]
#         else:
#             monthly[month]["expense"] += abs(item["amount"])

#     return [
#         {
#             "month": month,
#             "income": round(values["income"], 2),
#             "expense": round(values["expense"], 2),
#         }
#         for month, values in sorted(monthly.items())
#     ]


# def _build_ai_summary(summary: dict[str, Any], recurring: list[dict[str, Any]], unusual: list[dict[str, Any]]) -> dict[str, Any]:
#     health_score = 82
#     if summary["savings_rate"] < 0:
#         health_score -= 20
#     elif summary["savings_rate"] < 20:
#         health_score -= 8
#     if unusual:
#         health_score -= min(12, len(unusual) * 3)
#     health_score = max(0, min(100, health_score))

#     observations = [
#         f"Processed {summary['transaction_count']} transactions.",
#         f"Highest spending category: {summary['top_spending_category']}.",
#     ]
#     if recurring:
#         observations.append(f"Detected {len(recurring)} recurring merchant(s).")
#     if unusual:
#         observations.append(f"Flagged {len(unusual)} unusual debit transaction(s).")

#     recommendations = [
#         "Review high-value debits and subscriptions.",
#         "Set alerts for unusual spending spikes.",
#     ]
#     if summary["savings_rate"] < 20:
#         recommendations.insert(0, "Reduce discretionary spending to improve savings rate.")

#     return {
#         "overview": (
#             f"OCR extracted {summary['transaction_count']} transactions. "
#             f"Net savings are ₹{abs(summary['net_savings']):,.0f} and spending is led by {summary['top_spending_category']}."
#         ),
#         "observations": observations,
#         "recommendations": recommendations,
#         "health_score": health_score,
#         "health_score_reason": "Computed from savings rate, recurring spend, and unusual transactions.",
#     }


# async def _read_upload_file(upload_file: UploadFile) -> tuple[str, bytes, str]:
#     file_bytes = await upload_file.read()
#     mime_type = _guess_mime_type(upload_file.filename, upload_file.content_type)
#     return upload_file.filename or "statement", file_bytes, mime_type


# def _analyze_file_bytes(file_bytes: bytes, filename: str, mime_type: str) -> list[dict[str, Any]]:
#     prompt = (
#         "You are an OCR engine and bank statement parser. Extract every transaction from the uploaded statement. "
#         "Return only valid JSON with this exact shape: {\"transactions\": [{\"date\": \"YYYY-MM-DD\", \"merchant\": \"string\", \"category\": \"string\", "
#         "\"amount\": number, \"type\": \"credit\" | \"debit\", \"note\": \"string\", \"unusual\": boolean}]}. "
#         "Use amount as a positive number in the JSON. Set type to credit for money in and debit for money out. "
#         "If category is unclear, choose one of: Food, Coffee, Transport, Shopping, Utilities, Health, Travel, Education, Salary, Freelance, Rent, Internet, Groceries, Entertainment, Other. "
#         "If the statement has running balances, include them when visible; otherwise omit balance."
#     )
#     parsed = _invoke_gemini(prompt, file_bytes, mime_type)
#     transactions: list[dict[str, Any]] = []
#     for item in parsed.get("transactions", []):
#         if isinstance(item, dict):
#             transactions.append(item)
#     return transactions


# async def analyze_statement_files(upload_files: list[UploadFile]) -> dict[str, Any]:
#     if not upload_files:
#         raise ValueError("Please upload at least one statement file.")

#     extracted_transactions: list[dict[str, Any]] = []
#     uploaded_files: list[dict[str, Any]] = []

#     for upload_file in upload_files:
#         filename, file_bytes, mime_type = await _read_upload_file(upload_file)
#         uploaded_files.append({"name": filename, "size": len(file_bytes), "type": mime_type})

#         extracted_transactions.extend(_analyze_file_bytes(file_bytes, filename, mime_type))

#     normalized_transactions = [
#         _normalize_transaction(item, index + 1)
#         for index, item in enumerate(extracted_transactions)
#     ]
#     normalized_transactions.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
#     for index, item in enumerate(normalized_transactions, start=1):
#         item["id"] = index

#     normalized_transactions = _mark_unusual(normalized_transactions)
#     summary = _compute_summary(normalized_transactions)
#     recurring = _build_recurring(normalized_transactions)
#     unusual = [item for item in normalized_transactions if item["unusual"]]
#     monthly_trend = _build_monthly_trend(normalized_transactions)
#     ai_summary = _build_ai_summary(summary, recurring, unusual)

#     return {
#         "uploaded_at": datetime.utcnow().isoformat(),
#         "files": uploaded_files,
#         "summary": summary,
#         "transactions": normalized_transactions,
#         "recurring": recurring,
#         "unusual": unusual,
#         "ai_summary": ai_summary,
#         "monthly_trend": monthly_trend,
#     }


# async def analyze_statement(file_bytes: bytes, filename: str | None = None, content_type: str | None = None) -> dict[str, Any]:
#     mime_type = _guess_mime_type(filename, content_type)
#     transactions = _analyze_file_bytes(file_bytes, filename or "statement", mime_type)
#     normalized_transactions = [
#         _normalize_transaction(item, index + 1)
#         for index, item in enumerate(transactions)
#     ]
#     normalized_transactions.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
#     for index, item in enumerate(normalized_transactions, start=1):
#         item["id"] = index

#     normalized_transactions = _mark_unusual(normalized_transactions)
#     summary = _compute_summary(normalized_transactions)
#     recurring = _build_recurring(normalized_transactions)
#     unusual = [item for item in normalized_transactions if item["unusual"]]
#     monthly_trend = _build_monthly_trend(normalized_transactions)
#     ai_summary = _build_ai_summary(summary, recurring, unusual)

#     return {
#         "uploaded_at": datetime.utcnow().isoformat(),
#         "files": [{"name": filename or "statement", "size": len(file_bytes), "type": mime_type}],
#         "summary": summary,
#         "transactions": normalized_transactions,
#         "recurring": recurring,
#         "unusual": unusual,
#         "ai_summary": ai_summary,
#         "monthly_trend": monthly_trend,
#     }
