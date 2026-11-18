import { useState, useEffect } from 'react'
import { getBooks } from './api.js'

// Pagina de cărți
function BooksPage() {
  const [books, setBooks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getBooks()
      .then(setBooks)
      .catch(() => setError('Nu m-am putut conecta la server. Pornește backend-ul.'))
  }, [])

  return (
    <section className="page glass">
      <h1 className="page-title">Cărți</h1>
      <p className="page-subtitle">Lecturi care te pot ajuta să te înțelegi mai bine.</p>

      {error && <p className="error">{error}</p>}
      {!error && books.length === 0 && <p className="empty">Încă nu sunt cărți adăugate.</p>}

      <div className="cards">
        {books.map((book) => (
          <article key={book.id} className="card">
            <h3>{book.title}</h3>
            <p className="muted">{book.author}</p>
            {book.category && <p className="tag">{book.category}</p>}
            <p>{book.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default BooksPage
