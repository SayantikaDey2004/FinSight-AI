from __future__ import annotations

import re
from typing import Any


UNUSUAL_KEYWORDS = [
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


def compute_unusual_flag(item: dict[str, Any], *, debit_median: float, debit_total: float) -> bool:
    """Best-effort unusual debit flagger.

    This is a helper that can be reused by multiple services.

    Expected normalized transaction shape (from statement_service):
      - type: "debit" | "credit"
      - amount: signed float (debits are negative)
      - merchant, note, narration, category

    Returns:
      - True if the transaction looks unusual.

    Notes:
    - This is heuristic and intentionally lightweight.
    - The primary spike/median logic still lives in statement_service.
    """

    if str(item.get("type", "")).lower().strip() != "debit":
        return False

    amt = abs(float(item.get("amount") or 0.0))

    # Spike vs median (rough)
    threshold = max(10000.0, debit_median * 3 if debit_median else 10000.0)
    if amt >= threshold:
        return True

    # Large share of total debits
    share_of_debits = (amt / debit_total) if debit_total > 0 else 0.0
    if share_of_debits >= 0.15:
        return True

    # Keyword / semantic risk hints
    note_blob = f"{item.get('merchant','')} {item.get('note','')} {item.get('narration','')} {item.get('category','')}".lower()
    if any(k in note_blob for k in UNUSUAL_KEYWORDS):
        return True

    return False


def normalize_text_blob(*parts: str) -> str:
    blob = " ".join(p or "" for p in parts)
    blob = blob.lower().strip()
    blob = re.sub(r"\s+", " ", blob)
    return blob

