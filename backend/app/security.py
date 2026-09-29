import hashlib
import hmac
import os
import secrets
import time

import jwt

SECRET = os.environ.get("ATP_SECRET", "change-me-in-production")
TOKEN_TTL = 8 * 3600


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    salt, _ = stored.split("$", 1)
    return hmac.compare_digest(hash_password(password, salt), stored)


def create_token(username: str) -> str:
    return jwt.encode({"sub": username, "exp": int(time.time()) + TOKEN_TTL}, SECRET, algorithm="HS256")


def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        return None
