import { useState, useEffect } from 'react';

export function useLumaEvents() {
  const [upcoming, setUpcoming] = useState(null);
  const [past, setPast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/events.json')
      .then((r) => r.json())
      .then((data) => {
        setUpcoming(data.upcoming ?? []);
        setPast(data.past ?? []);
      })
      .catch(() => {
        setUpcoming([]);
        setPast([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { upcoming, past, loading };
}
