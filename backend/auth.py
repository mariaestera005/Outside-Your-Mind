# Conturi, parole și sesiuni. Datele stau în users.db (se creează singur).
# Parolele NU se salvează niciodată în clar: doar un hash PBKDF2 cu "sare" aleasă la întâmplare pentru fiecare cont.
# La login primești un token (o cheie lungă la întâmplare), pe care site-ul îl trimite la fiecare cerere.
# Pe server se păstrează doar hash-ul tokenului, deci un scurs din users.db nu dă acces în conturi.
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import closing

from fastapi import Header, HTTPException

FOLDER = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(FOLDER, "users.db")

ITERATIONS = 200_000
SESSION_SECONDS = 30 * 24 * 3600  # sesiunea ține 30 de zile
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")
ROLES = ("user", "volunteer")

MAX_FAILS = 5  # greșeli de parolă permise...
FAIL_WINDOW = 15 * 60  # ...în 15 minute, apoi contul se blochează temporar
_fails = {}


def connect():
    connection = sqlite3.connect(USERS_FILE)
    connection.row_factory = sqlite3.Row
    connection.execute(
        "create table if not exists users ("
        " id integer primary key autoincrement,"
        " email text not null unique,"
        " name text not null,"
        " password_hash text not null,"
        " role text not null default 'user' check (role in ('user', 'volunteer')),"
        " created_at text not null default (datetime('now')))"
    )
    connection.execute(
        "create table if not exists sessions ("
        " token_hash text primary key,"
        " user_id integer not null references users(id),"
        " expires_at integer not null)"
    )
    return connection


# ---------- Parole ----------
def hash_password(password, salt=None):
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return f"pbkdf2${ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def public(row):
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]}


# ---------- Cont nou ----------
def register_user(email, name, password):
    """Creează un cont de utilizator. La date invalide sau email deja folosit ridică ValueError cu mesajul pentru utilizator."""
    email = email.strip().lower()
    name = " ".join(name.split())
    if not EMAIL_RE.match(email):
        raise ValueError("Adresa de email nu este validă.")
    if not 2 <= len(name) <= 40:
        raise ValueError("Numele trebuie să aibă între 2 și 40 de caractere.")
    if not 8 <= len(password) <= 128:
        raise ValueError("Parola trebuie să aibă între 8 și 128 de caractere.")
    with closing(connect()) as connection:
        try:
            cursor = connection.execute(
                "insert into users (email, name, password_hash) values (?, ?, ?)",
                (email, name, hash_password(password)),
            )
        except sqlite3.IntegrityError:
            raise ValueError("Există deja un cont cu acest email.")
        connection.commit()
        row = connection.execute("select * from users where id = ?", (cursor.lastrowid,)).fetchone()
    return public(row)


# ---------- Autentificare ----------
def check_throttle(email):
    """Blochează temporar încercările repetate de ghicire a parolei."""
    recent = [t for t in _fails.get(email, []) if time.time() - t < FAIL_WINDOW]
    _fails[email] = recent
    if len(recent) >= MAX_FAILS:
        raise HTTPException(status_code=429, detail="Prea multe încercări greșite. Încearcă din nou peste 15 minute.")


def authenticate(email, password):
    """Returnează utilizatorul dacă emailul și parola sunt corecte, altfel None."""
    email = email.strip().lower()
    check_throttle(email)
    with closing(connect()) as connection:
        row = connection.execute("select * from users where email = ?", (email,)).fetchone()
    if row is None:
        verify_password(password, "pbkdf2$1$00$00")  # același timp de răspuns, ca să nu se afle ce emailuri există
    if row is None or not verify_password(password, row["password_hash"]):
        _fails.setdefault(email, []).append(time.time())
        return None
    _fails.pop(email, None)
    return public(row)


def _hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id):
    token = secrets.token_urlsafe(32)
    with closing(connect()) as connection:
        connection.execute("delete from sessions where expires_at < ?", (int(time.time()),))
        connection.execute(
            "insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)",
            (_hash_token(token), user_id, int(time.time()) + SESSION_SECONDS),
        )
        connection.commit()
    return token


def user_from_token(token):
    if not token:
        return None
    with closing(connect()) as connection:
        row = connection.execute(
            "select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = ? and s.expires_at > ?",
            (_hash_token(token), int(time.time())),
        ).fetchone()
    return public(row) if row else None


def delete_session(token):
    with closing(connect()) as connection:
        connection.execute("delete from sessions where token_hash = ?", (_hash_token(token or ""),))
        connection.commit()


def set_role(email, role):
    """Folosit de make_volunteer.py. Returnează False dacă nu există contul."""
    if role not in ROLES:
        raise ValueError("Rol invalid.")
    with closing(connect()) as connection:
        cursor = connection.execute("update users set role = ? where email = ?", (role, email.strip().lower()))
        connection.commit()
        return cursor.rowcount > 0


def names_for(user_ids):
    ids = [i for i in set(user_ids) if i is not None]
    if not ids:
        return {}
    with closing(connect()) as connection:
        rows = connection.execute(
            f"select id, name from users where id in ({','.join('?' * len(ids))})", ids
        ).fetchall()
    return {r["id"]: r["name"] for r in rows}


# ---------- Dependențe pentru rutele FastAPI ----------
def bearer_token(authorization):
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def optional_user(authorization: str | None = Header(default=None)):
    """Utilizatorul logat sau None (pentru rutele deschise și anonimilor)."""
    return user_from_token(bearer_token(authorization))


def require_user(authorization: str | None = Header(default=None)):
    user = user_from_token(bearer_token(authorization))
    if user is None:
        raise HTTPException(status_code=401, detail="Trebuie să fii autentificat(ă).")
    return user


def require_volunteer(authorization: str | None = Header(default=None)):
    user = require_user(authorization)
    if user["role"] != "volunteer":
        raise HTTPException(status_code=403, detail="Această zonă este doar pentru voluntari.")
    return user
