import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configurare Vite: îi spunem doar că folosim React (ca să înțeleagă JSX)
export default defineConfig({
  plugins: [react()],
})
