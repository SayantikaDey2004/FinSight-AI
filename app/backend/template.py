from pathlib import Path
import os

file_names=[
    "backend/app/routes/statement_routes.py",
    "backend/app/controllers/statement_controller.py",
    "backend/app/services/parser_service.py",
    "backend/app/services/categorization_service.py",
    "backend/app/services/analysis_service.py",
    "backend/app/services/ai_summary_service.py",
    "backend/app/services/anomaly_service.py",
    "backend/app/db/database.py",
    "backend/app/models/transaction_model.py",
    "backend/app/main.py",
    "backend/.env",
    "backend/requirements.txt",
    "backend/logger.py",
    "backend/modules/send_email.py",
    "backend/modules/hashed_password.py",
    "backend/modules/create_token.py"
]

for file in file_names:
    file_name=Path(file)

    file_dir,file_path=os.path.split(file_name)

    if file_dir!="":
        os.makedirs(file_dir,exist_ok=True)
    if not os.path.exists(file_name) or os.path.getsize(file_name)==0:
        with open(file_name,"w") as f:
            pass