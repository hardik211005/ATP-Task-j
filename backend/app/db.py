"""Database layer.

* Local / Docker: SQLite file in ATP_DATA_DIR (default).
* Hosted (Render etc.): set DATABASE_URL to a Postgres URL (e.g. Neon) and everything,
  including uploaded files, is stored in Postgres - no persistent disk needed.
"""
import os
import re
import sqlite3
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("ATP_DATA_DIR", BASE / "data"))
UPLOADS = DATA / "uploads"  # only used to read files saved by older versions
DB_PATH = DATA / "atp.db"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_PG = DATABASE_URL.startswith(("postgres://", "postgresql://"))

SCHEMA_SQLITE = """
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'User'
);
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    sap_id TEXT NOT NULL,
    bands TEXT NOT NULL,
    initiated INTEGER NOT NULL,
    user_name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_initiated ON tasks(initiated);
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL DEFAULT '',
    data BLOB
);
"""

SCHEMA_PG = """
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS users (
    username CITEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'User',
    seq BIGSERIAL
);
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    sap_id TEXT NOT NULL,
    bands TEXT NOT NULL,
    initiated BIGINT NOT NULL,
    user_name TEXT NOT NULL,
    seq BIGSERIAL
);
CREATE INDEX IF NOT EXISTS idx_tasks_initiated ON tasks(initiated);
CREATE TABLE IF NOT EXISTS files (
    id BIGSERIAL PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL DEFAULT '',
    data BYTEA
);
"""


# ---------- Postgres adapter: keeps the SQLite-style SQL used in main.py working ----------
class _Row(dict):
    """dict row that also supports row[0] like sqlite3.Row."""

    def __getitem__(self, k):
        if isinstance(k, int):
            return list(self.values())[k]
        return super().__getitem__(k)


def _row_factory(cursor):
    cols = [c.name for c in (cursor.description or [])]
    return lambda values: _Row(zip(cols, values))


_TRANSLATE = [
    (re.compile(r"date\(t\.initiated,\s*'unixepoch'\)"),
     "to_char(to_timestamp(t.initiated) AT TIME ZONE 'UTC','YYYY-MM-DD')"),
    (re.compile(r"strftime\('%Y-%m-%dT%H:%M:%SZ',\s*t\.initiated,\s*'unixepoch'\)"),
     "to_char(to_timestamp(t.initiated) AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')"),
    (re.compile(r"\browid\b"), "seq"),
    (re.compile(r"\bLIKE\b"), "ILIKE"),
]


def _translate(sql: str, has_params: bool) -> str:
    for pat, rep in _TRANSLATE:
        sql = pat.sub(rep, sql)
    if has_params:
        sql = sql.replace("%", "%%").replace("?", "%s")
    return sql


class PgConn:
    def __init__(self, url: str):
        import psycopg

        self._con = psycopg.connect(url, row_factory=_row_factory)

    def execute(self, sql: str, params=None):
        params = list(params) if params else None
        return self._con.execute(_translate(sql, params is not None), params)

    def commit(self):
        self._con.commit()

    def rollback(self):
        self._con.rollback()

    def close(self):
        self._con.close()


def connect():
    if USE_PG:
        return PgConn(DATABASE_URL)
    DATA.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def get_db():
    con = connect()
    try:
        yield con
    finally:
        con.close()


def init_db():
    con = connect()
    if USE_PG:
        con.execute(SCHEMA_PG)
    else:
        con.executescript(SCHEMA_SQLITE)
        # older databases: add the column that stores file contents
        cols = {r[1] for r in con.execute("PRAGMA table_info(files)")}
        if "data" not in cols:
            con.execute("ALTER TABLE files ADD COLUMN data BLOB")
    con.commit()
    con.close()
