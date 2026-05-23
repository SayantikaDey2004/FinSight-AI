from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config.settings import settings


# This client is shared across the whole app (one connection pool)
client: AsyncIOMotorClient = None


async def connect_db():
    """Called once on app startup."""
    global client
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    # Import models here to avoid circular imports
    from app.models.user import User

    await init_beanie(database=db, document_models=[User])
    print(f"✅ Connected to MongoDB: {settings.MONGO_DB_NAME}")


async def disconnect_db():
    """Called once on app shutdown."""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")