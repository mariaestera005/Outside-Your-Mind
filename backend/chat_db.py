# Baza de date pentru chat: conversațiile utilizatorilor și răspunsurile voluntarilor.
# Fișierul chat.db se creează singur la prima folosire.
import os
import sqlite3
from contextlib import closing

FOLDER = os.path.dirname(os.path.abspath(__file__))
CHAT_FILE = os.path.join(FOLDER, "chat.db")


def connect():
    connection = sqlite3.connect(CHAT_FILE)
    connection.row_factory = sqlite3.Row
    # O conversație (thread) are mai multe mesaje; last_read_id = ultimul mesaj văzut de voluntar
    connection.execute(
        "create table if not exists threads ("
        " id text primary key,"
        " last_read_id integer not null default 0,"
        " title text,"  # rezumatul scurt făcut de AI; gol până e gata
        " user_id integer)"  # contul care a început conversația; gol = utilizator neautentificat
    )
    # Dacă chat.db a fost creat înainte să existe coloana title, o adăugăm
    columns = [row["name"] for row in connection.execute("pragma table_info(threads)")]
    if "title" not in columns:
        connection.execute("alter table threads add column title text")
    if "user_id" not in columns:
        connection.execute("alter table threads add column user_id integer")
    connection.execute(
        "create table if not exists messages ("
        " id integer primary key autoincrement,"
        " thread_id text not null references threads(id),"
        " sender text not null check (sender in ('user', 'volunteer')),"
        " text text not null,"
        " created_at text not null default (datetime('now')))"
    )
    return connection


def add_message(thread_id, sender, text, user_id=None):
    """Salvează un mesaj și returnează id-ul lui. Pentru voluntar, conversația trebuie să existe deja."""
    with closing(connect()) as connection:
        if sender == "user":
            connection.execute("insert or ignore into threads (id, user_id) values (?, ?)", (thread_id, user_id))
        elif connection.execute("select 1 from threads where id = ?", (thread_id,)).fetchone() is None:
            return None
        cursor = connection.execute(
            "insert into messages (thread_id, sender, text) values (?, ?, ?)", (thread_id, sender, text)
        )
        connection.commit()
        return cursor.lastrowid


def get_thread_messages(thread_id):
    """Toate mesajele unei conversații, în ordine, pentru chatul utilizatorului."""
    with closing(connect()) as connection:
        rows = connection.execute(
            "select id, sender, text from messages where thread_id = ? order by id", (thread_id,)
        ).fetchall()
    return [{"id": r["id"], "from": r["sender"], "text": r["text"]} for r in rows]


def short_text(text, limit=50):
    """Începutul mesajului, tăiat la sfârșit de cuvânt."""
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def get_inbox():
    """Conversațiile pentru voluntar, cele cu activitate recentă primele."""
    with closing(connect()) as connection:
        threads = connection.execute("select id, last_read_id, title, user_id from threads").fetchall()
        rows = connection.execute(
            "select id, thread_id, sender, text, created_at from messages order by id"
        ).fetchall()

    by_thread = {}
    for row in rows:
        by_thread.setdefault(row["thread_id"], []).append(row)

    inbox = []
    for thread in threads:
        messages = by_thread.get(thread["id"], [])
        user_messages = [m for m in messages if m["sender"] == "user"]
        if not user_messages:
            continue
        inbox.append({
            "id": thread["id"],
            "from": "Utilizator " + thread["id"][:4],
            "title": thread["title"],
            "user_id": thread["user_id"],
            "subject": thread["title"] or short_text(user_messages[0]["text"]),  # rezumatul AI, altfel începutul mesajului
            "date": messages[-1]["created_at"].replace(" ", "T") + "Z",  # UTC, formatat în browser
            "read": user_messages[-1]["id"] <= thread["last_read_id"],
            "messages": [{"id": m["id"], "from": m["sender"], "text": m["text"]} for m in messages],
            "_last": messages[-1]["id"],
        })
    inbox.sort(key=lambda item: item["_last"], reverse=True)
    for item in inbox:
        del item["_last"]
    return inbox


def mark_read(thread_id):
    with closing(connect()) as connection:
        connection.execute(
            "update threads set last_read_id = (select coalesce(max(id), 0) from messages where thread_id = ?)"
            " where id = ?",
            (thread_id, thread_id),
        )
        connection.commit()


def get_user_texts(thread_id):
    """Mesajele utilizatorului dintr-o conversație și titlul curent, pentru rezumat."""
    with closing(connect()) as connection:
        thread = connection.execute("select title from threads where id = ?", (thread_id,)).fetchone()
        rows = connection.execute(
            "select text from messages where thread_id = ? and sender = 'user' order by id", (thread_id,)
        ).fetchall()
    return (thread["title"] if thread else None), [r["text"] for r in rows]


def set_title(thread_id, title):
    with closing(connect()) as connection:
        connection.execute("update threads set title = ? where id = ?", (title, thread_id))
        connection.commit()


def delete_thread(thread_id):
    """Șterge definitiv o conversație și toate mesajele ei. Returnează False dacă nu exista."""
    with closing(connect()) as connection:
        connection.execute("delete from messages where thread_id = ?", (thread_id,))
        cursor = connection.execute("delete from threads where id = ?", (thread_id,))
        connection.commit()
        return cursor.rowcount > 0


def get_thread_owner(thread_id):
    """Returnează (există, id_cont). id_cont e None pentru conversațiile neautentificate."""
    with closing(connect()) as connection:
        row = connection.execute("select user_id from threads where id = ?", (thread_id,)).fetchone()
    return (row is not None), (row["user_id"] if row else None)


def get_user_threads(user_id):
    """Conversațiile unui cont, cele mai recente primele (pentru istoricul din chat)."""
    with closing(connect()) as connection:
        rows = connection.execute(
            "select m.id, m.thread_id, m.sender, m.text from messages m"
            " join threads t on t.id = m.thread_id where t.user_id = ? order by m.id",
            (user_id,),
        ).fetchall()
    by_thread = {}
    for row in rows:
        by_thread.setdefault(row["thread_id"], []).append({"id": row["id"], "from": row["sender"], "text": row["text"]})
    threads = [{"id": thread_id, "messages": messages} for thread_id, messages in by_thread.items()]
    threads.sort(key=lambda t: t["messages"][-1]["id"], reverse=True)
    return threads


def purge_anonymous(hours=24):
    """Șterge conversațiile neautentificate fără activitate de peste `hours` ore. Conversațiile cu cont nu se ating."""
    with closing(connect()) as connection:
        limit = f"-{int(hours)} hours"
        connection.execute(
            "delete from messages where thread_id in ("
            " select t.id from threads t where t.user_id is null and"
            " coalesce((select max(created_at) from messages where thread_id = t.id), '0') < datetime('now', ?))",
            (limit,),
        )
        connection.execute(
            "delete from threads where user_id is null and id not in (select distinct thread_id from messages)"
        )
        connection.commit()
