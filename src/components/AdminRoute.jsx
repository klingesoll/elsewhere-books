import { useState } from 'react'
import { useAdminAuth, adminLogout } from '../pages/LoginPage'
import LoginPage from '../pages/LoginPage'

export default function AdminRoute({ children }) {
  const [authed, setAuthed] = useState(useAdminAuth())

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />
  }

  return (
    <>
      {/* Logout bar — only visible in admin area */}
      <div style={{
        background: 'var(--highlight-purple)',
        borderBottom: '1px solid var(--line-color)',
        padding: '0.4rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        letterSpacing: '0.06em',
      }}>
        <span>⬡ ADMIN SESSION ACTIVE</span>
        <button
          onClick={() => { adminLogout(); setAuthed(false) }}
          style={{
            background: 'none',
            border: '1px solid var(--line-color)',
            padding: '0.15rem 0.6rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          登出 LOGOUT
        </button>
      </div>
      {children}
    </>
  )
}
