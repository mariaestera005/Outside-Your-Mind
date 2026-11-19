import { useState } from 'react'
import { login, register } from './api.js'

// onLogin vine din App și anunță aplicația cine s-a logat
function LoginPage({ onLogin, setPage }) {
  const [mode, setMode] = useState('login') // 'login' = intră în cont, 'register' = creează cont
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault() // oprește reîncărcarea paginii
    if (isRegister && password !== confirm) {
      setError('Parolele nu se potrivesc.')
      return
    }
    setBusy(true)
    setError('')
    try {
      // Ambele returnează { name, email, role, token }; după creare contul e și autentificat
      onLogin(isRegister ? await register(name, email, password) : await login(email, password))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="page glass narrow">
      <h1 className="page-title">{isRegister ? 'Creează un cont' : 'Bine ai revenit'}</h1>
      <p className="page-subtitle">
        {isRegister ? 'Cu un cont, conversațiile și jurnalul tău se păstrează.' : 'Intră în cont ca să-ți păstrezi conversațiile.'}
      </p>
      <form className="form" onSubmit={handleSubmit}>
        {isRegister && (
          <input type="text" placeholder="Cum vrei să te cheme" value={name} onChange={(e) => setName(e.target.value)}
            minLength={2} maxLength={40} required autoComplete="nickname" />
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input type="password" placeholder={isRegister ? 'Parolă (minimum 8 caractere)' : 'Parolă'} value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={isRegister ? 8 : undefined} required
          autoComplete={isRegister ? 'new-password' : 'current-password'} />
        {isRegister && (
          <input type="password" placeholder="Repetă parola" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            required autoComplete="new-password" />
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="cta-btn" disabled={busy}>
          {busy ? 'Se încarcă...' : isRegister ? 'Creează cont' : 'Intră în cont'}
        </button>
      </form>
      <p className="form-switch muted">
        {isRegister ? 'Ai deja cont?' : 'Nu ai cont?'}{' '}
        <button type="button" className="link-btn" onClick={switchMode}>
          {isRegister ? 'Intră în cont' : 'Creează unul'}
        </button>
      </p>
      <p className="form-switch muted small">
        Ești voluntar(ă)?{' '}
        <button type="button" className="link-btn" onClick={() => setPage('volunteer-login')}>Login voluntari</button>
      </p>
    </section>
  )
}

export default LoginPage
