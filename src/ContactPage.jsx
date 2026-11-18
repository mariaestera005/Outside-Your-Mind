// Numere de telefon utile. Sunt text fix, nu vin din backend.
const contacts = [
  { name: 'Urgențe', number: '112', info: 'Număr unic de urgență, pentru pericol imediat.' },
  { name: 'TelVerde Antisuicid', number: '0800 801 200', info: 'Sprijin gratuit și confidențial în criză. Vineri–duminică, 19:00–07:00.' },
  { name: 'depreHUB', number: '0374 456 420', info: 'Sprijin psihologic gratuit și confidențial, 24/7.' },
  { name: 'depreHUB Teens', number: '0374 461 461', info: 'Pentru adolescenți și tineri, 24/7.' },
  { name: 'Telefonul Copilului', number: '116 111', info: 'Linie națională pentru copii și adolescenți.' },
  { name: 'Violență domestică', number: '0800 500 333', info: 'Linie națională pentru victimele violenței domestice.' },
]

function ContactPage() {
  return (
    <section className="page glass">
      <h1 className="page-title">Contact</h1>
      <p className="page-subtitle">Nu ești singur(ă). Aceste linii te pot ajuta acum:</p>
      <div className="cards">
        {contacts.map((c) => (
          <article key={c.name} className="card">
            <h3>{c.name}</h3>
            {/* tel:... face numărul apelabil de pe telefon */}
            <a className="phone" href={'tel:' + c.number.replaceAll(' ', '')}>{c.number}</a>
            <p>{c.info}</p>
          </article>
        ))}
      </div>
      <p className="muted small">Verifică programul actualizat pe site-urile organizațiilor.</p>
    </section>
  )
}

export default ContactPage
