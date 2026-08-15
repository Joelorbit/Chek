"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("eyu_theme") as Theme | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("eyu_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Light / Dark Mode"
      className="h-8 px-2.5 rounded-eyu flex items-center gap-1.5 bg-[var(--surface-elevated)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)] transition-all text-xs font-mono"
    >
      {theme === "dark" ? (
        <>
          <Sun size={15} weight="duotone" className="text-[var(--complement)]" />
          <span className="text-[11px] font-medium hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon size={15} weight="duotone" className="text-[var(--accent)]" />
          <span className="text-[11px] font-medium hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
