from fastapi import APIRouter, Depends,UploadFile,File,HTTPException
from app.middleware.auth_middleware import get_current_user   
from app.models.user import User 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes.statement_routes import analyze_statement                             

router = APIRouter(prefix="/statements", tags=["Statements"])

@router.post("/upload")
async def upload_statement(
    file: UploadFile,
    current_user: User = Depends(get_current_user)            
):
    # current_user.id = the logged-in user's ID
    # you can use this to store statements per user
    ...
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Upload a bank statement (PDF or CSV) and receive full financial analysis.
 
    Returns:
    - summary         : income, expense, savings, category breakdown
    - transactions    : all parsed and categorized rows
    - recurring       : detected recurring payments
    - unusual         : statistical outlier transactions
    - ai_summary      : Claude-generated insights, score, recommendations
    - monthly_trend   : month-wise income vs expense
    """
    file_bytes = await file.read()
 
    try:
        result = analyze_statement(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
 
    return JSONResponse(content=result)