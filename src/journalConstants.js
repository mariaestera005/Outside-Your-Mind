// Opțiunile de personalizare ale unei pagini de jurnal (trebuie să fie aceleași ca în backend/journal.py)
export const FONTS = ['Inter', 'Caveat', 'Lora', 'Merriweather', 'Patrick Hand', 'Courier Prime']

export const PAPERS = [
  { id: 'blank', label: 'Goală' },
  { id: 'lined', label: 'Liniată' },
  { id: 'dotted', label: 'Puncte' },
  { id: 'grid', label: 'Pătrățele' },
]

export const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Fericit' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'grateful', emoji: '🙏', label: 'Recunoscător' },
  { id: 'neutral', emoji: '😐', label: 'Neutru' },
  { id: 'anxious', emoji: '😟', label: 'Anxios' },
  { id: 'sad', emoji: '😢', label: 'Trist' },
  { id: 'angry', emoji: '😠', label: 'Furios' },
  { id: 'tired', emoji: '😴', label: 'Obosit' },
]

// Teme gata făcute, ca să nu pornești de la zero
export const THEMES = [
  { name: 'Hârtie caldă', style: { background: '#FFF8E7', text_color: '#333333', paper: 'lined', font: 'Lora', font_size: 18 } },
  { name: 'Noapte', style: { background: '#1F2937', text_color: '#E5E7EB', paper: 'dotted', font: 'Inter', font_size: 17 } },
  { name: 'Pastel', style: { background: '#F3E8FF', text_color: '#4C1D95', paper: 'blank', font: 'Patrick Hand', font_size: 20 } },
  { name: 'Mentă', style: { background: '#E6F4EA', text_color: '#1B4332', paper: 'grid', font: 'Merriweather', font_size: 17 } },
]

export const DEFAULT_STYLE = THEMES[0].style

// Culorile pe care le poți alege pentru coperta unui caiet
export const COVER_COLORS = ['#FFB4A8', '#FFD5A1', '#B8E0F0', '#C9E4C5', '#E3C9F0']
