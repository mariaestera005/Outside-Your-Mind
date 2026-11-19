import { useState, useEffect } from 'react'
import Background from './Background.jsx'
import Navbar from './Navbar.jsx'
import ChatPage from './ChatPage.jsx'
import BooksPage from './BooksPage.jsx'
import PodcastsPage from './PodcastsPage.jsx'
import ContactPage from './ContactPage.jsx'
import LoginPage from './LoginPage.jsx'
import VolunteerLoginPage from './VolunteerLoginPage.jsx'
import VolunteerPage from './VolunteerPage.jsx'
import JournalPage from './JournalPage.jsx'
import { getMe, getMyChats, logout } from './api.js'
import { newConversation, fromServer } from './chatUtils.js'

const TOKEN_KEY = 'oym_token' // tokenul de sesiune, ca să rămâi logat(ă) după refresh

function App() {
  const [page, setPage] = useState('chat')
  const [user, setUser] = useState(null) // { name, email, role, token } sau null dacă nu e logat
  const [checking, setChecking] = useState(() => !!localStorage.getItem(TOKEN_KEY)) // true cât verificăm sesiunea salvată

  // Conversațiile din chat trăiesc aici, ca să nu dispară când schimbi pagina. Pentru utilizatorii
  // neautentificați rămân doar în memorie: dispar la refresh sau la închiderea paginii.
  const [conversations, setConversations] = useState(() => [newConversation()])
  const [activeId, setActiveId] = useState(() => conversations[0].id)

  // La pornire: șterge conversațiile salvate local de versiunile vechi și, dacă există o sesiune salvată, te loghează din nou
  useEffect(() => {
    try { localStorage.removeItem('oym_conversations') } catch {}
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    getMe(token)
      .then((me) => setUser({ ...me, token }))
      .catch((err) => {
        // Tokenul se șterge doar dacă serverul a spus că sesiunea e invalidă, nu dacă e doar oprit
        if (!err.message.startsWith('Nu m-am putut conecta')) localStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => setChecking(false))
  }, [])

  // La login: încarcă istoricul contului. La logout (sau fără cont): chat gol, nimic păstrat.
  useEffect(() => {
    if (checking) return
    let cancelled = false
    const fresh = newConversation()
    setConversations([fresh])
    setActiveId(fresh.id)
    if (user && user.role !== 'volunteer') {
      getMyChats(user.token)
        .then((threads) => {
          if (!cancelled) setConversations([fresh, ...threads.map(fromServer)])
        })
        .catch(() => {}) // fără istoric dacă serverul nu răspunde; chatul gol rămâne
    }
    return () => { cancelled = true }
  }, [user?.email, checking])

  function handleLogin(loggedUser) {
    localStorage.setItem(TOKEN_KEY, loggedUser.token)
    setUser(loggedUser)
    setPage('chat')
  }
  function handleLogout() {
    if (user) logout(user.token)
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setPage('chat')
  }

  const pages = {
    chat: <ChatPage user={user} conversations={conversations} setConversations={setConversations} activeId={activeId} setActiveId={setActiveId} />,
    books: <BooksPage />,
    podcasts: <PodcastsPage />,
    contact: <ContactPage />,
    journal: <JournalPage user={user} setPage={setPage} />,
    login: <LoginPage onLogin={handleLogin} setPage={setPage} />,
    'volunteer-login': <VolunteerLoginPage onLogin={handleLogin} setPage={setPage} />,
  }

  return (
    <>
      <Background />
      <div className="app">
        <Navbar page={page} setPage={setPage} user={user} onLogout={handleLogout} />
        {/* Voluntarul vede mereu altă interfață; key face ca animația să pornească la fiecare pagină */}
        <main className="main fade-in" key={page}>
          {checking ? <p className="empty">Se încarcă...</p> : user?.role === 'volunteer' ? <VolunteerPage user={user} /> : pages[page]}
        </main>
        <footer className="footer">Acest site nu înlocuiește un specialist. Dacă ești în pericol, sună la 112.</footer>
      </div>
    </>
  )
}

export default App
