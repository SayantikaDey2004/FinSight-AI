<div align="center">

# 🏦 FinSight AI

### *Intelligent Bank Statement Analyser & Personal Finance Dashboard*

[![Built at CODEFLOW 2026](https://img.shields.io/badge/Built%20at-CODEFLOW%202026-6366f1?style=for-the-badge)](https://github.com)
[![Team ThinkQ](https://img.shields.io/badge/Team-ThinkQ-22c55e?style=for-the-badge)](https://github.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)

> Upload your bank statement. Get AI-powered financial insights in seconds.

</div>

---

## 📌 The Problem

Most people have no idea where their money goes. Bank statements are dense, unreadable PDFs — and manually categorising hundreds of transactions is tedious, error-prone, and nobody does it. Traditional budgeting apps require manual entry or paid bank integrations.

**FinSight AI changes that.** Drop in your PDF bank statement, and our pipeline extracts, categorises, and analyses every transaction — then serves it through a beautiful dashboard with AI-generated insights.

---

## 📸 Screenshots

<div align="center">

### 🏠 Landing Page
![Landing Page](assets/landing.jpeg)

### 📊 Financial Dashboard
![Dashboard](assets/dashboard.jpeg)

### 📄 Statement Upload
![Upload](assets/upload.jpeg)

### 💳 Transaction History
![Transactions](assets/transactions.jpeg)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **PDF / Image Upload** | Upload bank statements in PDF, PNG, JPG, or WEBP format |
| 🔍 **Gemini OCR Extraction** | Google Gemini 2.5 Flash reads and parses every transaction from raw documents |
| 🏷️ **Auto-Categorisation** | 30+ keyword rules map transactions to categories — Food, Transport, Rent, UPI Transfers, Subscriptions, EMIs, and more |
| 📊 **Financial Dashboard** | Summary cards, income vs expense charts, category breakdown, health score |
| 🔄 **Recurring Detection** | Identifies merchants that appear multiple times (subscriptions, EMIs, rent) |
| ⚠️ **Anomaly Flagging** | Statistical outlier detection flags unusual high-value debits automatically |
| 🤖 **AI Summary** | Rule-based financial health report with observations and personalised recommendations |
| 🔐 **Auth System** | JWT-based signup, login, logout with bcrypt password hashing |
| 👤 **User Profiles** | Per-user statement storage in MongoDB — your data stays yours |
| 📱 **Responsive UI** | Fully responsive React frontend with Tailwind CSS and Framer Motion animations |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                 │
│                                                             │
│   Landing → Auth → Upload Statement → Dashboard             │
│              ↕               ↕              ↕               │
│           authApi.ts   statementApi.ts  dashboardApi.ts     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼──────────────────────────────────┐
│                     FastAPI Backend                          │
│                                                             │
│  /api/v1/auth/*      /api/v1/statements/*   /api/v1/dash/*  │
│        │                     │                    │          │
│   JWT + bcrypt        statement_service.py    dashboard      │
│   MongoDB users              │                endpoint       │
│                    ┌─────────▼──────────┐                   │
│                    │   Gemini 2.5 Flash  │                   │
│                    │   (OCR + Parsing)   │                   │
│                    └─────────┬──────────┘                   │
│                              │                              │
│                    ┌─────────▼──────────┐                   │
│                    │  Analysis Pipeline  │                   │
│                    │  • Normalisation    │                   │
│                    │  • Categorisation   │                   │
│                    │  • Anomaly detect   │                   │
│                    │  • Monthly trends   │                   │
│                    │  • AI summary       │                   │
│                    └─────────┬──────────┘                   │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     MongoDB Atlas                            │
│          users collection │ statement_analyses collection    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework with auto Swagger docs |
| **Python 3.12** | Core language |
| **Google Gemini 2.5 Flash** | PDF OCR and transaction extraction |
| **MongoDB Atlas + PyMongo** | User data and statement storage |
| **bcrypt** | Password hashing |
| **PyJWT** | JWT token auth |
| **python-dotenv** | Environment config |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript 6** | Type safety |
| **Vite 8** | Build tool and dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **React Router 7** | Client-side routing |
| **Lucide React** | Icon library |

---

## 📁 Project Structure

```
FinSightAI/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, all routes, CORS
│   │   ├── db/
│   │   │   └── database.py            # MongoDB operations
│   │   ├── models/
│   │   │   └── pydantic_models.py     # Request/response schemas with validation
│   │   ├── services/
│   │   │   └── statement_service.py   # Core analysis pipeline
│   │   └── routes/
│   │       └── statement_routes.py    # Statement endpoints
│   ├── modules/
│   │   ├── token.py                   # JWT create/decode
│   │   ├── hashed_password.py         # bcrypt helpers
│   │   └── send_email.py              # Email utilities
│   ├── requirements.txt
│   └── .env                           # ← not committed
│
└── Frontend/FinSightAI/
    ├── src/
    │   ├── pages/
    │   │   ├── landing.page.tsx        # Home / hero page
    │   │   ├── signUp.page.tsx         # Registration
    │   │   ├── logIn.page.tsx          # Login
    │   │   ├── dashboard.page.tsx      # Main financial dashboard
    │   │   ├── dataUpload.page.tsx     # Statement upload flow
    │   │   ├── transactions.page.tsx   # Full transaction table
    │   │   ├── profile.page.tsx        # User profile
    │   │   ├── forgotPassword.page.tsx
    │   │   └── resetPassword.page.tsx
    │   ├── services/
    │   │   ├── authApi.ts              # Auth API calls + token storage
    │   │   ├── statementApi.ts         # Upload and fetch statements
    │   │   └── dashboardApi.ts         # Dashboard data fetching
    │   ├── routes/
    │   │   └── router.tsx              # React Router config
    │   ├── lib/
    │   │   └── transactionStore.ts     # Client-side transaction state
    │   └── components/
    │       └── AuthShell.tsx           # Protected route wrapper
    ├── package.json
    └── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Google AI Studio API key (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### 1. Clone the repository

```bash
git clone https://github.com/your-team/finsightai.git
cd finsightai
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
# MongoDB
mongo_url=mongodb+srv://<user>:<password>@cluster.mongodb.net/
data_base=fintech_auth

# JWT
Secret_key=your-super-secret-key-min-32-chars
algorithm=HS256

# Gemini AI
GEMINI_API_KEY=AIzaSy...your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at **http://localhost:8000/docs**

### 3. Frontend setup

```bash
cd Frontend/FinSightAI
npm install
```

Create a `.env` file in `Frontend/FinSightAI/`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Start the frontend:

```bash
npm run dev
```

App available at **http://localhost:5173**

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/signup` | Register a new user | ❌ |
| `POST` | `/api/v1/auth/login` | Login, returns JWT | ❌ |
| `GET` | `/api/v1/auth/me` | Get current user profile | ✅ |
| `POST` | `/api/v1/auth/logout` | Logout (client-side token discard) | ✅ |

### Statements

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/statements/upload` | Upload PDF/image, returns full analysis | Optional |
| `GET` | `/api/v1/statements/latest` | Get most recent analysis for user | Optional |

### Dashboard

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Full dashboard payload | Optional |

### Statement Upload Response Shape

```json
{
  "summary": {
    "total_income": 110986.83,
    "total_expense": 94837.37,
    "net_savings": 16149.46,
    "savings_rate": 14,
    "top_spending_category": "ATM Withdrawal",
    "transaction_count": 42,
    "category_breakdown": { "ATM Withdrawal": 18500, "Shopping": 17599 }
  },
  "transactions": [...],
  "recurring": [...],
  "unusual": [...],
  "monthly_trend": [...],
  "ai_summary": {
    "overview": "...",
    "observations": ["..."],
    "recommendations": ["..."],
    "health_score": 68,
    "health_score_reason": "..."
  }
}
```

---

## 🧠 How the Analysis Pipeline Works

```
PDF Upload
    │
    ▼
Gemini 2.5 Flash OCR
    │  Extracts raw rows: date, narration, debit, credit, balance
    ▼
Transaction Normalisation
    │  Cleans amounts, parses dates (10+ formats), extracts merchant names
    │  from UPI strings like "UPI/REF/MERCHANT@VPA/..."
    ▼
Categorisation Engine
    │  30+ keyword rules across 18 categories
    │  Falls back to "Other" for unknown merchants
    ▼
Anomaly Detection
    │  Computes median debit amount
    │  Flags transactions > 3× median or > 50% of max debit
    │  Minimum threshold: ₹5,000
    ▼
Recurring Payment Detection
    │  Groups transactions by merchant + category
    │  Marks merchants appearing 2+ times as recurring
    ▼
Monthly Trend Aggregation
    │  Buckets income/expense by YYYY-MM
    ▼
Financial Health Scoring
    │  Base 75 + savings rate bonus/penalty + unusual penalty
    │  Clamped to 0–100
    ▼
AI Summary Generation
    │  Rule-based observations + personalised recommendations
    ▼
Stored in MongoDB → Served to Dashboard
```

---

## 📊 Supported Transaction Categories

| Category | Keywords Detected |
|---|---|
| 🍔 Food & Dining | swiggy, zomato, restaurant, hotel, cafe |
| 🚗 Transport | uber, ola, rapido, metro, irctc, fuel, fasttag |
| 🏧 ATM Withdrawal | atm withdrawal |
| 🛍️ Shopping | amazon, flipkart, myntra, lifestyle, purchase |
| 🛒 Groceries | bigbasket, blinkit, zepto, grofer |
| ⚡ Utilities | tneb, bescom, billdesk, electricity, water |
| 📱 Internet & Mobile | airtel, jio, vodafone, recharge, prepaid |
| 🎬 Entertainment | pvr, inox, bookmyshow, cinema |
| 📺 Subscriptions | netflix, spotify, hotstar, prime, google |
| 🏥 Healthcare | apollo, pharmacy, hospital, 1mg, gym |
| ✈️ Travel | indigo, irctc, makemytrip, oyo, ixigo |
| 🎓 Education | udemy, byju, coursera, tuition |
| 💸 UPI Transfer | paytm, phonepe, gpay, amazonpay |
| 🏦 Bank Transfer | neft, imps, rtgs |
| 🏠 Rent | rent, housing, society, maintenance |
| 🛡️ Insurance | lic, insurance, premium |
| 💹 Investment | mutual fund, sip, zerodha, groww |
| 🏦 Bank Charges | cgst, sgst, charges, penalty |

---

## 🔐 Security Notes

- Passwords are hashed with **bcrypt** before storage — raw passwords never touch the database
- JWT tokens expire in **7 days** with HS256 signing
- CORS is restricted to localhost origins in development
- MongoDB credentials and API keys are environment-variable only — never hardcoded
- Statement analyses are stored per-user via JWT identity

---

## 👥 Team ThinkQ — CODEFLOW 2026

Built in 24 hours at **CODEFLOW 2026** — an intercollegiate hackathon.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ☕ and zero sleep by Team ThinkQ**

*If this helped you, give it a ⭐ on GitHub!*

</div>
