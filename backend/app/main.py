from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.db.database import connect_db, disconnect_db
from app.routes.statement_routes import router as statement_router
from app.routes.auth_routes import router as auth_route
# ── Rate Limiter setup ───────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# ── App initialization ───────────────────────────────────
app = FastAPI(
    title="FinSight Auth API",
    description="Authentication service for the AI-powered bank statement analyzer.",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI — visit http://localhost:8000/docs
    redoc_url="/redoc",
)

# ── Attach rate limiter ──────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — allow your frontend to talk to this API ───────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.CLIENT_URL,
        "http://localhost:3000",    # React dev server
        "http://localhost:5173",    # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle events ─────────────────────────────────────
@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

# ── Routes ───────────────────────────────────────────────
app.include_router(statement_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")

# ── Health check ─────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "auth"}

# ── Global error handler ─────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "detail": "Internal server error."},
    )


