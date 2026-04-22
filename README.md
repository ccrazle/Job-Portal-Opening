# Job Portal

An internal job-portal tool for **One Group** — post openings, manage candidate pipelines, and score resumes with AI.

---

## Architecture

```
job-portal/
├── backend/
│   ├── server.js          — Express API server (auth, store, resume scoring)
│   ├── db.js              — PostgreSQL pool wrapper (Supabase)
│   ├── mailer.js          — Nodemailer transporter + email templates
│   └── migrate-sqlite-to-pg.js  — One-shot SQLite → Postgres migration
├── frontend/
│   └── index.html         — Single-page application (Tailwind CSS)
├── docs/                  — Planning documents and design specs
├── Dockerfile
└── docker-compose.yml
```

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 20
- A [Supabase](https://supabase.com) project (Postgres)
- An [OpenRouter](https://openrouter.ai) API key (for resume scoring)

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, OPENROUTER_API_KEY, and optionally SMTP_*
```

### 3. Install & run

```bash
cd backend
npm install
npm start
```

Open `http://localhost:3000` — default login: `test123` / `123`.

---

## API Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns session token |
| POST | `/api/auth/logout` | ✓ | Invalidate session |
| GET | `/api/auth/me` | ✓ | Current user info |
| GET | `/api/store/:key` | ✓ | Read a store value |
| PUT | `/api/store/:key` | ✓ | Write a store value |
| DELETE | `/api/store/:key` | ✓ | Delete a store value |
| GET | `/api/store` | ✓ | List keys (supports `?prefix=`) |
| POST | `/api/store/bulk` | ✓ | Read multiple keys at once |
| POST | `/api/run-skill` | ✓ | Score resumes against a JD (PDF upload) |
| GET | `/health` | — | Health check |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase Postgres connection string |
| `OPENROUTER_API_KEY` | Yes | API key for resume scoring (DeepSeek via OpenRouter) |
| `PORT` | No | Server port (default: 3000) |
| `PGSSL` | No | Set to `disable` to turn off SSL for local Postgres |
| `PGPOOL_MAX` | No | Max DB pool connections (default: 10) |
| `APP_BASE_URL` | No | Public URL for email links (default: `http://localhost:PORT`) |
| `SMTP_HOST` | No | SMTP server (default: `smtp.gmail.com`) |
| `SMTP_PORT` | No | SMTP port (default: 465) |
| `SMTP_SECURE` | No | TLS (default: `true`) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From address (defaults to `SMTP_USER`) |

> Without `SMTP_USER`/`SMTP_PASS`, emails fall back to console logging.

---

## Docker

```bash
docker-compose up --build
```

Set `DATABASE_URL` and `OPENROUTER_API_KEY` in `docker-compose.yml` or via `.env`.

---

## Resume Scoring

`POST /api/run-skill` accepts:
- `resumes` — up to 50 PDF files (multipart/form-data)
- `jdText` — job description text
- `jobTitle` — optional job title
- `department` — optional department

Resumes are batched in groups of 5 and scored by DeepSeek v3 via OpenRouter. Responses are returned as a ranked JSON array with score, education check, experience gate, and remarks per candidate.

---

## Migration (SQLite → Postgres)

If migrating from the legacy SQLite version:

```bash
DATABASE_URL=postgres://... node backend/migrate-sqlite-to-pg.js [path/to/job_portal.db]
```
