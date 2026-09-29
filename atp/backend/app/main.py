import io
import re
import shutil
import time
import uuid
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from . import seed as seed_mod
from .db import UPLOADS, connect, get_db, init_db
from .security import create_token, decode_token, hash_password, verify_password
from .sheets import SheetError, parse_sheet

DAY = 24 * 3600
ALLOWED = {".csv", ".xls", ".xlsx"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    con = connect()
    seed_mod.seed(con)
    con.close()
    yield


app = FastAPI(title="ATP 11B API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)
bearer = HTTPBearer(auto_error=False)


# ------------------------------------------------------------------ auth
def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer), db=Depends(get_db)):
    username = decode_token(cred.credentials) if cred else None
    row = db.execute("SELECT username,name,role FROM users WHERE username=?", (username,)).fetchone() if username else None
    if not row:
        raise HTTPException(401, "Not authenticated")
    return dict(row)


def admin_only(user=Depends(current_user)):
    if user["role"] != "Admin":
        raise HTTPException(403, "Admin access required")
    return user


class LoginIn(BaseModel):
    username: str
    password: str


class ResetIn(BaseModel):
    username: str
    current_password: str
    new_password: str = Field(min_length=6)


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=128)


class UserIn(BaseModel):
    name: str = Field(min_length=1)
    username: str = Field(min_length=1)
    password: str = Field(min_length=6)
    role: str = "User"


@app.post("/api/auth/login")
def login(body: LoginIn, db=Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE username=?", (body.username.strip(),)).fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Username or password is incorrect.")
    return {"token": create_token(row["username"]),
            "user": {"username": row["username"], "name": row["name"], "role": row["role"]}}


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterIn, db=Depends(get_db)):
    username, name = body.username.strip(), " ".join(body.name.split())
    if not re.fullmatch(r"[A-Za-z0-9._-]{3,32}", username):
        raise HTTPException(400, "Username can only have letters, numbers, dot, dash and underscore.")
    if len(name) < 2:
        raise HTTPException(400, "Enter your full name.")
    if db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        raise HTTPException(409, "That username is taken.")
    # Self sign-up always creates a normal user. Admin role is only given from Users page by an admin.
    db.execute("INSERT INTO users VALUES (?,?,?,?)", (username, name, hash_password(body.password), "User"))
    db.commit()
    return {"username": username, "name": name, "role": "User"}


@app.get("/api/auth/me")
def me(user=Depends(current_user)):
    return user


