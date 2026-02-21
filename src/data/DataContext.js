import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAllData } from '../api/wp';

const DataContext = createContext(null);

function indexById(items) {
  const m = new Map();
  (items || []).forEach((it) => {
    if (it && typeof it.id === 'number') m.set(it.id, it);
  });
  return m;
}

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [presenters, setPresenters] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllData();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setPresenters(Array.isArray(data.presenters) ? data.presenters : []);
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setEventTypes(Array.isArray(data.eventTypes) ? data.eventTypes : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maps = useMemo(() => {
    return {
      presenterById: indexById(presenters),
      roomById: indexById(rooms),
      typeById: indexById(eventTypes),
      eventById: indexById(events),
    };
  }, [events, presenters, rooms, eventTypes]);

  const value = useMemo(
    () => ({
      loading,
      error,
      reload,
      events,
      presenters,
      rooms,
      eventTypes,
      ...maps,
    }),
    [loading, error, events, presenters, rooms, eventTypes, maps]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
