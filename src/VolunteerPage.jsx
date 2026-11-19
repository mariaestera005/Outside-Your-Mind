import { useState, useEffect, useRef } from 'react'
import { getInbox, sendReply, markRead, deleteThread } from './api.js'

// Data din server (UTC) afișată pe ora din România
function formatDate(iso) {
  return new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function VolunteerPage({ user }) {
  const token = user.token
  const [messages, setMessages] = useState([]) // conversațiile din inbox
  const [selectedId, setSelectedId] = useState(null) // conversația deschisă
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const selectedIdRef = useRef(null)
  selectedIdRef.current = selectedId

  // Aduce inbox-ul acum și apoi la fiecare 5 secunde, ca mesajele noi să apară singure
  async function refresh() {
    try {
      const inbox = await getInbox(token)
      const openId = selectedIdRef.current
      // Conversația deschisă rămâne marcată ca citită chiar dacă sosesc mesaje noi
      if (openId && inbox.some((m) => m.id === openId && !m.read)) markRead(openId, token).catch(() => {})
      setMessages(inbox.map((m) => (m.id === openId ? { ...m, read: true } : m)))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [])

  const selected = messages.find((m) => m.id === selectedId)

  // Deschide o conversație și o marchează ca citită
  function open(id) {
    setSelectedId(id)
    setMessages(messages.map((m) => (m.id === id ? { ...m, read: true } : m)))
    markRead(id, token).catch(() => {})
  }

  // Șterge definitiv conversația deschisă (cu confirmare)
  async function handleDelete() {
    if (!window.confirm('Ștergi definitiv această conversație? Nu se poate anula.')) return
    try {
      await deleteThread(selectedId, token)
      setMessages(messages.filter((m) => m.id !== selectedId))
      setSelectedId(null)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReply(e) {
    e.preventDefault()
    if (reply.trim() === '') return
    try {
      await sendReply(selectedId, reply, token) // din api.js
      setReply('')
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="chat-layout">
      {/* STÂNGA: lista de conversații */}
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

      {/* DREAPTA: conversația deschisă + răspunsul */}
      <section className="chatbox glass">
        {!selected ? (
          <p className="empty">Alege o conversație din stânga ca să o citești.</p>
        ) : (
          <>
            <div className="thread-head">
              <h1 className="page-title">{selected.subject}</h1>
              <button type="button" className="danger-btn" onClick={handleDelete}>Șterge conversația</button>
            </div>
            <p className="muted">De la {selected.from} · {formatDate(selected.date)}</p>
            <div className="messages">
              {selected.messages.map((m) => (
                <div key={m.id} className={m.from === 'user' ? 'bubble bot' : 'bubble user'}>{m.text}</div>
              ))}
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
