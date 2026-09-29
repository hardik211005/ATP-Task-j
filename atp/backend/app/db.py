import os
import sqlite3
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("ATP_DATA_DIR", BASE / "data"))
UPLOADS = DATA / "uploads"
DB_PATH = DATA / "atp.db"

SCHEMA = """
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
    path TEXT NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    DATA.mkdir(parents=True, exist_ok=True)
    UPLOADS.mkdir(parents=True, exist_ok=True)
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
    con.executescript(SCHEMA)
    con.commit()
    con.close()
