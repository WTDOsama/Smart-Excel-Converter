"""طبقة قاعدة البيانات (SQLite) — قابلة للاستبدال بـ Supabase لاحقاً.

Database layer using SQLite. Structured so it can be swapped for Supabase
(Postgres) without touching the route handlers: every query lives here.
"""
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "storage" / "app.db"
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with _lock, _conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                size INTEGER DEFAULT 0,
                sheets TEXT NOT NULL,          -- JSON: [{name, rows, cols, header_row, columns}]
                uploaded_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'عام',
                path TEXT NOT NULL,
                sheets TEXT NOT NULL,          -- JSON: [{name, header_row, columns:[{name, required}]}]
                created_at TEXT NOT NULL,
                last_used TEXT
            );
            CREATE TABLE IF NOT EXISTS operations (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,            -- upload | conversion | template | export
                title TEXT NOT NULL,
                detail TEXT,
                status TEXT NOT NULL,          -- success | failed | warning
                rows_out INTEGER DEFAULT 0,
                files_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS mapping_rules (
                id TEXT PRIMARY KEY,
                source_column TEXT NOT NULL,
                target_field TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id() -> str:
    return uuid.uuid4().hex[:12]


# ---------------------------------------------------------------- files
def insert_file(file_id, name, path, size, sheets):
    with _lock, _conn() as c:
        c.execute(
            "INSERT INTO files (id,name,path,size,sheets,uploaded_at) VALUES (?,?,?,?,?,?)",
            (file_id, name, path, size, json.dumps(sheets, ensure_ascii=False), now_iso()),
        )


def get_file(file_id):
    with _conn() as c:
        row = c.execute("SELECT * FROM files WHERE id=?", (file_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["sheets"] = json.loads(d["sheets"])
    return d


def list_files():
    with _conn() as c:
        rows = c.execute("SELECT * FROM files ORDER BY uploaded_at DESC").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["sheets"] = json.loads(d["sheets"])
        out.append(d)
    return out


def delete_file(file_id):
    f = get_file(file_id)
    if f:
        Path(f["path"]).unlink(missing_ok=True)
        with _lock, _conn() as c:
            c.execute("DELETE FROM files WHERE id=?", (file_id,))
    return bool(f)


# ------------------------------------------------------------ templates
def insert_template(tid, name, category, path, sheets):
    with _lock, _conn() as c:
        c.execute(
            "INSERT INTO templates (id,name,category,path,sheets,created_at) VALUES (?,?,?,?,?,?)",
            (tid, name, category, path, json.dumps(sheets, ensure_ascii=False), now_iso()),
        )


def get_template(tid):
    with _conn() as c:
        row = c.execute("SELECT * FROM templates WHERE id=?", (tid,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["sheets"] = json.loads(d["sheets"])
    return d


def list_templates():
    with _conn() as c:
        rows = c.execute("SELECT * FROM templates ORDER BY created_at DESC").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["sheets"] = json.loads(d["sheets"])
        out.append(d)
    return out


def update_template(tid, **fields):
    if not fields:
        return
    keys = ", ".join(f"{k}=?" for k in fields)
    with _lock, _conn() as c:
        c.execute(f"UPDATE templates SET {keys} WHERE id=?", (*fields.values(), tid))


def delete_template(tid):
    t = get_template(tid)
    if t:
        Path(t["path"]).unlink(missing_ok=True)
        with _lock, _conn() as c:
            c.execute("DELETE FROM templates WHERE id=?", (tid,))
    return bool(t)


# ----------------------------------------------------------- operations
def log_operation(kind, title, detail="", status="success", rows_out=0, files_count=0):
    with _lock, _conn() as c:
        c.execute(
            "INSERT INTO operations (id,kind,title,detail,status,rows_out,files_count,created_at)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (new_id(), kind, title, detail, status, rows_out, files_count, now_iso()),
        )


def list_operations(limit=100):
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM operations ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def clear_operations():
    with _lock, _conn() as c:
        c.execute("DELETE FROM operations")


# ------------------------------------------------------------- settings
DEFAULT_SETTINGS = {
    "app_language": "ar",
    "ai_enabled": "false",
    "ai_api_key": "",
    "ai_base_url": "https://api.openai.com/v1",
    "ai_model": "gpt-4o-mini",
    "confidence_threshold": "0.65",
    "max_preview_rows": "100",
}


def get_settings():
    with _conn() as c:
        rows = c.execute("SELECT key,value FROM settings").fetchall()
    s = dict(DEFAULT_SETTINGS)
    for r in rows:
        s[r["key"]] = r["value"]
    # never expose the raw key to the frontend
    masked = dict(s)
    if masked.get("ai_api_key"):
        k = masked["ai_api_key"]
        masked["ai_api_key_set"] = True
        masked["ai_api_key"] = k[:6] + "•" * 12 + k[-4:] if len(k) > 12 else "•" * 12
    else:
        masked["ai_api_key_set"] = False
    return masked


def get_setting(key):
    with _conn() as c:
        row = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else DEFAULT_SETTINGS.get(key)


def set_setting(key, value):
    with _lock, _conn() as c:
        c.execute(
            "INSERT INTO settings (key,value) VALUES (?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, str(value)),
        )


# --------------------------------------------------------- mapping rules
def save_mapping_rules(rules):
    with _lock, _conn() as c:
        for src, tgt in rules:
            c.execute(
                "INSERT INTO mapping_rules (id,source_column,target_field,created_at) VALUES (?,?,?,?)",
                (new_id(), src, tgt, now_iso()),
            )


def list_mapping_rules():
    with _conn() as c:
        rows = c.execute(
            "SELECT source_column,target_field FROM mapping_rules ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def clear_mapping_rules():
    with _lock, _conn() as c:
        c.execute("DELETE FROM mapping_rules")
