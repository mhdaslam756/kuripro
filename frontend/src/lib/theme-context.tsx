import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "kuripro_theme";

/** "system" means no override — the CSS `prefers-color-scheme` query decides, so no attribute is set. */
function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

/** Browser/status-bar colour per theme; matches --bg-app so the bar blends into the page. */
const THEME_COLORS = { light: "#f8f9fc", dark: "#090614" } as const;

function syncStatusBarColor(mode: ThemeMode): void {
  const effective = mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
  document.getElementById("theme-color")?.setAttribute("content", THEME_COLORS[effective]);
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  useEffect(() => {
    applyTheme(mode);
    syncStatusBarColor(mode);
    if (mode !== "system") return;
    // Following the system: keep the status bar in step when the phone switches appearance.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => syncStatusBarColor("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  function setMode(next: ThemeMode): void {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
