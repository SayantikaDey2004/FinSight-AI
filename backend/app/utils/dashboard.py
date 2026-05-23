import pdfplumber
import pandas as pd
import re
import io
import json
from datetime import datetime
from collections import defaultdict
from anthropic import Anthropic
 
client = Anthropic()
 
# ─── Category Keywords ────────────────────────────────────────────────────────
CATEGORY_RULES = {
    "Salary":        ["salary", "sal credit", "payroll", "pay credit", "neft cr", "employer"],
    "Food":          ["zomato", "swiggy", "dominos", "mcdonalds", "pizza", "restaurant", "cafe", "starbucks", "blinkit", "dunzo", "instamart", "bigbasket", "grocer"],
    "Shopping":      ["amazon", "flipkart", "myntra", "ajio", "meesho", "snapdeal", "nykaa", "tatacliq", "reliance", "shoppers stop"],
    "Travel":        ["irctc", "makemytrip", "ola", "uber", "rapido", "yatra", "goibibo", "indigo", "air india", "redbus", "metro"],
    "Rent":          ["rent", "house rent", "pg payment", "accommodation"],
    "Subscriptions": ["netflix", "hotstar", "spotify", "prime", "youtube premium", "zee5", "jiocinema", "adobe", "linkedin"],
    "EMI":           ["emi", "loan emi", "home loan", "car loan", "personal loan", "bajaj", "hdfc emi", "icici emi"],
    "Utilities":     ["electricity", "bescom", "tata power", "gas", "water bill", "broadband", "jio", "airtel", "vodafone", "bsnl"],
    "Health":        ["pharmacy", "medplus", "apollo", "1mg", "netmeds", "hospital", "clinic", "diagnostic", "health"],
    "UPI Transfer":  ["upi", "phonepe", "googlepay", "gpay", "paytm", "bhim", "neft", "imps", "rtgs"],
    "ATM":           ["atm", "cash withdrawal", "atw"],
    "Investment":    ["mutual fund", "sip", "zerodha", "groww", "upstox", "equity", "stocks", "lic", "insurance premium"],
    "Education":     ["school fee", "college fee", "tuition", "udemy", "coursera", "byju", "unacademy"],
}
 
 
# ─── Categorization ───────────────────────────────────────────────────────────
def categorize(narration: str) -> str:
    narration_lower = narration.lower()
    for category, keywords in CATEGORY_RULES.items():
        if any(kw in narration_lower for kw in keywords):
            return category
    return "Others"
 
 
# ─── File Parsers ─────────────────────────────────────────────────────────────
def parse_pdf(file_bytes: bytes) -> pd.DataFrame:
    rows = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if row and len(row) >= 4:
                        rows.append(row)
 
    if not rows:
        raise ValueError("No tables found in PDF. Try uploading a CSV instead.")
 
    df = pd.DataFrame(rows)
 
    # Detect header row containing 'date' and 'debit'/'credit'
    header_idx = 0
    for i, row in df.iterrows():
        row_str = " ".join([str(c).lower() for c in row if c])
        if "date" in row_str and ("debit" in row_str or "credit" in row_str):
            header_idx = i
            break
 
    df.columns = df.iloc[header_idx]
    df = df.iloc[header_idx + 1:].reset_index(drop=True)
    df.columns = [str(c).strip().lower() if c else f"col_{i}" for i, c in enumerate(df.columns)]
    return df
 
 
def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception:
        df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin1")
    df.columns = [c.strip().lower() for c in df.columns]
    return df
 
 
# ─── Column Normalizer ────────────────────────────────────────────────────────
def normalize_df(df: pd.DataFrame) -> list[dict]:
    col_map = {}
    for col in df.columns:
        cl = col.lower()
        if any(x in cl for x in ["date", "txn date", "value date", "transaction date"]):
            col_map.setdefault("date", col)
        if any(x in cl for x in ["narr", "description", "particulars", "detail", "remarks"]):
            col_map.setdefault("narration", col)
        if any(x in cl for x in ["debit", "withdrawal", "dr"]):
            col_map.setdefault("debit", col)
        if any(x in cl for x in ["credit", "deposit", "cr"]):
            col_map.setdefault("credit", col)
        if any(x in cl for x in ["balance", "bal"]):
            col_map.setdefault("balance", col)
 
    def clean_amount(val) -> float:
        if pd.isna(val) or val == "" or val is None:
            return 0.0
        return float(re.sub(r"[^\d.]", "", str(val)) or 0)
 
    transactions = []
    for _, row in df.iterrows():
        date_val  = str(row.get(col_map.get("date", ""), "")).strip()
        narration = str(row.get(col_map.get("narration", ""), "")).strip()
        debit     = clean_amount(row.get(col_map.get("debit", ""), 0))
        credit    = clean_amount(row.get(col_map.get("credit", ""), 0))
        balance   = clean_amount(row.get(col_map.get("balance", ""), 0))
 
        if not narration or narration.lower() in ("nan", "none", ""):
            continue
 
        transactions.append({
            "date":     date_val,
            "narration": narration,
            "debit":    debit,
            "credit":   credit,
            "balance":  balance,
            "category": categorize(narration),
            "type":     "Credit" if credit > 0 else "Debit",
        })
    return transactions
 
 
