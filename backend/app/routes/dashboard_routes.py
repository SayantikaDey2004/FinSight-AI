from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(current_user: User = Depends(get_current_user)):
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
        "monthlyData": [
            {"month": "Jan", "income": 0, "expense": 0},
            {"month": "Feb", "income": 0, "expense": 0},
            {"month": "Mar", "income": 0, "expense": 0},
            {"month": "Apr", "income": 0, "expense": 0},
            {"month": "May", "income": 0, "expense": 0},
            {"month": "Jun", "income": 0, "expense": 0},
        ],
        "categories": [],
        "recurring": [],
        "unusual": [],
        "aiInsights": [],
        "txList": [],
        "user": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
        },
    }