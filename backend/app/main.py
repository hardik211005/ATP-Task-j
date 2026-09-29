importio
importre
importshutil
importtime
importuuid
importzipfile
fromcontextlibimportasynccontextmanager
frompathlibimportPath

fromfastapiimportDepends,FastAPI,File,HTTPException,Query,UploadFile
fromfastapi.middleware.corsimportCORSMiddleware
fromfastapi.responsesimportFileResponse,StreamingResponse
fromfastapi.securityimportHTTPAuthorizationCredentials,HTTPBearer
frompydanticimportBaseModel,Field

from.importseedasseed_mod
from.dbimportUPLOADS,connect,get_db,init_db
from.securityimportcreate_token,decode_token,hash_password,verify_password
from.sheetsimportSheetError,parse_sheet

DAY=24*3600
ALLOWED={".csv",".xls",".xlsx"}


@asynccontextmanager
asyncdeflifespan(_:FastAPI):
    init_db()
con=connect()
seed_mod.seed(con)
con.close()
yield


app=FastAPI(title="ATP 11B API",lifespan=lifespan)
app.add_middleware(
CORSMiddleware,
allow_origins=["http://localhost:4200","http://127.0.0.1:4200"],
allow_methods=["*"],
allow_headers=["*"],
)
bearer=HTTPBearer(auto_error=False)



defcurrent_user(cred:HTTPAuthorizationCredentials|None=Depends(bearer),db=Depends(get_db)):
    username=decode_token(cred.credentials)ifcredelseNone
row=db.execute("SELECT username,name,role FROM users WHERE username=?",(username,)).fetchone()ifusernameelseNone
ifnotrow:
        raiseHTTPException(401,"Not authenticated")
returndict(row)


defadmin_only(user=Depends(current_user)):
    ifuser["role"]!="Admin":
        raiseHTTPException(403,"Admin access required")
returnuser


classLoginIn(BaseModel):
    username:str
password:str


classResetIn(BaseModel):
    username:str
current_password:str
new_password:str=Field(min_length=6)


classRegisterIn(BaseModel):
    name:str=Field(min_length=2,max_length=60)
username:str=Field(min_length=3,max_length=32)
password:str=Field(min_length=6,max_length=128)


classUserIn(BaseModel):
    name:str=Field(min_length=1)
username:str=Field(min_length=1)
password:str=Field(min_length=6)
role:str="User"


@app.post("/api/auth/login")
deflogin(body:LoginIn,db=Depends(get_db)):
    row=db.execute("SELECT * FROM users WHERE username=?",(body.username.strip(),)).fetchone()
ifnotrowornotverify_password(body.password,row["password_hash"]):
        raiseHTTPException(401,"Username or password is incorrect.")
return{"token":create_token(row["username"]),
"user":{"username":row["username"],"name":row["name"],"role":row["role"]}}


@app.post("/api/auth/register",status_code=201)
defregister(body:RegisterIn,db=Depends(get_db)):
    username,name=body.username.strip()," ".join(body.name.split())
ifnotre.fullmatch(r"[A-Za-z0-9._-]{3,32}",username):
        raiseHTTPException(400,"Username can only have letters, numbers, dot, dash and underscore.")
iflen(name)<2:
        raiseHTTPException(400,"Enter your full name.")
ifdb.execute("SELECT 1 FROM users WHERE username=?",(username,)).fetchone():
        raiseHTTPException(409,"That username is taken.")

db.execute("INSERT INTO users VALUES (?,?,?,?)",(username,name,hash_password(body.password),"User"))
db.commit()
return{"username":username,"name":name,"role":"User"}


@app.get("/api/auth/me")
defme(user=Depends(current_user)):
    returnuser


@app.post("/api/auth/reset-password")
defreset_password(body:ResetIn,db=Depends(get_db)):
    row=db.execute("SELECT * FROM users WHERE username=?",(body.username.strip(),)).fetchone()
ifnotrowornotverify_password(body.current_password,row["password_hash"]):
        raiseHTTPException(400,"Username or current password is incorrect.")
db.execute("UPDATE users SET password_hash=? WHERE username=?",(hash_password(body.new_password),row["username"]))
db.commit()
return{"ok":True}



@app.get("/api/users")
deflist_users(_=Depends(current_user),db=Depends(get_db)):
    return[dict(r)forrindb.execute("SELECT username,name,role FROM users ORDER BY rowid")]


