# backend/core/security.py
from argon2 import PasswordHasher

_ph = PasswordHasher()

def hash_password(password: str) -> str:
    return _ph.hash(password)

def verify_password(hash: str, password: str) -> bool:
    return _ph.verify(hash, password)