@app.post("/api/auth/reset-password")
def reset_password(body: ResetIn, db=Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE username=?", (body.username.strip(),)).fetchone()
    if not row or not verify_password(body.current_password, row["password_hash"]):
        raise HTTPException(400, "Username or current password is incorrect.")
    db.execute("UPDATE users SET password_hash=? WHERE username=?", (hash_password(body.new_password), row["username"]))
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------ user management
@app.get("/api/users")
def list_users(_=Depends(current_user), db=Depends(get_db)):
    return [dict(r) for r in db.execute("SELECT username,name,role FROM users ORDER BY rowid")]


@app.post("/api/users", status_code=201)
def add_user(body: UserIn, _=Depends(admin_only), db=Depends(get_db)):
    if db.execute("SELECT 1 FROM users WHERE username=?", (body.username.strip(),)).fetchone():
        raise HTTPException(409, "That username is taken.")
    role = "Admin" if body.role == "Admin" else "User"
    db.execute("INSERT INTO users VALUES (?,?,?,?)", (body.username.strip(), body.name.strip(), hash_password(body.password), role))
    db.commit()
    return {"username": body.username.strip(), "name": body.name.strip(), "role": role}


@app.delete("/api/users/{username}")
def delete_user(username: str, me=Depends(admin_only), db=Depends(get_db)):
    if username.lower() == me["username"].lower():
        raise HTTPException(400, "You cannot delete your own account.")
    db.execute("DELETE FROM users WHERE username=?", (username,))
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------- tasks
def _tab_clause(tab: str):
    if tab not in ("active", "history"):
        raise HTTPException(400, "tab must be 'active' or 'history'")
    cutoff = int(time.time()) - DAY
    # Active tasks stay for 24h after they were initiated, then they belong to History.
    return ("t.initiated >= ?" if tab == "active" else "t.initiated < ?"), [cutoff]


def _serialize(db, rows):
    ids = [r["id"] for r in rows]
    files: dict[str, list] = {i: [] for i in ids}
    if ids:
        q = ",".join("?" * len(ids))
        for f in db.execute(f"SELECT id,task_id,name,type,size FROM files WHERE task_id IN ({q}) ORDER BY id", ids):
            files[f["task_id"]].append({"id": f["id"], "name": f["name"], "type": f["type"], "size": f["size"]})
    from datetime import datetime, timezone

    return [{
        "id": r["id"], "sapId": r["sap_id"], "bands": r["bands"], "user": r["user_name"],
        "initiated": datetime.fromtimestamp(r["initiated"], timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "files": files[r["id"]],
    } for r in rows]


@app.get("/api/tasks")
def list_tasks(
    tab: str = "active", q: str = "", sap_id: str = "", band: str = "", date: str = "",
    page: int = Query(1, ge=1), size: int = Query(12, ge=1, le=100),
    _=Depends(current_user), db=Depends(get_db),
):
    clause, params = _tab_clause(tab)
    where = [clause]
    if sap_id:
        where.append("(', ' || t.sap_id || ', ') LIKE ?")
        params.append(f"%, {sap_id}, %")
    if band:
        where.append("(',' || REPLACE(t.bands, ' ', '') || ',') LIKE ?")
        params.append(f"%,{band.replace(' ', '')},%")
    if date:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise HTTPException(400, "date must be YYYY-MM-DD")
        where.append("date(t.initiated,'unixepoch') = ?")
        params.append(date)
    if q.strip():
        like = f"%{q.strip().lower()}%"
        where.append(
            "(lower(t.sap_id) LIKE ? OR lower(t.bands) LIKE ? OR lower(t.user_name) LIKE ? "
            "OR lower(strftime('%Y-%m-%dT%H:%M:%SZ',t.initiated,'unixepoch')) LIKE ? "
            "OR EXISTS (SELECT 1 FROM files f WHERE f.task_id=t.id AND (lower(f.type) LIKE ? OR lower(f.name) LIKE ?)))"
        )
        params += [like] * 6
    w = " AND ".join(where)
    total = db.execute(f"SELECT COUNT(*) FROM tasks t WHERE {w}", params).fetchone()[0]
    pages = max(1, -(-total // size))
    page = min(page, pages)
    rows = db.execute(
        f"SELECT * FROM tasks t WHERE {w} ORDER BY t.initiated DESC, t.rowid DESC LIMIT ? OFFSET ?",
        params + [size, (page - 1) * size],
    ).fetchall()
    cutoff = int(time.time()) - DAY
    counts = {
        "active": db.execute("SELECT COUNT(*) FROM tasks WHERE initiated >= ?", (cutoff,)).fetchone()[0],
        "history": db.execute("SELECT COUNT(*) FROM tasks WHERE initiated < ?", (cutoff,)).fetchone()[0],
    }
    return {"items": _serialize(db, rows), "total": total, "page": page, "pages": pages, "size": size, "counts": counts}


@app.get("/api/tasks/filters")
def filter_options(tab: str = "active", _=Depends(current_user), db=Depends(get_db)):
    clause, params = _tab_clause(tab)
    saps, bands = set(), set()
    for r in db.execute(f"SELECT sap_id,bands FROM tasks t WHERE {clause}", params):
        saps.update(s.strip() for s in r["sap_id"].split(",") if s.strip())
        bands.update(b.strip() for b in r["bands"].split(",") if b.strip())

    def num(x):
        try:
            return (0, float(x), x)
        except ValueError:
            return (1, 0, x)

    return {"sapIds": sorted(saps), "bands": sorted(bands, key=num)}


@app.post("/api/tasks/upload", status_code=201)
def upload(files: list[UploadFile] = File(...), user=Depends(current_user), db=Depends(get_db)):
    if not files:
        raise HTTPException(400, "Attach at least one file.")
    task_id = uuid.uuid4().hex
    folder = UPLOADS / task_id
    folder.mkdir(parents=True, exist_ok=True)
    saps, bands, saved = {}, {}, []
    try:
        for f in files:
            name = re.sub(r"[^\w.\- ()]", "_", Path(f.filename or "file").name)
            ext = Path(name).suffix.lower()
            if ext not in ALLOWED:
                raise HTTPException(400, f"{name}: only Excel (.xls, .xlsx) and CSV files are allowed.")
            dest = folder / name
            with open(dest, "wb") as out:
                shutil.copyfileobj(f.file, out)
            try:
                s, b = parse_sheet(dest, ext)
            except SheetError as e:
                raise HTTPException(400, f"{name}: {e}")
            except Exception:
                raise HTTPException(400, f"{name}: could not read this file.")
            saps.update({x: None for x in s})
            bands.update({x: None for x in b})
            saved.append((name, "csv" if ext == ".csv" else "xls", dest.stat().st_size, str(dest)))
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise

    def num(x):
        try:
            return (0, float(x))
        except ValueError:
            return (1, x)

    db.execute("INSERT INTO tasks VALUES (?,?,?,?,?)",
               (task_id, ", ".join(saps), ", ".join(sorted(bands, key=num)), int(time.time()), user["username"]))
    for name, t, size, path in saved:
        db.execute("INSERT INTO files (task_id,name,type,size,path) VALUES (?,?,?,?,?)", (task_id, name, t, size, path))
    db.commit()
    row = db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    return _serialize(db, [row])[0]


def _zip_response(entries: list[tuple[str, str]], filename: str):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for arcname, path in entries:
            if Path(path).exists():
                z.write(path, arcname)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/tasks/{task_id}/download")
def download_task(task_id: str, _=Depends(current_user), db=Depends(get_db)):
    task = db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not task:
        raise HTTPException(404, "Task not found")
    files = db.execute("SELECT * FROM files WHERE task_id=?", (task_id,)).fetchall()
    if len(files) == 1 and Path(files[0]["path"]).exists():
        return FileResponse(files[0]["path"], filename=files[0]["name"])
    return _zip_response([(f["name"], f["path"]) for f in files], f"{task['sap_id']}.zip")


class IdsIn(BaseModel):
    ids: list[str] = Field(min_length=1)


@app.post("/api/tasks/download")
def download_many(body: IdsIn, _=Depends(current_user), db=Depends(get_db)):
    entries = []
    q = ",".join("?" * len(body.ids))
    for i, t in enumerate(db.execute(f"SELECT * FROM tasks WHERE id IN ({q}) ORDER BY initiated DESC", body.ids), 1):
        for f in db.execute("SELECT * FROM files WHERE task_id=?", (t["id"],)):
            entries.append((f"{i:02d}_{t['sap_id']}/{f['name']}", f["path"]))
    if not entries:
        raise HTTPException(404, "No files found")
    return _zip_response(entries, "ATP11B-selected-files.zip")