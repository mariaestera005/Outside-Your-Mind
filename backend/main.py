# Serverul (backend-ul). Se pornește cu:  python -m uvicorn main:app --reload
import re

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import (
    authenticate, bearer_token, create_session, delete_session, names_for,
    optional_user, register_user, require_user, require_volunteer,
)
from chat_db import (
    add_message, delete_thread, get_inbox, get_thread_messages, get_thread_owner,
    get_user_threads, mark_read, purge_anonymous,
)
from database import get_all_books, get_all_podcasts
from journal import router as journal_router
from summarizer import fill_missing_titles, update_title

app = FastAPI()

# Site-ul React rulează pe portul 5173, iar serverul pe 8000.
# Fără linia asta, browserul ar bloca cererile dintre ele.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jurnalul (caiete + pagini personalizabile) trăiește în journal.py
app.include_router(journal_router)

MAX_LENGTH = 2000
ANONYMOUS_HOURS = 24  # conversațiile utilizatorilor neautentificați se șterg după atâtea ore fără activitate


class NewMessage(BaseModel):
    thread_id: str
    text: str


class Reply(BaseModel):
    text: str


class RegisterBody(BaseModel):
    name: str
    email: str
    password: str


class LoginBody(BaseModel):
    email: str
    password: str


def clean_text(text):
    text = text.strip()
    if text == "":
        raise HTTPException(status_code=400, detail="Mesajul este gol.")
    if len(text) > MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"Mesajul poate avea maximum {MAX_LENGTH} de caractere.")
    return text


def check_thread_id(thread_id):
    if not re.fullmatch(r"[A-Za-z0-9-]{8,64}", thread_id):
        raise HTTPException(status_code=400, detail="Identificator de conversație invalid.")


def check_owner(thread_id, user):
    """O conversație a unui cont poate fi citită, continuată sau ștearsă doar de acel cont."""
    exists, owner_id = get_thread_owner(thread_id)
    if exists and owner_id is not None:
        if user is None:
            raise HTTPException(status_code=401, detail="Trebuie să fii autentificat(ă).")
        if user["id"] != owner_id:
            raise HTTPException(status_code=403, detail="Această conversație aparține altui cont.")


# ---------- Conturi ----------
@app.post("/register")
def register(body: RegisterBody):
    """Creează un cont și îl autentifică imediat."""
    try:
        user = register_user(body.email, body.name, body.password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return {**user, "token": create_session(user["id"])}


@app.post("/login")
def login(body: LoginBody):
    """Login pentru utilizatori. Conturile de voluntar intră doar prin /volunteer/login."""
    user = authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Email sau parolă greșite.")
    if user["role"] == "volunteer":
        raise HTTPException(status_code=403, detail="Acesta este un cont de voluntar. Intră din secțiunea „Login voluntari”.")
    return {**user, "token": create_session(user["id"])}


@app.post("/volunteer/login")
def volunteer_login(body: LoginBody):
    """Login separat pentru voluntari. Conturile de voluntar nu se creează din site, ci de echipă (make_volunteer.py)."""
    user = authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Email sau parolă greșite.")
    if user["role"] != "volunteer":
        raise HTTPException(status_code=403, detail="Acest cont nu este de voluntar. Folosește „Login” pentru utilizatori.")
    return {**user, "token": create_session(user["id"])}


@app.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    delete_session(bearer_token(authorization))
    return {"ok": True}


@app.get("/me")
def me(user=Depends(require_user)):
    """Cine e logat cu tokenul acesta; site-ul îl folosește ca să te țină logat(ă) după refresh."""
    return user


# ---------- Cărți ----------
@app.get("/books")
def read_books():
    """Adresa http://localhost:8000/books returnează lista de cărți."""
    return get_all_books()


# ---------- Podcasturi ----------
@app.get("/podcasts")
def read_podcasts():
    """Adresa http://localhost:8000/podcasts returnează lista de podcasturi."""
    return get_all_podcasts()


# ---------- Chat (utilizator) ----------
@app.post("/chat")
def send_chat_message(body: NewMessage, background_tasks: BackgroundTasks, user=Depends(optional_user)):
    """Utilizatorul trimite un mesaj; apare în inbox-ul voluntarilor, iar AI-ul îi scrie titlul în fundal."""
    check_thread_id(body.thread_id)
    check_owner(body.thread_id, user)
    purge_anonymous(ANONYMOUS_HOURS)
    message_id = add_message(body.thread_id, "user", clean_text(body.text), user["id"] if user else None)
    background_tasks.add_task(update_title, body.thread_id)
    return {"id": message_id}


@app.get("/chat")
def my_chats(user=Depends(require_user)):
    """Istoricul conversațiilor contului logat."""
    return get_user_threads(user["id"])


@app.get("/chat/{thread_id}")
def read_chat(thread_id: str, user=Depends(optional_user)):
    """Mesajele unei conversații (inclusiv răspunsurile voluntarilor), pentru chatul utilizatorului."""
    check_thread_id(thread_id)
    check_owner(thread_id, user)
    return get_thread_messages(thread_id)


@app.delete("/chat/{thread_id}")
def delete_chat_thread(thread_id: str, user=Depends(optional_user)):
    """Utilizatorul își șterge conversația; dispare și din inbox-ul voluntarilor."""
    check_thread_id(thread_id)
    check_owner(thread_id, user)
    delete_thread(thread_id)
    return {"ok": True}


# ---------- Inbox (doar voluntari) ----------
@app.get("/inbox")
def read_inbox(background_tasks: BackgroundTasks, volunteer=Depends(require_volunteer)):
    """Conversațiile pentru pagina de voluntar."""
    purge_anonymous(ANONYMOUS_HOURS)
    inbox = get_inbox()
    background_tasks.add_task(fill_missing_titles, inbox)  # completează în fundal titlurile care lipsesc
    names = names_for([item["user_id"] for item in inbox])
    for item in inbox:
        # Voluntarul vede numele ales la crearea contului; neautentificații apar ca "Anonim"
        item["from"] = names.get(item["user_id"]) or "Anonim " + item["id"][:4]
        del item["user_id"]
    return inbox


@app.post("/inbox/{thread_id}/reply")
def reply_to_thread(thread_id: str, body: Reply, volunteer=Depends(require_volunteer)):
    """Voluntarul răspunde într-o conversație."""
    check_thread_id(thread_id)
    message_id = add_message(thread_id, "volunteer", clean_text(body.text))
    if message_id is None:
        raise HTTPException(status_code=404, detail="Conversația nu există.")
    return {"id": message_id}


@app.post("/inbox/{thread_id}/read")
def mark_thread_read(thread_id: str, volunteer=Depends(require_volunteer)):
    check_thread_id(thread_id)
    mark_read(thread_id)
    return {"ok": True}


@app.delete("/inbox/{thread_id}")
def delete_inbox_thread(thread_id: str, volunteer=Depends(require_volunteer)):
    """Voluntarul șterge o conversație din inbox."""
    check_thread_id(thread_id)
    delete_thread(thread_id)
    return {"ok": True}
