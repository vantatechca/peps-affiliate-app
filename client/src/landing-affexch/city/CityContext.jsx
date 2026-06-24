import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ALL_CITIES } from "../lib/cities";

/* Shared state for the affiliate application flow:
   1. Selected city
   2. Whether the city-select modal is open
   3. Whether the application-form modal is open
   Persisted in localStorage so reloads keep the selection. */

const KEY = "affexch.selectedCityId";
const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [cityId, setCityId] = useState(null);
  const [open, setOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);

  const city = useMemo(
    () => (cityId ? ALL_CITIES.find((c) => c.id === cityId) || null : null),
    [cityId]
  );

  const selectCity = useCallback((id) => {
    setCityId(id);
    try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
    // Close the city modal first, then open the application form after the
    // close animation has finished (city panel exit is 320ms).
    setOpen(false);
    setTimeout(() => setApplicationOpen(true), 360);
  }, []);

  const clearCity = useCallback(() => {
    setCityId(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({
      city,
      cityId,
      selectCity,
      clearCity,
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
      applicationOpen,
      openApplication: () => setApplicationOpen(true),
      closeApplication: () => setApplicationOpen(false),
    }),
    [city, cityId, selectCity, clearCity, open, applicationOpen]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside <CityProvider>");
  return ctx;
}
