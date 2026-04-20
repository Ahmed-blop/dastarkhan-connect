import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const CITIES = [
  { name: "Karachi", lat: 24.8607, lng: 67.0011 },
  { name: "Lahore", lat: 31.5204, lng: 74.3587 },
  { name: "Islamabad", lat: 33.6844, lng: 73.0479 },
  { name: "Rawalpindi", lat: 33.5651, lng: 73.0169 },
  { name: "Faisalabad", lat: 31.4504, lng: 73.135 },
  { name: "Multan", lat: 30.1575, lng: 71.5249 },
  { name: "Peshawar", lat: 34.0151, lng: 71.5249 },
] as const;

interface CityCtx {
  city: string | null;
  setCity: (c: string) => void;
}
const Ctx = createContext<CityCtx | undefined>(undefined);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string | null>(null);
  useEffect(() => {
    const c = typeof window !== "undefined" ? localStorage.getItem("dk_city") : null;
    if (c) setCityState(c);
  }, []);
  const setCity = (c: string) => {
    setCityState(c);
    if (typeof window !== "undefined") localStorage.setItem("dk_city", c);
  };
  return <Ctx.Provider value={{ city, setCity }}>{children}</Ctx.Provider>;
}

export function useCity() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCity must be used inside CityProvider");
  return c;
}

export function cityCoords(name: string | null) {
  if (!name) return null;
  return CITIES.find((c) => c.name === name) ?? null;
}
