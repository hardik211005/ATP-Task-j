"""Demo data on first run: 2 users, 120 history rows and 3 active tasks."""
import csv
import time
import uuid
from datetime import datetime, timezone

from openpyxl import Workbook

from .db import UPLOADS
from .security import hash_password

PATTERN = [("xls", "csv"), ("xls",), ("csv",), ("xls", "csv"), ("csv",), ("csv",), ("csv",),
           ("xls",), ("xls", "csv"), ("xls",), ("xls",), ("xls",)]


def _write_files(task_id: str, sap: str, bands: str, types) -> list[tuple[str, str, int, str]]:
    folder = UPLOADS / task_id
    folder.mkdir(parents=True, exist_ok=True)
    rows = [["SAP ID", "Band (Mhz)"]] + [[sap, b.strip()] for b in bands.split(",")]
    out = []
    for t in types:
        if t == "csv":
            p = folder / f"{sap}.csv"
            with open(p, "w", newline="") as fh:
                csv.writer(fh).writerows(rows)
        else:
            p = folder / f"{sap}.xlsx"
            wb = Workbook()
            for r in rows:
                wb.active.append(r)
            wb.save(p)
        out.append((p.name, t, p.stat().st_size, str(p)))
    return out


def seed(con):
    if con.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        for u, n in (("rita.bobde", "Rita Bobde"), ("admin", "Admin")):
            con.execute("INSERT INTO users VALUES (?,?,?,?)", (u, n, hash_password("Admin@123"), "Admin"))
    if con.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 0:
        base = int(datetime(2025, 9, 19, 11, 51, 26, tzinfo=timezone.utc).timestamp())
        now = int(time.time())
        items = [(f"Aryabhatta-100", "700, 3500", PATTERN[i % 12], base) for i in range(120)]
        items += [("Aryabhatta-101", "700, 3500", ("xls", "csv"), now - 2 * 3600),
                  ("Aryabhatta-102", "3500", ("csv",), now - 9 * 3600),
                  ("Aryabhatta-103", "700, 3500", ("xls",), now - 20 * 3600)]
        for sap, bands, types, ts in items:
            tid = uuid.uuid4().hex
            con.execute("INSERT INTO tasks VALUES (?,?,?,?,?)", (tid, sap, bands, ts, "admin"))
            for name, t, size, path in _write_files(tid, sap, bands, types):
                con.execute("INSERT INTO files (task_id,name,type,size,path) VALUES (?,?,?,?,?)", (tid, name, t, size, path))
    con.commit()
