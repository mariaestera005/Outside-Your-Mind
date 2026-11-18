export const API_URL = 'http://localhost:8000'

// true = datele de test pentru podcasturi și inbox apar fără backend; pune false când backend-ul e gata
export const DEV_PREVIEW = true

// Cărți: o listă de { id, title, author, category, description }
export async function getBooks() {
  const res = await fetch(`${API_URL}/books`)
  if (!res.ok) throw new Error(`Eroare la încărcarea cărților (${res.status})`)
  return res.json()
}

// Podcasturi: o listă de { id, title, author, category, description, link }
export async function getPodcasts() {
  if (DEV_PREVIEW) {
    return [{ id: 1, title: 'Podcast demo', author: 'Gazdă demo', category: 'Demo',
      description: 'Podcast de previzualizare. Dispare când pui DEV_PREVIEW = false.', link: '' }]
  }
  const res = await fetch(`${API_URL}/podcasts`)
  if (!res.ok) throw new Error(`Eroare la încărcarea podcasturilor (${res.status})`)
  return res.json()
}

// Chat: trimite mesajul userului și returnează textul răspunsului
export async function sendChatMessage(text) {
  if (DEV_PREVIEW) return 'Răspuns demo. Aici va apărea răspunsul real când conectezi backend-ul.'
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Eroare la trimiterea mesajului (${res.status})`)
  const data = await res.json()
  return data.reply
}

// Login: returnează { name, role } unde role este 'user' sau 'volunteer'
export async function login(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Eroare la autentificare (${res.status})`)
  return res.json()
}

// Voluntar: lista de mesaje { id, from, subject, date, read, text, replies: [] }
export async function getInbox() {
  if (DEV_PREVIEW) {
    return [{ id: 1, from: 'Utilizator demo', subject: 'Mesaj demo', date: 'azi', read: false,
      text: 'Mesaj de previzualizare. Dispare când pui DEV_PREVIEW = false.', replies: [] }]
  }
  const res = await fetch(`${API_URL}/inbox`)
  if (!res.ok) throw new Error(`Eroare la încărcarea inbox-ului (${res.status})`)
  return res.json()
}

// Voluntar: trimite răspunsul la un mesaj
export async function sendReply(messageId, text) {
  if (DEV_PREVIEW) return
  const res = await fetch(`${API_URL}/inbox/${messageId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Eroare la trimiterea răspunsului (${res.status})`)
  return res.json()
}
