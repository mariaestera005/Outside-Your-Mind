import { useState } from 'react'
import { volunteerLogin } from './api.js'

// Secțiune separată de login, doar pentru voluntari. Conturile lor sunt create de echipă (backend/make_volunteer.py),
// de aceea aici nu există "Creează cont".
function VolunteerLoginPage({ onLogin, setPage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await volunteerLogin(email, password)) // returnează { name, email, role: 'volunteer', token }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="page glass narrow">
      <h1 className="page-title">Login voluntari</h1>
      <p className="page-subtitle">Intră în spațiul de voluntar ca să răspunzi mesajelor primite.</p>
      <form className="form" onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input type="password" placeholder="Parolă" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="cta-btn" disabled={busy}>{busy ? 'Se încarcă...' : 'Intră ca voluntar'}</button>
      </form>
      <p className="form-switch muted small">Conturile de voluntar sunt create de echipa Outside Your Mind.</p>
      <p className="form-switch muted small">
        Nu ești voluntar(ă)?{' '}
        <button type="button" className="link-btn" onClick={() => setPage('login')}>Intră ca utilizator</button>
      </p>
    </section>
  )
}

export default VolunteerLoginPage
