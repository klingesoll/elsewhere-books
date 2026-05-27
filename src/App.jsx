import { useLumaEvents } from './hooks/useLumaEvents';
import { Announcement } from './components/Announcement';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Room } from './components/Room';
import { Manifesto } from './components/Manifesto';
import { Programme } from './components/Programme';
import { Shelves } from './components/Shelves';
import { ScreeningNotes } from './components/ScreeningNotes';
import { Archive } from './components/Archive';
import { Support } from './components/Support';
import { Visit } from './components/Visit';
import { Footer } from './components/Footer';

export function App() {
  const { upcoming, past, loading } = useLumaEvents();

  return (
    <main className="site">
      <Announcement />
      <Header />
      <Hero />
      <Room />
      <Manifesto />
      <Programme events={upcoming} loading={loading} />
      <Shelves />
      <ScreeningNotes />
      <Archive entries={past} loading={loading} />
      <Support />
      <Visit />
      <Footer />
    </main>
  );
}
