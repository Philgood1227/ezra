"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ezra-theme";
const THEME_QUERY = "(prefers-color-scheme: dark)";

let currentTheme: Theme = "system";
let isInitialized = false;
let mediaQuery: MediaQueryList | null = null;
let snapshotVersion = 0;

const subscribers = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parseTheme(value: string | null): Theme {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

function getSystemTheme(): "light" | "dark" {
  if (!isBrowser()) {
    return "light";
  }

  return window.matchMedia(THEME_QUERY).matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: Theme): void {
  if (!isBrowser()) {
    return;
  }

  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
  root.dataset.theme = resolvedTheme;
}

function notifySubscribers(): void {
  snapshotVersion += 1;
  subscribers.forEach((subscriber) => subscriber());
}

function handleSystemThemeChange(): void {
  if (currentTheme !== "system") {
    return;
  }

  applyTheme(currentTheme);
  notifySubscribers();
}

function ensureMediaQueryListener(): void {
  if (!isBrowser()) {
    return;
  }

  if (mediaQuery) {
    return;
  }

  mediaQuery = window.matchMedia(THEME_QUERY);
  mediaQuery.addEventListener("change", handleSystemThemeChange);
}

function initializeTheme(): void {
  if (isInitialized || !isBrowser()) {
    return;
  }

  currentTheme = parseTheme(window.localStorage.getItem(STORAGE_KEY));
  applyTheme(currentTheme);
  ensureMediaQueryListener();
  isInitialized = true;
}

function setThemeValue(theme: Theme): void {
  if (!isBrowser()) {
    return;
  }

  initializeTheme();
  currentTheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(currentTheme);
  notifySubscribers();
}

function subscribeToTheme(subscriber: () => void): () => void {
  initializeTheme();
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

function getThemeSnapshot(): number {
  initializeTheme();
  return snapshotVersion;
}

function getServerSnapshot(): number {
  return 0;
}

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
  const theme = currentTheme;

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeValue(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const resolvedTheme = resolveTheme(currentTheme);
    setThemeValue(resolvedTheme === "dark" ? "light" : "dark");
  }, []);

  return { theme, setTheme, toggleTheme };
}
