from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv
from modules.hashed_password import create_hashed_password

load_dotenv()
client = MongoClient(os.getenv("mongo_url"))
db = client[os.getenv("data_base")]
collection = db["user"]
statement_collection = db["statement_analyses"]

statement_collection.create_index("user_id", unique=True, sparse=True)


def _transaction_count(analysis: dict | None) -> int:
    if not isinstance(analysis, dict):
        return 0

    transactions = analysis.get("transactions", []) or []
    try:
        return len(transactions)
    except Exception:
        return 0


def insert_data(user: dict):
    exist = collection.find_one({"email": user["email"]})
    if exist:
        return {"data": "exist"}
    else:
        res=collection.insert_one(user)
        print(res.inserted_id)
        return {"data": "inserted"}

def get_data(email: str):
    data = collection.find_one({"email": email})
    if data:
        return data
    else:
        return None

def delete_data(email: str):
    result = collection.delete_one({"email": email})
    if result.deleted_count > 0:
        return {"data": "deleted"}
    else:
        return {"data": "not exists"}

def update_password(email: str, new_password: str):
    result = collection.update_one(
        {"email": email},
        {"$set": {"password": new_password}}
    )
    if result.matched_count > 0:
        return {"data": "password updated"}
    else:
        return {"data": "not exists"}


def save_statement_analysis(user_id: str, analysis: dict):
    existing = statement_collection.find_one({"user_id": user_id})
    incoming_count = _transaction_count(analysis)

    if existing and incoming_count == 0 and _transaction_count(existing) > 0:
        print(f"[db] save_statement_analysis: preserving existing analysis for user_id={user_id} because incoming analysis is empty")
        return existing

    payload = {
        **analysis,
        "user_id": user_id,
        "updated_at": datetime.utcnow(),
    }

    print(f"[db] save_statement_analysis: user_id={user_id} transactions={incoming_count}")

    statement_collection.update_one(
        {"user_id": user_id},
        {"$set": payload},
        upsert=True,
    )
    return payload


def get_latest_statement_analysis(user_id: str):
    return statement_collection.find_one(
        {"user_id": user_id},
        sort=[("updated_at", -1)],
    )
