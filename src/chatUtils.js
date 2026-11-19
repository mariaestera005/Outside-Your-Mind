// Ajutoare pentru conversațiile din chat

// Id unic pentru fiecare conversație; același id îl folosește și serverul
export function newId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function newConversation() {
  return { id: newId(), title: 'Conversație nouă', messages: [] }
}

// Transformă o conversație primită de la server în forma folosită de chat (răspunsurile voluntarilor apar ca 'bot')
export function fromServer(thread) {
  const messages = thread.messages.map((m) => ({ id: m.id, from: m.from === 'volunteer' ? 'bot' : 'user', text: m.text }))
  const firstUser = messages.find((m) => m.from === 'user')
  return { id: thread.id, title: firstUser ? firstUser.text.slice(0, 30) : 'Conversație', messages }
}
