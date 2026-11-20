import { useState, useEffect, useRef } from 'react'

// Meniu derulant (dropdown) pentru alegerea categoriei.
// options = lista de categorii, value = categoria aleasă ('' = toate), onChange = funcția care o schimbă
function CategoryDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Închide meniul la click în afara lui sau la Escape
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function choose(option) {
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="dropdown-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>{value || 'Toate categoriile'}</span>
        <span className={open ? 'dropdown-arrow open' : 'dropdown-arrow'}>▾</span>
      </button>

      {open && (
        <ul className="dropdown-menu" role="listbox">
          {['', ...options].map((option) => (
            <li key={option || 'toate'} role="option" aria-selected={option === value}>
              <button
                type="button"
                className={option === value ? 'dropdown-item active' : 'dropdown-item'}
                onClick={() => choose(option)}
              >
                {option || 'Toate categoriile'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CategoryDropdown