# ─── Analysis Functions ───────────────────────────────────────────────────────
def detect_recurring(transactions: list[dict]) -> list[dict]:
    narr_map = defaultdict(list)
    for t in transactions:
        key = re.sub(r"\d+", "", t["narration"].lower()).strip()
        narr_map[key].append(t)
 
    recurring = []
    for key, txns in narr_map.items():
        if len(txns) >= 2:
            avg_amount = sum(t["debit"] + t["credit"] for t in txns) / len(txns)
            recurring.append({
                "name":       txns[0]["narration"][:60],
                "count":      len(txns),
                "avg_amount": round(avg_amount, 2),
                "category":   txns[0]["category"],
            })
    return sorted(recurring, key=lambda x: -x["count"])[:10]
 
 
def detect_unusual(transactions: list[dict]) -> list[dict]:
    debits = [t["debit"] for t in transactions if t["debit"] > 0]
    if not debits:
        return []
    mean      = sum(debits) / len(debits)
    variance  = sum((x - mean) ** 2 for x in debits) / len(debits)
    std       = variance ** 0.5
    threshold = mean + 2 * std
    unusual   = [t for t in transactions if t["debit"] > threshold]
    return sorted(unusual, key=lambda x: -x["debit"])[:8]
 
 
def compute_summary(transactions: list[dict]) -> dict:
    total_income  = sum(t["credit"] for t in transactions)
    total_expense = sum(t["debit"] for t in transactions)
    net_savings   = total_income - total_expense
    savings_rate  = (net_savings / total_income * 100) if total_income > 0 else 0
 
    category_expense = defaultdict(float)
    for t in transactions:
        if t["debit"] > 0:
            category_expense[t["category"]] += t["debit"]
 
    top_category = max(category_expense, key=category_expense.get) if category_expense else "N/A"
 
    return {
        "total_income":          round(total_income, 2),
        "total_expense":         round(total_expense, 2),
        "net_savings":           round(net_savings, 2),
        "savings_rate":          round(savings_rate, 1),
        "top_spending_category": top_category,
        "transaction_count":     len(transactions),
        "category_breakdown":    {k: round(v, 2) for k, v in sorted(category_expense.items(), key=lambda x: -x[1])},
    }
 
 
def compute_monthly_trend(transactions: list[dict]) -> list[dict]:
    monthly = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    DATE_FORMATS = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %b %Y", "%d-%b-%Y", "%d/%b/%Y"]
 
    for t in transactions:
        month = "Unknown"
        for fmt in DATE_FORMATS:
            try:
                month = datetime.strptime(t["date"], fmt).strftime("%b %Y")
                break
            except Exception:
                pass
        if t["credit"] > 0:
            monthly[month]["income"]  += t["credit"]
        if t["debit"] > 0:
            monthly[month]["expense"] += t["debit"]
 
    return [
        {"month": k, "income": round(v["income"], 2), "expense": round(v["expense"], 2)}
        for k, v in monthly.items()
        if k != "Unknown"
    ]
 
 
# ─── AI Summary ───────────────────────────────────────────────────────────────
def get_ai_summary(summary: dict, transactions: list[dict], recurring: list[dict]) -> dict:
    prompt = f"""
You are a personal finance advisor analyzing an Indian bank statement.
 
Summary:
- Total Income: ₹{summary['total_income']:,.2f}
- Total Expenses: ₹{summary['total_expense']:,.2f}
- Net Savings: ₹{summary['net_savings']:,.2f}
- Savings Rate: {summary['savings_rate']}%
- Top Spending Category: {summary['top_spending_category']}
- Category Breakdown: {json.dumps(summary['category_breakdown'])}
- Recurring Payments (top 5): {json.dumps(recurring[:5])}
- Sample Transactions: {json.dumps(transactions[:15])}
 
Please provide:
1. A concise financial health overview (2-3 sentences)
2. Key observations (3-4 bullet points)
3. Personalized recommendations (3-4 actionable tips)
4. A financial health score out of 100 with brief justification
 
Use Indian context (₹, UPI, SIPs, etc.). Be specific and actionable.
Respond ONLY with a JSON object — no markdown, no backticks — with keys:
  overview (str), observations (list[str]), recommendations (list[str]),
  health_score (int), health_score_reason (str)
"""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    raw   = response.content[0].text
    clean = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(clean)
    except Exception:
        return {
            "overview":           raw,
            "observations":       [],
            "recommendations":    [],
            "health_score":       0,
            "health_score_reason": "",
        }
 
 
# ─── Master Orchestrator ──────────────────────────────────────────────────────
def analyze_statement(file_bytes: bytes, filename: str) -> dict:
    """
    Entry point called by the API layer.
    Returns a fully assembled analysis dict ready for JSON serialization.
    """
    filename_lower = filename.lower()
 
    if filename_lower.endswith(".pdf"):
        df = parse_pdf(file_bytes)
    elif filename_lower.endswith(".csv"):
        df = parse_csv(file_bytes)
    else:
        raise ValueError("Only PDF or CSV files are supported.")
 
    transactions = normalize_df(df)
    if not transactions:
        raise ValueError("Could not extract any transactions. Check the file format.")
 
    summary       = compute_summary(transactions)
    recurring     = detect_recurring(transactions)
    unusual       = detect_unusual(transactions)
    monthly_trend = compute_monthly_trend(transactions)
 
    try:
        ai_summary = get_ai_summary(summary, transactions, recurring)
    except Exception as e:
        ai_summary = {
            "overview":           f"AI summary unavailable: {e}",
            "observations":       [],
            "recommendations":    [],
            "health_score":       0,
            "health_score_reason": "",
        }
 
    return {
        "summary":       summary,
        "transactions":  transactions,
        "recurring":     recurring,
        "unusual":       unusual,
        "ai_summary":    ai_summary,
        "monthly_trend": monthly_trend,
    }