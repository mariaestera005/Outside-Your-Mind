import { useState, useEffect } from 'react'
import { getInbox, sendReply } from './api.js'

function VolunteerPage() {
  const [messages, setMessages] = useState([])
  const [selectedId, setSelectedId] = useState(null) // mesajul deschis
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getInbox().then(setMessages) // aduce mesajele din api.js, o singură dată
  }, [])

  const selected = messages.find((m) => m.id === selectedId)

  // Deschide un mesaj și îl marchează ca citit
  function open(id) {
    setSelectedId(id)
    setMessages(messages.map((m) => (m.id === id ? { ...m, read: true } : m)))
  }

  async function handleReply(e) {
    e.preventDefault()
    if (reply.trim() === '') return
    try {
      await sendReply(selectedId, reply) // din api.js
      setMessages(messages.map((m) => (m.id === selectedId ? { ...m, replies: [...m.replies, reply] } : m)))
      setReply('')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="chat-layout">
      {/* STÂNGA: lista de mesaje */}
      <aside className="history glass">
        <h3 className="side-title">Inbox</h3>
        {messages.length === 0 && <p className="muted small">Nu ai mesaje.</p>}
        {messages.map((m) => (
          <button key={m.id} className={m.id === selectedId ? 'item active' : 'item'} onClick={() => open(m.id)}>
            <b>{m.read ? m.from : '● ' + m.from}</b>
            <span className="muted small">{m.subject}</span>
          </button>
        ))}
      </aside>

      {/* DREAPTA: mesajul deschis + răspunsul */}
      <section className="chatbox glass">
        {!selected ? (
          <p className="empty">Alege un mesaj din stânga ca să îl citești.</p>
        ) : (
          <>
            <h1 className="page-title">{selected.subject}</h1>
            <p className="muted">De la {selected.from} · {selected.date}</p>
            <div className="messages">
              <div className="bubble bot">{selected.text}</div>
              {selected.replies.map((r, i) => <div key={i} className="bubble user">{r}</div>)}
            </div>
            {error && <p className="error">{error}</p>}
            <form className="form" onSubmit={handleReply}>
              <textarea rows="3" placeholder="Scrie răspunsul tău..." value={reply} onChange={(e) => setReply(e.target.value)} />
              <button type="submit" className="cta-btn">Trimite răspunsul</button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

export default VolunteerPage
