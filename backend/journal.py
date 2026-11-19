# Jurnalul: caiete + pagini personalizabile. Se leagă în main.py cu app.include_router(router).
# Folosește același stil ca database.py: sqlite3 simplu, fără librării în plus.
import json
import os
import re
import sqlite3
from datetime import date, datetime, timezone
from typing import Literal
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from auth import bearer_token, user_from_token

FOLDER = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(FOLDER, "journal.db")  # fișier separat de books.db; e în .gitignore (date private)

router = APIRouter(prefix="/journal", tags=["journal"])

Mood = Literal["happy", "calm", "grateful", "neutral", "anxious", "sad", "angry", "tired"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


# ---------- Baza de date ----------
def connect():
    connection = sqlite3.connect(DB_FILE, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS journal_notebooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            title TEXT NOT NULL,
            cover_color TEXT NOT NULL,
            default_style TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL REFERENCES journal_notebooks(id) ON DELETE CASCADE,
            user TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            mood TEXT,
            style TEXT NOT NULL,
            entry_date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notebooks_user ON journal_notebooks(user);
        CREATE INDEX IF NOT EXISTS idx_entries_nb ON journal_entries(notebook_id, user);
        """
    )
    return connection


def get_db():
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------- Cine e userul ----------
def current_user(authorization: str | None = Header(default=None)) -> str:
    """Userul din token (Authorization: Bearer ...), prin auth.py. Jurnalul fiecărui cont e legat de emailul lui."""
    user = user_from_token(bearer_token(authorization))
    if user is None:
        raise HTTPException(401, "Trebuie să fii logat")
    return user["email"]


# ---------- Validare ----------
class PageStyle(BaseModel):
    """Stilul unei pagini. Valorile sunt validate strict, ca să nu ajungă CSS arbitrar în pagină."""
    model_config = {"extra": "forbid"}

    background: str = "#FFF8E7"
    paper: Literal["blank", "lined", "dotted", "grid"] = "lined"
    font: Literal["Inter", "Caveat", "Lora", "Merriweather", "Patrick Hand", "Courier Prime"] = "Lora"
    font_size: int = Field(default=18, ge=12, le=32)
    text_color: str = "#333333"

    @field_validator("background", "text_color")
    @classmethod
    def check_color(cls, value: str) -> str:
        if not HEX.match(value):
            raise ValueError("culoare invalidă, folosește formatul #RRGGBB")
        return value


class NotebookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    cover_color: str = "#FFB4A8"
    default_style: PageStyle = PageStyle()

    @field_validator("cover_color")
    @classmethod
    def check_color(cls, value: str) -> str:
        if not HEX.match(value):
            raise ValueError("culoare invalidă")
        return value


class EntryCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    content: str = Field(default="", max_length=50_000)
    mood: Mood | None = None
    style: PageStyle | None = None  # dacă lipsește, pagina moștenește stilul caietului
    entry_date: date | None = None


class EntryUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = Field(default=None, max_length=50_000)
    mood: Mood | None = None
    style: PageStyle | None = None
    entry_date: date | None = None


# ---------- Transformări rând -> dicționar ----------
def notebook_dict(row, entry_count=0):
    return {
        "id": row["id"], "title": row["title"], "cover_color": row["cover_color"],
        "default_style": json.loads(row["default_style"]), "created_at": row["created_at"],
        "entry_count": entry_count,
    }


def entry_dict(row):
    return {
        "id": row["id"], "notebook_id": row["notebook_id"], "title": row["title"],
        "content": row["content"], "mood": row["mood"], "style": json.loads(row["style"]),
        "entry_date": row["entry_date"], "created_at": row["created_at"], "updated_at": row["updated_at"],
    }


# Dacă aparține altui user întoarcem tot 404, ca să nu aflăm că există
def get_notebook(db, notebook_id, user):
    row = db.execute("SELECT * FROM journal_notebooks WHERE id = ? AND user = ?", (notebook_id, user)).fetchone()
    if row is None:
        raise HTTPException(404, "Caietul nu există")
    return row


def get_entry(db, entry_id, user):
    row = db.execute("SELECT * FROM journal_entries WHERE id = ? AND user = ?", (entry_id, user)).fetchone()
    if row is None:
        raise HTTPException(404, "Pagina nu există")
    return row


# ---------- Caiete ----------
@router.get("/notebooks")
def list_notebooks(db=Depends(get_db), user: str = Depends(current_user)):
    rows = db.execute(
        """SELECT n.*, (SELECT COUNT(*) FROM journal_entries e WHERE e.notebook_id = n.id) AS entry_count
           FROM journal_notebooks n WHERE n.user = ? ORDER BY n.id DESC""",
        (user,),
    ).fetchall()
    return [notebook_dict(r, r["entry_count"]) for r in rows]


@router.post("/notebooks", status_code=201)
def create_notebook(body: NotebookCreate, db=Depends(get_db), user: str = Depends(current_user)):
    cursor = db.execute(
        "INSERT INTO journal_notebooks (user, title, cover_color, default_style, created_at) VALUES (?, ?, ?, ?, ?)",
        (user, body.title, body.cover_color, json.dumps(body.default_style.model_dump()), now()),
    )
    db.commit()
    return notebook_dict(get_notebook(db, cursor.lastrowid, user))


@router.delete("/notebooks/{notebook_id}", status_code=204)
def delete_notebook(notebook_id: int, db=Depends(get_db), user: str = Depends(current_user)):
    get_notebook(db, notebook_id, user)
    db.execute("DELETE FROM journal_notebooks WHERE id = ?", (notebook_id,))  # paginile se șterg în cascadă
    db.commit()


# ---------- Pagini ----------
@router.get("/notebooks/{notebook_id}/entries")
def list_entries(notebook_id: int, q: str | None = Query(default=None, max_length=100),
                 db=Depends(get_db), user: str = Depends(current_user)):
    get_notebook(db, notebook_id, user)
    sql = "SELECT * FROM journal_entries WHERE notebook_id = ? AND user = ?"
    params: list = [notebook_id, user]
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        sql += " AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')"
        params += [f"%{escaped}%", f"%{escaped}%"]
    sql += " ORDER BY entry_date DESC, id DESC"
    return [entry_dict(r) for r in db.execute(sql, params).fetchall()]


@router.post("/notebooks/{notebook_id}/entries", status_code=201)
def create_entry(notebook_id: int, body: EntryCreate, db=Depends(get_db), user: str = Depends(current_user)):
    notebook = get_notebook(db, notebook_id, user)
    style = body.style.model_dump() if body.style else json.loads(notebook["default_style"])
    moment = now()
    cursor = db.execute(
        """INSERT INTO journal_entries (notebook_id, user, title, content, mood, style, entry_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (notebook_id, user, body.title, body.content, body.mood, json.dumps(style),
         (body.entry_date or date.today()).isoformat(), moment, moment),
    )
    db.commit()
    return entry_dict(get_entry(db, cursor.lastrowid, user))


@router.get("/entries/{entry_id}")
def read_entry(entry_id: int, db=Depends(get_db), user: str = Depends(current_user)):
    return entry_dict(get_entry(db, entry_id, user))


@router.patch("/entries/{entry_id}")
def update_entry(entry_id: int, body: EntryUpdate, db=Depends(get_db), user: str = Depends(current_user)):
    get_entry(db, entry_id, user)
    changes = body.model_dump(exclude_unset=True)  # doar câmpurile trimise de frontend
    if changes.get("style") is not None:
        changes["style"] = json.dumps(changes["style"])
    if changes.get("entry_date") is not None:
        changes["entry_date"] = changes["entry_date"].isoformat()
    for field in ("title", "content", "style", "entry_date"):  # aceste coloane nu pot fi NULL
        if field in changes and changes[field] is None:
            del changes[field]
    if changes:
        columns = ", ".join(f"{name} = ?" for name in changes)  # nume din modelul validat, nu din cerere
        db.execute(f"UPDATE journal_entries SET {columns}, updated_at = ? WHERE id = ?",
                   [*changes.values(), now(), entry_id])
        db.commit()
    return entry_dict(get_entry(db, entry_id, user))


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db=Depends(get_db), user: str = Depends(current_user)):
    get_entry(db, entry_id, user)
    db.execute("DELETE FROM journal_entries WHERE id = ?", (entry_id,))
    db.commit()
