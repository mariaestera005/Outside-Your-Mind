import { useState, useEffect } from 'react'
import { getPodcasts } from './api.js'
import CategoryDropdown from './CategoryDropdown.jsx'

function PodcastsPage() {
  const [podcasts, setPodcasts] = useState([])
  const [error, setError] = useState('')
  const [category, setCategory] = useState('') // '' = toate categoriile

  useEffect(() => {
    getPodcasts()
      .then(setPodcasts)
      .catch(() => setError('Nu m-am putut conecta la server. Pornește backend-ul.'))
  }, [])

  const categories = [...new Set(podcasts.map((podcast) => podcast.category).filter(Boolean))]
  const shown = category ? podcasts.filter((podcast) => podcast.category === category) : podcasts

  return (
    <section className="page glass">
      <div className="page-toolbar">
        <CategoryDropdown options={categories} value={category} onChange={setCategory} />
      </div>
      <h1 className="page-title">Podcasturi</h1>
      <p className="page-subtitle">Conversații pentru zilele în care ai nevoie de ele.</p>

      {error && <p className="error">{error}</p>}
      {!error && podcasts.length === 0 && <p className="empty">Încă nu sunt podcasturi adăugate.</p>}

      <div className="cards">
        {shown.map((podcast) => (
          <article key={podcast.id} className="card">
            <h3>{podcast.title}</h3>
            <p className="muted">{podcast.author}</p>
            {podcast.category && <p className="tag">{podcast.category}</p>}
            <p>{podcast.description}</p>
            <div className="listen-links">
              {podcast.link && <a href={podcast.link} target="_blank" rel="noreferrer">Spotify</a>}
              {podcast.youtube_link && <a href={podcast.youtube_link} target="_blank" rel="noreferrer">YouTube</a>}
              {podcast.voxa_link && <a href={podcast.voxa_link} target="_blank" rel="noreferrer">Voxa</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default PodcastsPage
