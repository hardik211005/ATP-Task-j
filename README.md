# ATP 11B - 5G Site Planning and Engineering Product

Angular 18 frontend + Python (FastAPI + SQLite) backend.

```
atp/
  backend/   FastAPI API, SQLite database, uploaded files (created on first run in backend/data)
  frontend/  Angular app (dev server proxies /api to the backend)
```

## 1. Backend (terminal 1)
```
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows   (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

## 2. Frontend (terminal 2)
```
cd frontend
npm install
npm start                       # http://localhost:4200
```

## Login (demo data is created on first run)
- rita.bobde / Admin@123
- admin / Admin@123

## How the requirements are met
- **Login form** - JWT auth, show/hide password, Reset Password (needs the current password).
- **Two nav items** - ATP 11B and User Management (admins can add/delete users).
- **Active Tasks / History** - split tabs with counts. The server decides: a task initiated less than 24h ago is Active, older is History. The tabs refresh every 30 s so tasks move over on their own.
- **Search, filter, upload icons** - as in the screens. Search and filter are sent to the API with the current tab, so each tab only affects its own data. Search, filter, page and selection are remembered per tab.
- **Checkbox** - row (single) and header (whole page). With a selection the Upload button becomes "Download Selected files" (zip).
- **Upload** - only .xls, .xlsx, .csv (checked in the browser and again on the server). The file must have "SAP ID" and "Band (Mhz)" columns; SAP ID and bands are read from it and shown in the table.
- **Pagination** - server side, rows per page selectable.

## Config
- `ATP_SECRET` - JWT signing secret (set this outside local dev).
- `ATP_DATA_DIR` - where the database and uploads live (default backend/data).
- Frontend calls `/api/...`. In dev, `frontend/proxy.conf.json` forwards it to port 8000. For production put both behind one web server (nginx) that routes /api to uvicorn.
