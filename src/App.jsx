import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import BookCatalog from './components/BookCatalog'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import Volunteers from './components/Volunteers'
import Scanner from './pages/Scanner'
import POS from './pages/POS'
import AdminRoute from './components/AdminRoute'

// ── Public home page — untouched ──────────────────────────────────────
function HomePage() {
  return (
    <div className="blueprint">
      <Header />
      <Hero />
      <BookCatalog />
      <Sidebar />
      <Volunteers />
      <Footer />
    </div>
  )
}

// ── Admin scanner — wrapped in auth guard ─────────────────────────────
function ScannerPage() {
  return (
    <AdminRoute>
      <div style={{ minHeight: '100dvh', background: 'var(--bg-color)' }}>
        {/* Mini breadcrumb header */}
        <div style={{
          borderBottom: '1px solid var(--line-color)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          background: 'var(--pure-white)',
        }}>
          <a href="/" style={{
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textDecoration: 'none',
            color: 'var(--line-color)',
          }}>
            ← ELSEWHERE BOOKS
          </a>
          <span style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: '#888',
          }}>/ 掃書上架</span>
        </div>
        <Scanner />
      </div>
    </AdminRoute>
  )
}

// ── Admin POS — wrapped in auth guard ─────────────────────────────────
function POSPage() {
  return (
    <AdminRoute>
      <POS />
    </AdminRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"     element={<HomePage />} />
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/pos"  element={<POSPage />} />
      </Routes>
    </BrowserRouter>
  )
}
