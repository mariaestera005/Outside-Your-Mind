# Rulare: pip install pytest httpx  ->  python -m pytest test_journal.py
import os
import tempfile

from fastapi import FastAPI
from fastapi.testclient import TestClient

import auth
import journal

journal.DB_FILE = os.path.join(tempfile.mkdtemp(), "test.db")  # nu atingem journal.db real
app = FastAPI()
app.include_router(journal.router)
c = TestClient(app)
auth.USERS_FILE = os.path.join(tempfile.mkdtemp(), "users_test.db")  # nu atingem users.db real


def account(name):
    """Creează un cont de test și returnează headerul de autentificare (token), ca în site."""
    user = auth.register_user(name.lower().replace(" ", "-") + "@test.ro", name, "parola-lunga-123")
    return {"Authorization": "Bearer " + auth.create_session(user["id"])}


A, B = account("Ana"), account("Bob")


def test_flux_complet():
    assert c.get("/journal/notebooks").status_code == 401
    nb = c.post("/journal/notebooks", json={"title": "Seara", "default_style": {"paper": "dotted", "font": "Caveat"}}, headers=A).json()
    e = c.post(f"/journal/notebooks/{nb['id']}/entries", json={"title": "Azi", "content": "A fost o zi bună", "mood": "calm"}, headers=A).json()
    assert e["style"]["paper"] == "dotted"  # moștenește stilul caietului
    new_style = {"background": "#112233", "paper": "grid", "font": "Lora", "font_size": 20, "text_color": "#ffffff"}
    r = c.patch(f"/journal/entries/{e['id']}", json={"style": new_style, "mood": None}, headers=A).json()
    assert r["style"]["paper"] == "grid" and r["mood"] is None and r["content"] == "A fost o zi bună"
    assert len(c.get(f"/journal/notebooks/{nb['id']}/entries?q=bună", headers=A).json()) == 1
    assert len(c.get(f"/journal/notebooks/{nb['id']}/entries?q=zzz", headers=A).json()) == 0
    assert len(c.get(f"/journal/notebooks/{nb['id']}/entries?q=%25", headers=A).json()) == 0  # % nu e wildcard
    assert c.get("/journal/notebooks", headers=A).json()[0]["entry_count"] == 1


def test_validare():
    nb = c.post("/journal/notebooks", json={"title": "x"}, headers=A).json()
    url = f"/journal/notebooks/{nb['id']}/entries"
    assert c.post(url, json={"style": {"background": "red;} body{display:none"}}, headers=A).status_code == 422
    assert c.post(url, json={"style": {"font": "Comic"}}, headers=A).status_code == 422
    assert c.post(url, json={"mood": "evil"}, headers=A).status_code == 422


def test_confidentialitate():
    nb = c.post("/journal/notebooks", json={"title": "privat"}, headers=A).json()
    e = c.post(f"/journal/notebooks/{nb['id']}/entries", json={"content": "secret"}, headers=A).json()
    assert c.get(f"/journal/entries/{e['id']}", headers=B).status_code == 404
    assert c.patch(f"/journal/entries/{e['id']}", json={"title": "hack"}, headers=B).status_code == 404
    assert c.delete(f"/journal/entries/{e['id']}", headers=B).status_code == 404
    assert c.get(f"/journal/notebooks/{nb['id']}/entries", headers=B).status_code == 404
    assert c.delete(f"/journal/notebooks/{nb['id']}", headers=B).status_code == 404


def test_stergere_in_cascada_si_nume_complex():
    h = account("Maria-Estera Chelan")  # nume cu diacritice și cratimă
    nb = c.post("/journal/notebooks", json={"title": "C"}, headers=h).json()
    e = c.post(f"/journal/notebooks/{nb['id']}/entries", json={"content": "x"}, headers=h).json()
    assert c.delete(f"/journal/notebooks/{nb['id']}", headers=h).status_code == 204
    assert c.get(f"/journal/entries/{e['id']}", headers=h).status_code == 404
