import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import BookCatalog from './components/BookCatalog'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="blueprint">
      <Header />
      <Hero />
      <BookCatalog />
      <Sidebar />
      <Footer />
    </div>
  )
}
