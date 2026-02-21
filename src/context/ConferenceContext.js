import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAllConferenceData, sortEventsByStart } from '../api/wp';

const ConferenceContext = createContext(null);

export function ConferenceProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    events: [],
    presenters: [],
    rooms: [],
    eventTypes: [],
    roomById: {},
    eventTypeById: {},
    presenterById: {},
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchAllConferenceData();
        if (!mounted) return;
        setData({ ...res, events: sortEventsByStart(res.events) });
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({ loading, error, ...data, reload: async () => {
    setLoading(true);
    try {
      const res = await fetchAllConferenceData();
      setData({ ...res, events: sortEventsByStart(res.events) });
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }}), [loading, error, data]);

  return <ConferenceContext.Provider value={value}>{children}</ConferenceContext.Provider>;
}

export function useConference() {
  const ctx = useContext(ConferenceContext);
  if (!ctx) throw new Error('useConference must be used within ConferenceProvider');
  return ctx;
}
