# Serverul (backend-ul). Se pornește cu:  python -m uvicorn main:app --reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_all_books
from journal import router as journal_router

app = FastAPI()

# Site-ul React rulează pe portul 5173, iar serverul pe 8000.
# Fără linia asta, browserul ar bloca cererile dintre ele.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Jurnalul (caiete + pagini personalizabile) trăiește în journal.py
app.include_router(journal_router)


@app.get("/books")
def read_books():
    """Adresa http://localhost:8000/books returnează lista de cărți."""
    return get_all_books()
