import { useState, useRef, useEffect } from 'react'
import { sendChatMessage, getChatMessages, deleteChat } from './api.js'
import { newConversation as makeConversation } from './chatUtils.js'

// Conversațiile vin din App (user = contul logat sau null). Utilizatorii neautentificați nu au nimic salvat:
// la refresh sau la închiderea paginii conversația dispare.
function ChatPage({ user, conversations, setConversations, activeId, setActiveId }) {
  const token = user?.token
  const [text, setText] = useState('') // ce scrie userul
  const [loading, setLoading] = useState(false) // true cât se trimite mesajul
  const [error, setError] = useState('')

  const active = conversations.find((c) => c.id === activeId) || conversations[0]

  // Scroll automat la ultimul mesaj
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active.messages, loading])

  // La 5 secunde întreabă serverul dacă un voluntar a răspuns și adaugă răspunsurile noi
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  useEffect(() => {
    async function checkReplies() {
      for (const c of conversationsRef.current) {
        if (c.messages.length === 0) continue // conversație încă necomunicată serverului
        try {
          const fromServer = await getChatMessages(c.id, token)
          const replies = fromServer.filter((m) => m.from === 'volunteer')
          setConversations((prev) =>
            prev.map((x) => {
              if (x.id !== c.id) return x
              const fresh = replies.filter((r) => !x.messages.some((m) => m.id === r.id))
              if (fresh.length === 0) return x
              return { ...x, messages: [...x.messages, ...fresh.map((r) => ({ id: r.id, from: 'bot', text: r.text }))] }
            })
          )
        } catch {} // serverul poate fi oprit; încercăm din nou peste 5 secunde
      }
    }
    checkReplies()
    const timer = setInterval(checkReplies, 5000)
    return () => clearInterval(timer)
  }, [token])

  function newConversation() {
    const conversation = makeConversation()
    setConversations((prev) => [conversation, ...prev])
    setActiveId(conversation.id)
  }

  // Șterge o conversație (și de pe server, dacă are mesaje); dacă era deschisă, trece la alta
  async function deleteConversation(id) {
    if (!window.confirm('Ștergi definitiv această conversație? Nu se poate anula.')) return
    const target = conversations.find((c) => c.id === id)
    if (target.messages.length > 0) {
      try {
        await deleteChat(id, token)
      } catch (err) {
        setError(err.message)
        return
      }
    }
    setError('')
    const left = conversations.filter((c) => c.id !== id)
    if (left.length === 0) {
      const fresh = makeConversation()
      setConversations([fresh])
      setActiveId(fresh.id)
      return
    }
    setConversations(left)
    if (id === active.id) setActiveId(left[0].id)
  }

  // Adaugă un mesaj în conversația cu id-ul dat; primul mesaj al userului devine titlul
  function addMessage(id, message) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== id ? c : {
          ...c,
          title: c.messages.length === 0 ? message.text.slice(0, 30) : c.title,
          messages: [...c.messages, message],
        }
      )
    )
  }

  async function send(content) {
    if (content.trim() === '' || loading) return
    const id = active.id
    addMessage(id, { from: 'user', text: content })
    setText('')
    setError('')
    setLoading(true)
    try {
      await sendChatMessage(id, content, token) // trimite mesajul către voluntari (api.js)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="chat-layout">
      {/* STÂNGA: istoricul conversațiilor */}
      <aside className="history glass">
        <button className="cta-btn" onClick={newConversation}>+ Conversație nouă</button>
        <h3 className="side-title">Istoric</h3>
        {conversations.map((c) => (
          <div key={c.id} className="item-row">
            <button className={c.id === active.id ? 'item active' : 'item'} onClick={() => setActiveId(c.id)}>
              {c.title}
            </button>
            <button className="del-btn" title="Șterge conversația" aria-label="Șterge conversația" onClick={() => deleteConversation(c.id)}>×</button>
          </div>
        ))}
        {!user && <p className="muted small">Nu ești autentificat(ă): conversațiile nu se păstrează după ce închizi sau reîncarci pagina. Creează un cont ca să le păstrezi.</p>}
      </aside>

      {/* DREAPTA: chatbox-ul */}
      <section className="chatbox glass">
        <div className="messages">
          {active.messages.length === 0 && (
            <div className="hero">
              <h1>Cum te simți <span className="gradient-text">astăzi?</span></h1>
              <p>Spune-ne ce te frământă. Aici ai un spațiu sigur, fără judecată.</p>
            </div>
          )}
          {active.messages.map((m, i) => (
            <div key={i} className={'bubble ' + m.from}>{m.text}</div>
          ))}
          {!error && active.messages.length > 0 && active.messages[active.messages.length - 1].from === 'user' && (
            <p className="muted small">Mesajul tău a ajuns la voluntari. Răspunsul va apărea aici.</p>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="error">{error}</p>}

        {/* Enter în câmpul de text trimite formularul */}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text) }}>
          <input placeholder="Scrie aici ce simți..." value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="send-btn" disabled={loading}>→</button>
        </form>
      </section>
    </div>
  )
}

export default ChatPage
