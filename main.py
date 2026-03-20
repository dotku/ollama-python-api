import os
import secrets
import time
import psutil
import psycopg
from collections import defaultdict
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
import requests

load_dotenv(".env.local")
load_dotenv()  # fallback to .env

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Rate limits per tier (requests per window)
ANON_RATE_LIMIT = int(os.getenv("ANON_RATE_LIMIT", "10"))
MEMBER_RATE_LIMIT = int(os.getenv("MEMBER_RATE_LIMIT", "30"))
RATE_WINDOW = int(os.getenv("RATE_WINDOW", "60"))  # seconds

# In-memory rate limit trackers
_anon_requests: dict[str, list[float]] = defaultdict(list)
_member_requests: dict[str, list[float]] = defaultdict(list)

_start_time = time.time()


def _get_db():
    return psycopg.connect(DATABASE_URL)


def _init_db():
    if not DATABASE_URL:
        return
    with _get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id          BIGSERIAL PRIMARY KEY,
                key         TEXT NOT NULL UNIQUE,
                user_id     TEXT NOT NULL,
                user_email  TEXT DEFAULT '',
                name        TEXT DEFAULT 'Default',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                revoked     BOOLEAN DEFAULT FALSE
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
                id          BIGSERIAL PRIMARY KEY,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                user_id     TEXT NOT NULL,
                api_key_id  BIGINT REFERENCES api_keys(id),
                endpoint    TEXT NOT NULL,
                model       TEXT DEFAULT '',
                duration_ms INTEGER DEFAULT 0,
                client_ip   TEXT DEFAULT ''
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
            ON usage_logs (created_at DESC)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id
            ON usage_logs (user_id)
        """)
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    yield
    _anon_requests.clear()
    _member_requests.clear()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth & Rate Limiting ---

def _check_rate_limit(tracker: dict, key: str, limit: int):
    now = time.time()
    window_start = now - RATE_WINDOW
    tracker[key] = [t for t in tracker[key] if t > window_start]
    if len(tracker[key]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded ({limit} req / {RATE_WINDOW}s).",
        )
    tracker[key].append(now)


def _validate_api_key(api_key: str) -> dict | None:
    if not DATABASE_URL:
        return None
    with _get_db() as conn:
        row = conn.execute(
            "SELECT id, user_id, user_email, name FROM api_keys WHERE key = %s AND revoked = FALSE",
            (api_key,),
        ).fetchone()
    if not row:
        return None
    return {"id": row[0], "user_id": row[1], "email": row[2], "name": row[3]}


def _extract_api_key(
    x_api_key: str | None = Header(None),
    authorization: str | None = Header(None),
) -> str | None:
    """Extract API key from X-API-Key header or Authorization: Bearer header."""
    if x_api_key:
        return x_api_key
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


def get_current_user(
    request: Request,
    api_key: str | None = Depends(_extract_api_key),
) -> dict:
    """Resolve user from API key or treat as anonymous."""
    if api_key:
        key_info = _validate_api_key(api_key)
        if not key_info:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key")
        _check_rate_limit(_member_requests, key_info["user_id"], MEMBER_RATE_LIMIT)
        return {"tier": "member", "user_id": key_info["user_id"], "api_key_id": key_info["id"], "email": key_info["email"]}

    # Anonymous
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(_anon_requests, client_ip, ANON_RATE_LIMIT)
    return {"tier": "anonymous", "user_id": "anonymous", "api_key_id": None, "email": ""}


def _log_request(user: dict, endpoint: str, model: str = "", duration: float = 0, client_ip: str = ""):
    if not DATABASE_URL:
        return
    with _get_db() as conn:
        conn.execute(
            "INSERT INTO usage_logs (user_id, api_key_id, endpoint, model, duration_ms, client_ip) VALUES (%s, %s, %s, %s, %s, %s)",
            (user["user_id"], user["api_key_id"], endpoint, model, round(duration * 1000), client_ip),
        )
        conn.commit()


# --- Chat API ---

@app.get("/")
def root():
    return {"status": "ok"}


class ChatRequest(BaseModel):
    message: str
    model: str = "smollm:latest"


@app.post("/chat")
def chat(body: ChatRequest, request: Request, user: dict = Depends(get_current_user)):
    start = time.time()
    r = requests.post(
        f"{OLLAMA_BASE}/api/generate",
        json={"model": body.model, "prompt": body.message, "stream": False},
    )
    duration = time.time() - start
    result = r.json()

    client_ip = request.client.host if request.client else ""
    _log_request(user, "/chat", body.model, duration, client_ip)

    return {"user": user["user_id"], "tier": user["tier"], "response": result}


# --- API Key Management (called by dashboard) ---

@app.post("/api/keys")
def create_api_key(user_id: str = "", user_email: str = "", name: str = "Default"):
    """Create a new API key for a user. Called by the dashboard after Auth0 login."""
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    key = f"oa-{secrets.token_urlsafe(32)}"
    with _get_db() as conn:
        conn.execute(
            "INSERT INTO api_keys (key, user_id, user_email, name) VALUES (%s, %s, %s, %s)",
            (key, user_id, user_email, name),
        )
        conn.commit()
    return {"key": key, "name": name}


@app.get("/api/keys")
def list_api_keys(user_id: str):
    """List API keys for a user (excludes the actual key value for security)."""
    if not DATABASE_URL:
        return {"keys": []}
    with _get_db() as conn:
        rows = conn.execute(
            "SELECT id, LEFT(key, 7) || '...' as key_preview, name, created_at, revoked FROM api_keys WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return {
        "keys": [
            {"id": r[0], "key_preview": r[1], "name": r[2], "created_at": r[3].isoformat(), "revoked": r[4]}
            for r in rows
        ]
    }


@app.delete("/api/keys/{key_id}")
def revoke_api_key(key_id: int, user_id: str):
    """Revoke an API key."""
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    with _get_db() as conn:
        result = conn.execute(
            "UPDATE api_keys SET revoked = TRUE WHERE id = %s AND user_id = %s AND revoked = FALSE",
            (key_id, user_id),
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Key not found or already revoked")
    return {"status": "revoked"}


# --- Status & Usage API ---

@app.get("/api/status")
def api_status():
    mem = psutil.virtual_memory()
    uptime = time.time() - _start_time

    ollama_ok = False
    ollama_models = []
    try:
        r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=3)
        if r.ok:
            ollama_ok = True
            ollama_models = [
                {"name": m["name"], "size_gb": round(m.get("size", 0) / 1e9, 1)}
                for m in r.json().get("models", [])
            ]
    except requests.RequestException:
        pass

    total_requests = 0
    if DATABASE_URL:
        try:
            with _get_db() as conn:
                row = conn.execute("SELECT COUNT(*) FROM usage_logs").fetchone()
                total_requests = row[0] if row else 0
        except Exception:
            pass

    now = time.time()
    window_start = now - RATE_WINDOW
    active_anon = sum(
        1 for ts in _anon_requests.values()
        if any(t > window_start for t in ts)
    )

    return {
        "server": {
            "uptime_seconds": round(uptime),
            "uptime_human": _format_uptime(uptime),
        },
        "system": {
            "ram_total_gb": round(mem.total / 1e9, 1),
            "ram_used_gb": round(mem.used / 1e9, 1),
            "ram_percent": mem.percent,
            "cpu_percent": psutil.cpu_percent(interval=0.5),
        },
        "ollama": {
            "online": ollama_ok,
            "models": ollama_models,
        },
        "usage": {
            "total_requests": total_requests,
            "active_anonymous_ips": active_anon,
            "anon_rate_limit": f"{ANON_RATE_LIMIT} req / {RATE_WINDOW}s",
            "member_rate_limit": f"{MEMBER_RATE_LIMIT} req / {RATE_WINDOW}s",
        },
    }


@app.get("/api/usage")
def api_usage(limit: int = 50, user_id: str | None = None):
    if not DATABASE_URL:
        return {"log": []}
    with _get_db() as conn:
        if user_id:
            rows = conn.execute(
                "SELECT created_at, user_id, endpoint, model, duration_ms, client_ip FROM usage_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
                (user_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT created_at, user_id, endpoint, model, duration_ms, client_ip FROM usage_logs ORDER BY created_at DESC LIMIT %s",
                (limit,),
            ).fetchall()
    return {
        "log": [
            {
                "time": row[0].isoformat(),
                "user": row[1],
                "endpoint": row[2],
                "model": row[3],
                "duration_ms": row[4],
                "client_ip": row[5],
            }
            for row in rows
        ]
    }


def _format_uptime(seconds: float) -> str:
    d = int(seconds // 86400)
    h = int((seconds % 86400) // 3600)
    m = int((seconds % 3600) // 60)
    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    parts.append(f"{m}m")
    return " ".join(parts)
