import { useState, useEffect } from 'react'
import { getPodcasts } from './api.js'

function PodcastsPage() {
  const [podcasts, setPodcasts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getPodcasts()
      .then(setPodcasts)
      .catch(() => setError('Nu m-am putut conecta la server. Pornește backend-ul.'))
  }, [])

  return (
    <section className="page glass">
      <h1 className="page-title">Podcasturi</h1>
      <p className="page-subtitle">Conversații pentru zilele în care ai nevoie de ele.</p>

      {error && <p className="error">{error}</p>}
      {!error && podcasts.length === 0 && <p className="empty">Încă nu sunt podcasturi adăugate.</p>}

      <div className="cards">
        {podcasts.map((podcast) => (
          <article key={podcast.id} className="card">
            <h3>{podcast.title}</h3>
            <p className="muted">{podcast.author}</p>
            {podcast.category && <p className="tag">{podcast.category}</p>}
            <p>{podcast.description}</p>
            {podcast.link && <a href={podcast.link} target="_blank" rel="noreferrer">Ascultă →</a>}
          </article>
        ))}
      </div>
    </section>
  )
}

export default PodcastsPage
