importhashlib
importhmac
importos
importsecrets
importtime

importjwt

SECRET=os.environ.get("ATP_SECRET","change-me-in-production")
TOKEN_TTL=8*3600


defhash_password(password:str,salt:str|None=None)->str:
    salt=saltorsecrets.token_hex(8)
digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt.encode(),120_000).hex()
returnf"{salt}${digest}"


defverify_password(password:str,stored:str)->bool:
    salt,_=stored.split("$",1)
returnhmac.compare_digest(hash_password(password,salt),stored)


defcreate_token(username:str)->str:
    returnjwt.encode({"sub":username,"exp":int(time.time())+TOKEN_TTL},SECRET,algorithm="HS256")


defdecode_token(token:str)->str|None:
    try:
        returnjwt.decode(token,SECRET,algorithms=["HS256"])["sub"]
exceptjwt.PyJWTError:
        returnNone
