import { useState } from 'react'
import Background from './Background.jsx'
import Navbar from './Navbar.jsx'
import ChatPage from './ChatPage.jsx'
import BooksPage from './BooksPage.jsx'
import PodcastsPage from './PodcastsPage.jsx'
import ContactPage from './ContactPage.jsx'
import LoginPage from './LoginPage.jsx'
import VolunteerPage from './VolunteerPage.jsx'

function App() {
  const [page, setPage] = useState('chat') 
  const [user, setUser] = useState(null) 

  function handleLogin(loggedUser) {
    setUser(loggedUser)
    setPage('chat')
  }
  function handleLogout() {
    setUser(null)
    setPage('chat')
  }

  
  const pages = {
    chat: <ChatPage />,
    books: <BooksPage />,
    podcasts: <PodcastsPage />,
    contact: <ContactPage />,
    login: <LoginPage onLogin={handleLogin} />,
  }

  return (
    <>
      <Background />
      <div className="app">
        <Navbar page={page} setPage={setPage} user={user} onLogout={handleLogout} />
        {/* Voluntarul vede mereu altă interfață; key face ca animația să pornească la fiecare pagină */}
        <main className="main fade-in" key={page}>
          {user?.role === 'volunteer' ? <VolunteerPage /> : pages[page]}
        </main>
        <footer className="footer">Acest site nu înlocuiește un specialist. Dacă ești în pericol, sună la 112.</footer>
      </div>
    </>
  )
}

export default App
