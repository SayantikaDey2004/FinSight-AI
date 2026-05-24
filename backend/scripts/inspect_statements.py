import sys
from pathlib import Path

# Ensure backend package is importable when run from workspace root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import database


if __name__ == '__main__':
    try:
        cursor = database.statement_collection.find({})
        for doc in cursor:
            print('---')
            print('user_id:', doc.get('user_id'))
            print('updated_at:', doc.get('updated_at'))
            print('transactions_count:', len(doc.get('transactions', []) or []))
            print('files:', [f.get('name') for f in doc.get('files', [])])
    except Exception as e:
        print('Error:', e)
