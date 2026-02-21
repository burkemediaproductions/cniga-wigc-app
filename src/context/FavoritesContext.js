import React, { createContext, useContext, useMemo, useState } from 'react';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favoriteEventIds, setFavoriteEventIds] = useState(() => new Set());

  const toggleFavorite = (eventId) => {
    setFavoriteEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      favoriteEventIds,
      isFavorite: (id) => favoriteEventIds.has(id),
      toggleFavorite,
    }),
    [favoriteEventIds]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
