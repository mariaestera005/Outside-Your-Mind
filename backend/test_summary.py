# Test rapid pentru rezumatul AI. Rulează din folderul backend:  python test_summary.py
# Arată exact de ce nu merge (cheie, model, rețea). Nu salvează nimic în baza de date.
import json
import os
import urllib.error
import urllib.request

import summarizer  # încarcă și .env

key = os.environ.get("GROQ_API_KEY")
print("1. Cheie găsită în .env:", "DA (începe cu " + key[:4] + ", lungime " + str(len(key)) + ")" if key else "NU")
print("2. Model folosit:", summarizer.MODEL)


def call(url, payload=None):
    data = json.dumps(payload).encode() if payload else None
    request = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json",
        "Accept": "application/json", "User-Agent": "outside-your-mind/1.0",
    })
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")[:400]
    except Exception as error:
        return None, repr(error)


status, body = call("https://api.groq.com/openai/v1/models")
print("3. Lista de modele -> status:", status)
if status == 200:
    ids = sorted(m["id"] for m in body["data"])
    print("   Modele disponibile:", ", ".join(ids))
    print("   Modelul tău e în listă:", summarizer.MODEL in ids)
else:
    print("   Răspuns:", body)

print("4. Rezumat de test ->", summarizer.summarize(["Mă simt stresat din cauza examenelor și nu pot dormi."]))
