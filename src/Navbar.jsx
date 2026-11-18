// Bara de sus. Primește de la App: pagina curentă, funcția care schimbă pagina,
// userul logat și funcția de logout.
function Navbar({ page, setPage, user, onLogout }) {
  const links = [['chat', 'Acasă'], ['books', 'Cărți'], ['podcasts', 'Podcasturi'], ['contact', 'Contact']]
  const isVolunteer = user?.role === 'volunteer' 

  return (
    <header className="navbar glass">
      <div className="logo"><span className="logo-dot" />Outside Your Mind</div>

      {isVolunteer ? (
        <span className="badge">Spațiu voluntar</span>
      ) : (
        <nav>
          {links.map(([id, label]) => (
            <button key={id} className={page === id ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage(id)}>
              {label}
            </button>
          ))}
        </nav>
      )}

      {user ? (
        <div>
          <span className="hello">{user.name}</span>
          <button className="nav-btn" onClick={onLogout}>Logout</button>
        </div>
      ) : (
        <button className="cta-btn small" onClick={() => setPage('login')}>Login</button>
      )}
    </header>
  )
}

export default Navbar
