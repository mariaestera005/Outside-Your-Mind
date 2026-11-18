import { useState, useEffect } from 'react'

function CollectionPage({ title, subtitle, load, emptyText }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  // [] = rulează o singură dată, când se deschide pagina
  useEffect(() => {
    load()
      .then(setItems)
      .catch(() => setError('Nu m-am putut conecta la server. Pornește backend-ul.'))
  }, [])

  return (
    <section className="page glass">
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>

      {error && <p className="error">{error}</p>}
      {!error && items.length === 0 && <p className="empty">{emptyText}</p>}

      <div className="cards">
        {items.map((item) => (
          <article key={item.id} className="card">
            <h3>{item.title}</h3>
            <p className="muted">{item.author}</p>
            {item.category && <p className="tag">{item.category}</p>}
            <p>{item.description}</p>
            {item.link && <a href={item.link} target="_blank" rel="noreferrer">Deschide →</a>}
          </article>
        ))}
      </div>
    </section>
  )
}

export default CollectionPage
