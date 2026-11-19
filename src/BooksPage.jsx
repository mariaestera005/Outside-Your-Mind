import { useState, useEffect } from 'react'
import { getBooks } from './api.js'

// Pagina de cărți, cu dropdown pentru alegerea categoriei
function BooksPage() {
  const [books, setBooks] = useState([])
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all') // 'all' = toate categoriile

  useEffect(() => {
    getBooks()
      .then(setBooks)
      .catch(() => setError('Nu m-am putut conecta la server. Pornește backend-ul.'))
  }, [])

  // Lista categoriilor, fără duplicate, în ordine alfabetică
  const categories = [...new Set(books.map((book) => book.category))].sort()

  // Doar cărțile din categoria aleasă
  const shown = category === 'all' ? books : books.filter((book) => book.category === category)

  return (
    <section className="page glass">
      <h1 className="page-title">Cărți</h1>
      <p className="page-subtitle">Lecturi care te pot ajuta să te înțelegi mai bine.</p>

      {books.length > 0 && (
        <div className="filter">
          <label htmlFor="category">Categorie</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Toate categoriile ({books.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c} ({books.filter((book) => book.category === c).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {!error && books.length === 0 && <p className="empty">Încă nu sunt cărți adăugate.</p>}

      <div className="cards">
        {shown.map((book) => (
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
