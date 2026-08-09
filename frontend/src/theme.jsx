import { createContext, useContext, useEffect, useMemo } from "react";
import { useLocalStorage } from "./hooks";

const ThemeContext = createContext(null);

export const ACCENTS = [
  { id: "gold", label: "Gold", swatch: "#cda86a" },
  { id: "platinum", label: "Platinum", swatch: "#b9c0c9" },
  { id: "emerald", label: "Emerald", swatch: "#6fae82" },
  { id: "rose", label: "Rose", swatch: "#d98a9a" },
];

export function ThemeProvider({ children }) {
  const [mode, setMode] = useLocalStorage("mynotebook-theme-mode", "dark");
  const [accent, setAccent] = useLocalStorage("mynotebook-theme-accent", "gold");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  function toggleMode() {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }

  const value = useMemo(
    () => ({ mode, setMode, toggleMode, accent, setAccent }),
    [mode, accent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider.");
  }

  return context;
}
