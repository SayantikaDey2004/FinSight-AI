from __future__ import annotations

import calendar
import datetime as dt
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class RecurringCandidate:
    merchant: str
    category: str
    amount: float
    dates: list[dt.date]


def _normalize_merchant(s: str) -> str:
    s = (s or "").strip().lower()
    # remove common punctuation / spacing noise
    s = re.sub(r"[\s\-_.]+", " ", s)
    return s


def _parse_month_anchor(d: dt.date) -> dt.date:
    # Anchor to first of month for stable cadence computations
    return dt.date(d.year, d.month, 1)


def _months_between(a: dt.date, b: dt.date) -> int:
    return (b.year - a.year) * 12 + (b.month - a.month)


def _best_monthly_spacing(month_anchors: list[dt.date]) -> tuple[float, int]:
    """Return (avg_months_gap, stdev_months_gap)"""
    if len(month_anchors) < 2:
        return (math.inf, math.inf)

    sorted_anchors = sorted(month_anchors)
    gaps = []
    for i in range(1, len(sorted_anchors)):
        gaps.append(_months_between(sorted_anchors[i - 1], sorted_anchors[i]))

    avg = sum(gaps) / len(gaps)
    if len(gaps) == 1:
        return (avg, 0)
    mean = avg
    var = sum((g - mean) ** 2 for g in gaps) / (len(gaps) - 1)
    return (avg, math.sqrt(var))


def _add_months(d: dt.date, months: int) -> dt.date:
    year = d.year + (d.month - 1 + months) // 12
    month = (d.month - 1 + months) % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return dt.date(year, month, day)


def _heuristic_next_due_date(last_date: dt.date, cadence_months: int) -> dt.date:
    return _add_months(last_date, max(1, cadence_months))


def _is_due(next_due: dt.date, now: dt.date, grace_days: int = 3) -> bool:
    return now >= (next_due - dt.timedelta(days=grace_days))


def _is_active(next_due: dt.date, now: dt.date, stale_months: int = 3) -> bool:
    # If last transaction was long ago, mark inactive.
    # We interpret this as: if next_due is older than stale_months cadence window => inactive.
    return now <= _add_months(next_due, stale_months)


def detect_recurring_payments(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Detect likely recurring payments.

    Input transactions are expected to contain:
      - type: "debit" | "credit"
      - merchant, category
      - amount (signed; debits are negative in this project's normalization)
      - date (ISO yyyy-mm-dd)

    Output items are compatible with the existing frontend's expected fields where possible:
      - name, date, amount, status, icon, color

    This function is intentionally heuristic (no external model).
    """

    debit_tx = [t for t in transactions if str(t.get("type", "")).lower() == "debit"]
    if not debit_tx:
        return []

    now = dt.datetime.utcnow().date()

    # Group by normalized merchant + category.
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for t in debit_tx:
        merchant = _normalize_merchant(str(t.get("merchant") or "Unknown"))
        category = str(t.get("category") or "Other").strip() or "Other"
        date_str = t.get("date")
        if not date_str:
            continue
        try:
            d = dt.date.fromisoformat(str(date_str)[:10])
        except ValueError:
            continue

        grouped[(merchant, category)].append(t | {"_parsed_date": d})

    results: list[dict[str, Any]] = []

    for (merchant_norm, category), items in grouped.items():
        if len(items) < 2:
            continue

        # If amounts vary too much, still allow but prefer consistency.
        amounts = [abs(float(i.get("amount") or 0.0)) for i in items]
        if not amounts:
            continue

        avg_amount = round(sum(amounts) / len(amounts), 2)
        # Use month anchors (first-of-month) for cadence checks.
        dates = sorted({i["_parsed_date"] for i in items})
        if len(dates) < 2:
            continue
        month_anchors = [_parse_month_anchor(d) for d in dates]

        avg_gap_months, stdev_gap_months = _best_monthly_spacing(month_anchors)

        # Heuristics:
        # - avg gap near 1 month => monthly recurring
        # - avg gap near 3 months => quarterly-ish
        # - allow loose stdev but require enough regularity
        plausible = (
            (0.6 <= avg_gap_months <= 1.6 and stdev_gap_months <= 1.2)
            or (2.0 <= avg_gap_months <= 4.0 and stdev_gap_months <= 1.8)
        )
        if not plausible:
            # Still include if same day-of-month behavior is strong.
            doms = [d.day for d in dates]
            if len(set(doms)) == 1:
                plausible = True

        if not plausible:
            continue

        # Estimate cadence_months as rounded avg_gap_months (bounded)
        cadence_months = int(round(avg_gap_months)) if math.isfinite(avg_gap_months) else 1
        cadence_months = max(1, min(6, cadence_months))

        last_date = max(dates)
        next_due = _heuristic_next_due_date(last_date, cadence_months)

        status = "due" if _is_due(next_due, now) else "active"
        # If it's clearly in the past for a long time, mark inactive.
        if not _is_active(next_due, now, stale_months=3):
            status = "inactive"

        # Best-effort display date: "5 Jun" style
        display_date = f"{next_due.day} {calendar.month_abbr[next_due.month]}"

        # Lightweight icon/color: keep existing frontend styling keys if used.
        color = "#38bdf8"  # default
        icon = "🔁"
        if category.lower() == "rent":
            color = "#38bdf8"
            icon = "🏠"
        elif "stream" in merchant_norm or category.lower() in {"entertainment"}:
            color = "#a78bfa"
            icon = "🎬"
        elif category.lower() in {"utilities", "internet"}:
            color = "#f59e0b"
            icon = "💡"
        elif category.lower() == "health":
            color = "#22c55e"
            icon = "🩺"

        # If the recurring payment amount is much larger than the group's typical amount,
        # treat it as "unusual" to help the UI highlight risk.
        # (This does NOT replace the existing backend unusual detection; it only adds extra context.)
        amounts_sorted = sorted(amounts)
        median_amount = amounts_sorted[len(amounts_sorted) // 2] if amounts_sorted else avg_amount
        unusual_flag = bool(median_amount > 0 and (avg_amount >= 1.5 * median_amount))

        results.append(
            {
                "name": merchant_norm.title() if merchant_norm else "Recurring",
                "date": display_date,
                "amount": avg_amount,
                "status": status,
                "icon": icon,
                "color": color,
                "category": category,
                "count": len(items),
                "avg_amount": avg_amount,
                "cadence_months": cadence_months,
                "next_due_date": next_due.isoformat(),
                "unusual": unusual_flag,
            }
        )

    # Sort: due first, then highest count
    status_rank = {"due": 0, "active": 1, "inactive": 2}
    results.sort(key=lambda r: (status_rank.get(r.get("status"), 9), -int(r.get("count", 0)), -float(r.get("avg_amount", 0.0))))

    return results

