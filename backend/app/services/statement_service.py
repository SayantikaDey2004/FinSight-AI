"""Statement analysis service.

This module is the API-facing entry point.

The actual implementation lives in `app.utils.dashboard`.
Keeping this layer thin ensures the app routes stay stable while the
analysis pipeline can evolve.
"""

from __future__ import annotations

from typing import Any, Dict

from app.utils.dashboard import analyze_statement as _analyze_statement


def analyze_statement(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Analyze a bank statement.

    Delegates to `app.utils.dashboard.analyze_statement`.

    Returns:
        Dict with keys:
          - summary
          - transactions
          - recurring
          - unusual
          - ai_summary
          - monthly_trend
    """

    result = _analyze_statement(file_bytes=file_bytes, filename=filename)

    # Backward/route contract safety: ensure required keys exist.
    result.setdefault("summary", {})
    result.setdefault("transactions", [])
    result.setdefault("recurring", [])
    result.setdefault("unusual", [])
    result.setdefault("ai_summary", {})
    result.setdefault("monthly_trend", [])
    return result


