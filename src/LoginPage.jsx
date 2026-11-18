import { useState } from 'react'
import { login, DEV_PREVIEW } from './api.js'

// onLogin vine din App și anunță aplicația cine s-a logat
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault() // oprește reîncărcarea paginii
    try {
      onLogin(await login(email, password)) // login din api.js returnează { name, role }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="page glass narrow">
      <h1 className="page-title">Bine ai revenit</h1>
      <p className="page-subtitle">Intră în cont ca să-ți păstrezi conversațiile.</p>
      <form className="form" onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Parolă" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="cta-btn">Intră în cont</button>
      </form>

    
      {DEV_PREVIEW && (
        <div className="dev-box">
          <p className="muted small">Previzualizare (doar pentru dezvoltare)</p>
          <button className="ghost-btn" onClick={() => onLogin({ name: 'Utilizator', role: 'user' })}>Vezi ca utilizator</button>
          <button className="ghost-btn" onClick={() => onLogin({ name: 'Voluntar', role: 'volunteer' })}>Vezi ca voluntar</button>
        </div>
      )}
    </section>
  )
}

export default LoginPage
