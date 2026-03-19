# Ollama Python API

A self-hosted API gateway for [Ollama](https://ollama.com) with API key authentication, per-tier rate limiting, usage tracking, and a real-time monitoring dashboard.

## Architecture

```text
┌─────────────────────┐         ┌──────────────────┐
│   Next.js Dashboard │         │   FastAPI Server  │
│   (Vercel)          │────────▶│   (your machine)  │
│                     │         │        │          │
│  - Auth0 login      │         │        ▼          │
│  - API key mgmt     │         │   ┌────────┐     │
│  - Usage stats      │         │   │ Ollama │     │
│  - Server health    │         │   └────────┘     │
└────────┬────────────┘         └────────┬─────────┘
         │                               │
         ▼                               ▼
    ┌─────────┐                    ┌─────────┐
    │ Neon DB │◀───────────────────│ Neon DB │
    │ (read)  │                    │ (write) │
    └─────────┘                    └─────────┘
```

- **API Server** (`main.py`) — runs on your machine / VPS. Proxies requests to Ollama, authenticates API keys, enforces rate limits, logs usage.
- **Dashboard** (`dashboard/`) — deployed to Vercel (free). Web UI for sign-in, API key management, usage stats, and server monitoring.
- **Database** — Neon Postgres (free tier). Persists API keys and usage logs.

## Access Tiers

|               | Anonymous    | Member (free)              |
| ------------- | ------------ | -------------------------- |
| Auth          | None         | `x-api-key` header         |
| Rate limit    | 10 req / 60s | 30 req / 60s               |
| Usage tracked | By IP        | By user ID                 |
| API keys      | N/A          | Create/revoke in dashboard |

## Quick Start

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Ollama](https://ollama.com) running locally
- A [Neon](https://neon.tech) Postgres database (free tier)

### 1. API Server

```bash
# Clone and install
git clone <repo-url>
cd ollama-python-api
uv sync

# Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and settings

# Run
uv run uvicorn main:app --reload
```

The server auto-creates the database tables (`api_keys`, `usage_logs`) on first startup.

### 2. Dashboard

```bash
cd dashboard
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Auth0, DATABASE_URL, and OLLAMA_API_URL

# Dev
npm run dev

# Deploy to Vercel
vercel
```

## API Server Endpoints

### Chat

```bash
# Anonymous (rate limited to 10 req/min)
curl "http://localhost:8000/chat?q=hello"

# With API key (rate limited to 30 req/min)
curl -H "x-api-key: oa-xxxxx" "http://localhost:8000/chat?q=hello"
```

### API Key Management

```bash
# Create a key
curl -X POST "http://localhost:8000/api/keys?user_id=USER_ID&name=my-key"

# List keys
curl "http://localhost:8000/api/keys?user_id=USER_ID"

# Revoke a key
curl -X DELETE "http://localhost:8000/api/keys/1?user_id=USER_ID"
```

### Monitoring

```bash
# Server status (system metrics, Ollama status, usage summary)
curl "http://localhost:8000/api/status"

# Usage logs
curl "http://localhost:8000/api/usage?limit=50"
curl "http://localhost:8000/api/usage?user_id=USER_ID&limit=20"
```

## Environment Variables

### API Server (`.env.local`)

| Variable             | Default                   | Description                      |
| -------------------- | ------------------------- | -------------------------------- |
| `DATABASE_URL`       | —                         | Neon Postgres connection string  |
| `OLLAMA_BASE`        | `http://localhost:11434`  | Ollama server URL                |
| `CORS_ORIGINS`       | `*`                       | Comma-separated allowed origins  |
| `ANON_RATE_LIMIT`    | `10`                      | Anonymous requests per window    |
| `MEMBER_RATE_LIMIT`  | `30`                      | Member requests per window       |
| `RATE_WINDOW`        | `60`                      | Rate limit window in seconds     |

### Dashboard (`dashboard/.env.local`)

| Variable              | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `DATABASE_URL`        | Neon Postgres connection string (same DB)             |
| `OLLAMA_API_URL`      | Your API server URL (e.g. `https://api.example.com`)  |
| `AUTH0_DOMAIN`        | Auth0 tenant domain                                   |
| `AUTH0_CLIENT_ID`     | Auth0 application client ID                           |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret                       |
| `AUTH0_SECRET`        | Random string for session encryption                  |
| `AUTH0_BASE_URL`      | Dashboard URL (e.g. `http://localhost:3000`)          |

## Database Schema

Tables are auto-created on API server startup:

```sql
-- API keys for authenticated users
api_keys (id, key, user_id, user_email, name, created_at, revoked)

-- Request logs for usage tracking
usage_logs (id, created_at, user_id, api_key_id, endpoint, model, duration_ms, client_ip)
```

## Tech Stack

- **API**: Python, FastAPI, psycopg, psutil
- **Dashboard**: Next.js, Tailwind CSS, Auth0, @neondatabase/serverless
- **Database**: Neon Postgres
- **Auth**: Auth0 (dashboard login), API keys (API access)
