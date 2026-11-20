export const API_URL = 'http://localhost:8000'

// true = apar butoanele de previzualizare din pagina de login; pune false în versiunea finală
export const DEV_PREVIEW = true

// Header-ul cu tokenul contului logat; fără token (utilizator neautentificat) nu se trimite nimic
function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// O cerere către backend. La eroare aruncă un Error cu mesajul pentru utilizator (cel trimis de server, dacă există)
async function request(path, { method = 'GET', body, token } = {}, failMessage = 'A apărut o eroare. Încearcă din nou.') {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders(token) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Nu m-am putut conecta la server. Pornește backend-ul.')
  }
  if (!res.ok) {
    let message = failMessage
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') message = data.detail
    } catch {}
    throw new Error(message)
  }
  return res.json()
}

// Cărți: o listă de { id, title, author, category, description }
export async function getBooks() {
  const res = await fetch(`${API_URL}/books`)
  if (!res.ok) throw new Error(`Eroare la încărcarea cărților (${res.status})`)
  return res.json()
}

// Podcasturi: o listă de { id, title, author, category, description, link, youtube_link, voxa_link }
export async function getPodcasts() {
  const res = await fetch(`${API_URL}/podcasts`)
  if (!res.ok) throw new Error(`Eroare la încărcarea podcasturilor (${res.status})`)
  return res.json()
}

// ---------- Conturi ----------
// Toate returnează { name, email, role, token }; role este 'user' sau 'volunteer'
export const register = (name, email, password) =>
  request('/register', { method: 'POST', body: { name, email, password } }, 'Contul nu a putut fi creat.')
export const login = (email, password) =>
  request('/login', { method: 'POST', body: { email, password } }, 'Autentificarea a eșuat.')
// Login separat pentru voluntari (conturile lor se creează de echipă, nu din site)
export const volunteerLogin = (email, password) =>
  request('/volunteer/login', { method: 'POST', body: { email, password } }, 'Autentificarea a eșuat.')
// Cine e logat cu tokenul dat (pentru a rămâne logat după refresh): { name, email, role }
export const getMe = (token) => request('/me', { token }, 'Sesiunea a expirat.')
export const logout = (token) => request('/logout', { method: 'POST', token }).catch(() => {})

// ---------- Chat (utilizator) ----------
// token e opțional: fără el conversația e anonimă; cu el e legată de cont
export const sendChatMessage = (threadId, text, token) =>
  request('/chat', { method: 'POST', body: { thread_id: threadId, text }, token }, 'Mesajul nu a putut fi trimis.')
// Mesajele conversației, inclusiv răspunsurile voluntarilor: [{ id, from: 'user' | 'volunteer', text }]
export const getChatMessages = (threadId, token) => request(`/chat/${threadId}`, { token }, 'Conversația nu a putut fi citită.')
// Istoricul contului logat: [{ id, messages: [...] }]
export const getMyChats = (token) => request('/chat', { token }, 'Istoricul nu a putut fi încărcat.')
// Șterge definitiv o conversație (dispare și din inbox-ul voluntarilor)
export const deleteChat = (threadId, token) =>
  request(`/chat/${threadId}`, { method: 'DELETE', token }, 'Conversația nu a putut fi ștearsă.')

// ---------- Inbox (voluntar) ----------
// Conversațiile { id, from, subject, date, read, messages: [{ id, from: 'user' | 'volunteer', text }] }
export const getInbox = (token) => request('/inbox', { token }, 'Inbox-ul nu a putut fi încărcat.')
export const sendReply = (threadId, text, token) =>
  request(`/inbox/${threadId}/reply`, { method: 'POST', body: { text }, token }, 'Răspunsul nu a putut fi trimis.')
export const markRead = (threadId, token) => request(`/inbox/${threadId}/read`, { method: 'POST', token })
export const deleteThread = (threadId, token) =>
  request(`/inbox/${threadId}`, { method: 'DELETE', token }, 'Conversația nu a putut fi ștearsă.')

// ---------- Jurnal ----------
// Jurnalul folosește tokenul contului (Authorization), la fel ca restul zonelor cu cont.
async function journalRequest(user, path, options = {}) {
  const res = await fetch(`${API_URL}/journal${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(user.token), ...options.headers },
  })
  if (!res.ok) throw new Error(`Eroare la jurnal (${res.status})`)
  return res.status === 204 ? null : res.json()
}

// Caiete: o listă de { id, title, cover_color, default_style, entry_count }
export const getNotebooks = (user) => journalRequest(user, '/notebooks')
export const createNotebook = (user, body) => journalRequest(user, '/notebooks', { method: 'POST', body: JSON.stringify(body) })
export const deleteNotebook = (user, id) => journalRequest(user, `/notebooks/${id}`, { method: 'DELETE' })

// Pagini: { id, title, content, mood, style, entry_date }
export const getEntries = (user, notebookId, search = '') =>
  journalRequest(user, `/notebooks/${notebookId}/entries${search ? `?q=${encodeURIComponent(search)}` : ''}`)
export const createEntry = (user, notebookId, body = {}) =>
  journalRequest(user, `/notebooks/${notebookId}/entries`, { method: 'POST', body: JSON.stringify(body) })
export const updateEntry = (user, id, body) => journalRequest(user, `/entries/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteEntry = (user, id) => journalRequest(user, `/entries/${id}`, { method: 'DELETE' })
