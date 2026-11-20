import os
import sqlite3

# Căile fișierelor, relative la folderul backend (să meargă de oriunde pornești serverul)
FOLDER = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(FOLDER, "books.db")
SQL_FILE = os.path.join(FOLDER, "books.sql")


def create_database():
    # Dacă books.db nu există încă, îl creăm rulând books.sql (tabel + cele 58 de cărți)
    if os.path.exists(DB_FILE):
        return
    connection = sqlite3.connect(DB_FILE)
    with open(SQL_FILE, encoding="utf-8") as file:
        connection.executescript(file.read())
    connection.close()


def get_all_books():
    create_database()
    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row  # ca să putem transforma fiecare rând în dicționar
    rows = connection.execute("SELECT * FROM books ORDER BY id").fetchall()
    connection.close()
    return [dict(row) for row in rows]


# ---------- Podcasturi ----------
# Bază de date separată (podcasts.db), creată automat din podcasts.sql, ca la cărți
PODCASTS_DB_FILE = os.path.join(FOLDER, "podcasts.db")
PODCASTS_SQL_FILE = os.path.join(FOLDER, "podcasts.sql")


def create_podcasts_database():
    if os.path.exists(PODCASTS_DB_FILE):
        return
    connection = sqlite3.connect(PODCASTS_DB_FILE)
    with open(PODCASTS_SQL_FILE, encoding="utf-8") as file:
        connection.executescript(file.read())
    connection.close()


def get_all_podcasts():
    create_podcasts_database()
    connection = sqlite3.connect(PODCASTS_DB_FILE)
    connection.row_factory = sqlite3.Row
    rows = connection.execute("SELECT * FROM podcasts ORDER BY id").fetchall()
    connection.close()
    return [dict(row) for row in rows]