@app.post("/api/users",status_code=201)
defadd_user(body:UserIn,_=Depends(admin_only),db=Depends(get_db)):
    ifdb.execute("SELECT 1 FROM users WHERE username=?",(body.username.strip(),)).fetchone():
        raiseHTTPException(409,"That username is taken.")
role="Admin"ifbody.role=="Admin"else"User"
db.execute("INSERT INTO users VALUES (?,?,?,?)",(body.username.strip(),body.name.strip(),hash_password(body.password),role))
db.commit()
return{"username":body.username.strip(),"name":body.name.strip(),"role":role}


@app.delete("/api/users/{username}")
defdelete_user(username:str,me=Depends(admin_only),db=Depends(get_db)):
    ifusername.lower()==me["username"].lower():
        raiseHTTPException(400,"You cannot delete your own account.")
db.execute("DELETE FROM users WHERE username=?",(username,))
db.commit()
return{"ok":True}



def_tab_clause(tab:str):
    iftabnotin("active","history"):
        raiseHTTPException(400,"tab must be 'active' or 'history'")
cutoff=int(time.time())-DAY

return("t.initiated >= ?"iftab=="active"else"t.initiated < ?"),[cutoff]


def_serialize(db,rows):
    ids=[r["id"]forrinrows]
files:dict[str,list]={i:[]foriinids}
ifids:
        q=",".join("?"*len(ids))
forfindb.execute(f"SELECT id,task_id,name,type,size FROM files WHERE task_id IN ({q}) ORDER BY id",ids):
            files[f["task_id"]].append({"id":f["id"],"name":f["name"],"type":f["type"],"size":f["size"]})
fromdatetimeimportdatetime,timezone

