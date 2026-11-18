import { useState, useEffect } from 'react'
import { getNotebooks, createNotebook, deleteNotebook, getEntries, createEntry, deleteEntry } from './api.js'
import { COVER_COLORS, MOODS } from './journalConstants.js'
import EntryEditor from './EntryEditor.jsx'
import './journal.css'

const moodEmoji = (id) => MOODS.find((m) => m.id === id)?.emoji ?? '📝'

// Pagina de jurnal: lista de caiete -> paginile unui caiet -> editorul unei pagini
function JournalPage({ user, setPage }) {
  const [notebooks, setNotebooks] = useState([])
  const [current, setCurrent] = useState(null) // caietul deschis
  const [entries, setEntries] = useState([])
  const [editing, setEditing] = useState(null) // pagina deschisă în editor
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState(COVER_COLORS[0])

  // Rulează o acțiune și afișează eroarea dacă nu merge serverul
  async function run(action) {
    try { setError(''); return await action() }
    catch { setError('Nu m-am putut conecta la server. Pornește backend-ul.') }
  }

  function loadNotebooks() {
    return run(async () => setNotebooks(await getNotebooks(user)))
  }

  useEffect(() => { if (user) loadNotebooks() }, [user])

  // Reîncarcă paginile când deschizi un caiet, cauți ceva sau te întorci din editor
  useEffect(() => {
    if (!user || !current || editing) return
    const timer = setTimeout(() => run(async () => setEntries(await getEntries(user, current.id, search))), 250)
    return () => clearTimeout(timer)
  }, [current, search, editing])

  if (!user) {
    return (
      <section className="page glass narrow">
        <h1 className="page-title">Jurnal</h1>
        <p className="page-subtitle">Intră în cont ca să ai un jurnal doar al tău.</p>
        <button className="cta-btn" onClick={() => setPage('login')}>Intră în cont</button>
      </section>
    )
  }

  if (editing) return <EntryEditor key={editing.id} user={user} entry={editing} onBack={() => setEditing(null)} />

  async function handleCreateNotebook(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await run(async () => {
      await createNotebook(user, { title: newTitle.trim(), cover_color: newColor })
      setNewTitle(''); setCreating(false)
      await loadNotebooks()
    })
  }

  async function handleDeleteNotebook() {
    if (!window.confirm(`Ștergi caietul „${current.title}" și toate paginile lui? Nu se mai poate recupera.`)) return
    await run(async () => {
      await deleteNotebook(user, current.id)
      setCurrent(null); setSearch('')
      await loadNotebooks()
    })
  }

  async function handleNewEntry() {
    await run(async () => setEditing(await createEntry(user, current.id)))
  }

  async function handleDeleteEntry(entry) {
    if (!window.confirm('Ștergi această pagină definitiv?')) return
    await run(async () => {
      await deleteEntry(user, entry.id)
      setEntries((list) => list.filter((x) => x.id !== entry.id))
    })
  }

  return (
    <section className="page glass">
      {!current ? (
        <>
          <h1 className="page-title">Jurnalul meu</h1>
          <p className="page-subtitle">🔒 Un spațiu doar al tău, unde scrii ce simți.</p>
          {error && <p className="error">{error}</p>}

          {creating ? (
            <form className="form jr-new" onSubmit={handleCreateNotebook}>
              <input placeholder="Numele caietului (ex. Gânduri de seară)" maxLength={120} autoFocus
                value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <div>
                {COVER_COLORS.map((c) => (
                  <button type="button" key={c} aria-label={`Culoare ${c}`} className={newColor === c ? 'jr-swatch on' : 'jr-swatch'}
                    style={{ background: c }} onClick={() => setNewColor(c)} />
                ))}
              </div>
              <div>
                <button type="submit" className="cta-btn small">Creează</button>
                <button type="button" className="ghost-btn" onClick={() => setCreating(false)}>Renunță</button>
              </div>
            </form>
          ) : (
            <button className="cta-btn small" onClick={() => setCreating(true)}>+ Caiet nou</button>
          )}

          <div className="jr-grid">
            {notebooks.map((n) => (
              <button key={n.id} className="jr-cover" style={{ background: n.cover_color }} onClick={() => setCurrent(n)}>
                <strong>{n.title}</strong>
                <span className="small">{n.entry_count} {n.entry_count === 1 ? 'pagină' : 'pagini'}</span>
              </button>
            ))}
          </div>
          {!error && notebooks.length === 0 && <p className="empty">Nu ai niciun caiet încă. Creează-l pe primul!</p>}
        </>
      ) : (
        <>
          <div className="jr-bar">
            <button className="ghost-btn" onClick={() => { setCurrent(null); setSearch(''); loadNotebooks() }}>← Caiete</button>
            <button className="ghost-btn" onClick={handleDeleteNotebook}>Șterge caietul</button>
          </div>
          <h1 className="page-title">{current.title}</h1>
          {error && <p className="error">{error}</p>}

          <div className="jr-bar">
            <input className="jr-search" type="search" placeholder="Caută în pagini..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="cta-btn small" onClick={handleNewEntry}>+ Pagină nouă</button>
          </div>

          <ul className="jr-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button className="jr-item" onClick={() => setEditing(entry)}>
                  <span className="jr-emoji">{moodEmoji(entry.mood)}</span>
                  <span>
                    <strong>{entry.title || 'Fără titlu'}</strong>
                    <span className="muted small jr-snippet">{entry.entry_date} · {entry.content.slice(0, 80)}</span>
                  </span>
                </button>
                <button className="ghost-btn" aria-label="Șterge pagina" onClick={() => handleDeleteEntry(entry)}>🗑</button>
              </li>
            ))}
          </ul>
          {!error && entries.length === 0 && <p className="empty">{search ? 'Nu am găsit nimic.' : 'Caietul e gol. Scrie prima pagină!'}</p>}
        </>
      )}
    </section>
  )
}

export default JournalPage
