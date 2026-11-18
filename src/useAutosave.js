import { useEffect, useRef, useState } from 'react'

// Salvează `value` la `delay` ms după ultima modificare.
// Întoarce statusul: 'idle' | 'saving' | 'saved' | 'error'
export function useAutosave(value, save, delay = 1200) {
  const [status, setStatus] = useState('idle')
  const first = useRef(true)
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    if (first.current) { first.current = false; return } // nu salvăm la prima afișare
    setStatus('saving')
    const timer = setTimeout(async () => {
      try { await saveRef.current(value); setStatus('saved') }
      catch { setStatus('error') }
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return status
}