return[{
"id":r["id"],"sapId":r["sap_id"],"bands":r["bands"],"user":r["user_name"],
"initiated":datetime.fromtimestamp(r["initiated"],timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
"files":files[r["id"]],
}forrinrows]


@app.get("/api/tasks")
deflist_tasks(
tab:str="active",q:str="",sap_id:str="",band:str="",date:str="",
page:int=Query(1,ge=1),size:int=Query(12,ge=1,le=100),
_=Depends(current_user),db=Depends(get_db),
):
    clause,params=_tab_clause(tab)
where=[clause]
ifsap_id:
        where.append("(', ' || t.sap_id || ', ') LIKE ?")
params.append(f"%, {sap_id}, %")
ifband:
        where.append("(',' || REPLACE(t.bands, ' ', '') || ',') LIKE ?")
params.append(f"%,{band.replace(' ','')},%")
ifdate:
        ifnotre.fullmatch(r"\d{4}-\d{2}-\d{2}",date):
            raiseHTTPException(400,"date must be YYYY-MM-DD")
where.append("date(t.initiated,'unixepoch') = ?")
params.append(date)
ifq.strip():
        like=f"%{q.strip().lower()}%"
where.append(
"(lower(t.sap_id) LIKE ? OR lower(t.bands) LIKE ? OR lower(t.user_name) LIKE ? "
"OR lower(strftime('%Y-%m-%dT%H:%M:%SZ',t.initiated,'unixepoch')) LIKE ? "
"OR EXISTS (SELECT 1 FROM files f WHERE f.task_id=t.id AND (lower(f.type) LIKE ? OR lower(f.name) LIKE ?)))"
)
params+=[like]*6
w=" AND ".join(where)
total=db.execute(f"SELECT COUNT(*) FROM tasks t WHERE {w}",params).fetchone()[0]
pages=max(1,-(-total//size))
page=min(page,pages)
rows=db.execute(
f"SELECT * FROM tasks t WHERE {w} ORDER BY t.initiated DESC, t.rowid DESC LIMIT ? OFFSET ?",
params+[size,(page-1)*size],
).fetchall()
cutoff=int(time.time())-DAY
counts={
"active":db.execute("SELECT COUNT(*) FROM tasks WHERE initiated >= ?",(cutoff,)).fetchone()[0],
"history":db.execute("SELECT COUNT(*) FROM tasks WHERE initiated < ?",(cutoff,)).fetchone()[0],
}
return{"items":_serialize(db,rows),"total":total,"page":page,"pages":pages,"size":size,"counts":counts}


@app.get("/api/tasks/filters")
deffilter_options(tab:str="active",_=Depends(current_user),db=Depends(get_db)):
    clause,params=_tab_clause(tab)
saps,bands=set(),set()
forrindb.execute(f"SELECT sap_id,bands FROM tasks t WHERE {clause}",params):
        saps.update(s.strip()forsinr["sap_id"].split(",")ifs.strip())
bands.update(b.strip()forbinr["bands"].split(",")ifb.strip())

defnum(x):
        try:
            return(0,float(x),x)
exceptValueError:
            return(1,0,x)

return{"sapIds":sorted(saps),"bands":sorted(bands,key=num)}


@app.post("/api/tasks/upload",status_code=201)
defupload(files:list[UploadFile]=File(...),user=Depends(current_user),db=Depends(get_db)):
    ifnotfiles:
        raiseHTTPException(400,"Attach at least one file.")
task_id=uuid.uuid4().hex
folder=UPLOADS/task_id
folder.mkdir(parents=True,exist_ok=True)
saps,bands,saved={},{},[]
try:
        forfinfiles:
            name=re.sub(r"[^\w.\- ()]","_",Path(f.filenameor"file").name)
ext=Path(name).suffix.lower()
ifextnotinALLOWED:
                raiseHTTPException(400,f"{name}: only Excel (.xls, .xlsx) and CSV files are allowed.")
dest=folder/name
withopen(dest,"wb")asout:
                shutil.copyfileobj(f.file,out)
try:
                s,b=parse_sheet(dest,ext)
exceptSheetErrorase:
                raiseHTTPException(400,f"{name}: {e}")
exceptException:
                raiseHTTPException(400,f"{name}: could not read this file.")
saps.update({x:Noneforxins})
bands.update({x:Noneforxinb})
saved.append((name,"csv"ifext==".csv"else"xls",dest.stat().st_size,str(dest)))
exceptException:
        shutil.rmtree(folder,ignore_errors=True)
raise

defnum(x):
        try:
            return(0,float(x))
exceptValueError:
            return(1,x)

db.execute("INSERT INTO tasks VALUES (?,?,?,?,?)",
(task_id,", ".join(saps),", ".join(sorted(bands,key=num)),int(time.time()),user["username"]))
forname,t,size,pathinsaved:
        db.execute("INSERT INTO files (task_id,name,type,size,path) VALUES (?,?,?,?,?)",(task_id,name,t,size,path))
db.commit()
row=db.execute("SELECT * FROM tasks WHERE id=?",(task_id,)).fetchone()
return_serialize(db,[row])[0]


def_zip_response(entries:list[tuple[str,str]],filename:str):
    buf=io.BytesIO()
withzipfile.ZipFile(buf,"w",zipfile.ZIP_DEFLATED)asz:
        forarcname,pathinentries:
            ifPath(path).exists():
                z.write(path,arcname)
buf.seek(0)
returnStreamingResponse(buf,media_type="application/zip",
headers={"Content-Disposition":f'attachment; filename="{filename}"'})


@app.get("/api/tasks/{task_id}/download")
defdownload_task(task_id:str,_=Depends(current_user),db=Depends(get_db)):
    task=db.execute("SELECT * FROM tasks WHERE id=?",(task_id,)).fetchone()
ifnottask:
        raiseHTTPException(404,"Task not found")
files=db.execute("SELECT * FROM files WHERE task_id=?",(task_id,)).fetchall()
iflen(files)==1andPath(files[0]["path"]).exists():
        returnFileResponse(files[0]["path"],filename=files[0]["name"])
return_zip_response([(f["name"],f["path"])forfinfiles],f"{task['sap_id']}.zip")


classIdsIn(BaseModel):
    ids:list[str]=Field(min_length=1)


@app.post("/api/tasks/download")
defdownload_many(body:IdsIn,_=Depends(current_user),db=Depends(get_db)):
    entries=[]
q=",".join("?"*len(body.ids))
fori,tinenumerate(db.execute(f"SELECT * FROM tasks WHERE id IN ({q}) ORDER BY initiated DESC",body.ids),1):
        forfindb.execute("SELECT * FROM files WHERE task_id=?",(t["id"],)):
            entries.append((f"{i:02d}_{t['sap_id']}/{f['name']}",f["path"]))
ifnotentries:
        raiseHTTPException(404,"No files found")
return_zip_response(entries,"ATP11B-selected-files.zip")