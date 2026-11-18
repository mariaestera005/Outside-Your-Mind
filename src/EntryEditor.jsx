import { useMemo, useState } from 'react'
import { updateEntry } from './api.js'
import { DEFAULT_STYLE, FONTS, MOODS, PAPERS, THEMES } from './journalConstants.js'
import { useAutosave } from './useAutosave.js'

const STATUS = { idle: '', saving: 'Se salvează...', saved: '✓ Salvat', error: '⚠ Nu s-a salvat' }

// Editorul unei pagini: scrii în stânga, îți personalizezi pagina în dreapta
function EntryEditor({ user, entry, onBack }) {
  const [draft, setDraft] = useState({
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    style: { ...DEFAULT_STYLE, ...entry.style },
  })
  const [panelOpen, setPanelOpen] = useState(true)

  const status = useAutosave(draft, (d) => updateEntry(user, entry.id, d))
  const setField = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setStyle = (patch) => setDraft((d) => ({ ...d, style: { ...d.style, ...patch } }))

  const s = draft.style
  // Stilul ajunge în pagină prin variabile CSS => previzualizare live
  const cssVars = useMemo(() => ({
    '--page-bg': s.background,
    '--page-text': s.text_color,
    '--page-font': `'${s.font}', serif`,
    '--page-size': `${s.font_size}px`,
  }), [s])

  return (
    <section className="page glass">
      <div className="jr-bar">
        <button className="ghost-btn" onClick={onBack}>← Înapoi</button>
        <span className="muted small" aria-live="polite">{STATUS[status]}</span>
        <button className="ghost-btn" onClick={() => setPanelOpen((open) => !open)}>🎨 Stil</button>
      </div>

      <div className="jr-editor">
        <div className={`jr-page paper-${s.paper}`} style={cssVars}>
          <input className="jr-title" placeholder="Titlu" maxLength={200}
            value={draft.title} onChange={(e) => setField({ title: e.target.value })} />

          <div className="jr-moods" role="radiogroup" aria-label="Cum te simți?">
            {MOODS.map((m) => (
              <button key={m.id} role="radio" aria-checked={draft.mood === m.id} title={m.label}
                className={draft.mood === m.id ? 'jr-mood on' : 'jr-mood'}
                onClick={() => setField({ mood: draft.mood === m.id ? null : m.id })}>
                {m.emoji}
              </button>
            ))}
          </div>

          <textarea className="jr-text" placeholder="Scrie liber, aici nu te judecă nimeni..."
            value={draft.content} onChange={(e) => setField({ content: e.target.value })} />
        </div>

        {panelOpen && (
          <aside className="jr-panel" aria-label="Personalizare pagină">
            <h3>Teme</h3>
            <div>
              {THEMES.map((t) => (
                <button key={t.name} className="jr-theme" onClick={() => setStyle(t.style)}
                  style={{ background: t.style.background, color: t.style.text_color }}>
                  {t.name}
                </button>
              ))}
            </div>

            <h3>Hârtie</h3>
            <div>
              {PAPERS.map((p) => (
                <button key={p.id} className={s.paper === p.id ? 'ghost-btn jr-on' : 'ghost-btn'}
                  onClick={() => setStyle({ paper: p.id })}>
                  {p.label}
                </button>
              ))}
            </div>

            <h3>Font</h3>
            <select value={s.font} onChange={(e) => setStyle({ font: e.target.value })}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <label>Mărime: {s.font_size}px
              <input type="range" min="12" max="32" value={s.font_size}
                onChange={(e) => setStyle({ font_size: Number(e.target.value) })} />
            </label>

            <h3>Culori</h3>
            <label>Fundal <input type="color" value={s.background} onChange={(e) => setStyle({ background: e.target.value })} /></label>
            <label>Text <input type="color" value={s.text_color} onChange={(e) => setStyle({ text_color: e.target.value })} /></label>
          </aside>
        )}
      </div>
    </section>
  )
}

export default EntryEditor
