import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from './api.js'

const suggestions = ['Mă simt copleșit(ă)', 'Nu pot dormi bine', 'Am multă anxietate', 'Am probleme în relații']

function ChatPage() {
  // Istoricul din stânga: lista conversațiilor, fiecare cu id, titlu și mesaje
  const [conversations, setConversations] = useState([{ id: 1, title: 'Conversație nouă', messages: [] }])
  const [activeId, setActiveId] = useState(1) // conversația deschisă
  const [text, setText] = useState('') // ce scrie userul
  const [loading, setLoading] = useState(false) // true cât așteptăm răspunsul
  const [error, setError] = useState('')

  const active = conversations.find((c) => c.id === activeId)

  // Scroll automat la ultimul mesaj
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active.messages, loading])

  function newConversation() {
    const id = Date.now() // id unic
    setConversations([{ id, title: 'Conversație nouă', messages: [] }, ...conversations])
    setActiveId(id)
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
    const id = activeId
    addMessage(id, { from: 'user', text: content })
    setText('')
    setError('')
    setLoading(true)
    try {
      addMessage(id, { from: 'bot', text: await sendChatMessage(content) }) // funcția din api.js
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
          <button key={c.id} className={c.id === activeId ? 'item active' : 'item'} onClick={() => setActiveId(c.id)}>
            {c.title}
          </button>
        ))}
      </aside>

      {/* DREAPTA: chatbox-ul */}
      <section className="chatbox glass">
        <div className="messages">
          {active.messages.length === 0 && (
            <div className="hero">
              <h1>Cum te simți <span className="gradient-text">astăzi?</span></h1>
              <p>Spune-ne ce te frământă. Aici ai un spațiu sigur, fără judecată.</p>
              {suggestions.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          {active.messages.map((m, i) => (
            <div key={i} className={'bubble ' + m.from}>{m.text}</div>
          ))}
          {loading && <div className="bubble bot">...</div>}
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
