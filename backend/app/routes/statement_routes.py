from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user   # ← ADD
from app.models.user import User                              # ← ADD

router = APIRouter(prefix="/statements", tags=["Statements"])

@router.post("/upload")
async def upload_statement(
    file: UploadFile,
    current_user: User = Depends(get_current_user)            # ← ADD to any route
):
    # current_user.id = the logged-in user's ID
    # you can use this to store statements per user
    ...