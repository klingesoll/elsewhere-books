import { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setEmail('')
  }

  return (
    <footer className="info-bar">
      <div className="cell p-md">
        <span className="label">Colophon</span>
        <p className="text" style={{ fontSize: '0.8rem' }}>
          This interface is structured around a rigorous 1px grid system, designed to catalog
          thought and form. The architecture of the site reflects the architecture of a book.
        </p>
      </div>

      <div className="cell p-md">
        <span className="label">Newsletter</span>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}
        >
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              background: 'transparent',
              border: '1px solid var(--line-color)',
              padding: '0.25rem 0.5rem',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8rem',
              outline: 'none',
              width: '100%',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--line-color)',
              color: 'var(--bg-color)',
              border: 'none',
              padding: '0.25rem 1rem',
              fontFamily: 'var(--font-ui)',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            Join
          </button>
        </form>
      </div>

      <div
        className="cell p-md"
        style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      >
        <p className="text" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
          © 2024 ELSEWHERE BOOKS<br />
          ALL RIGHTS RESERVED.<br />
          BUILT IN THE VOID.
        </p>
      </div>
    </footer>
  )
}
