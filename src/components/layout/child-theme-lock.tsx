"use client";

import { useLayoutEffect } from "react";

interface ThemeSnapshot {
  hadDarkClass: boolean;
  dataTheme: string | null;
  colorScheme: string;
}

function captureThemeSnapshot(root: HTMLElement): ThemeSnapshot {
  return {
    hadDarkClass: root.classList.contains("dark"),
    dataTheme: root.dataset.theme ?? null,
    colorScheme: root.style.colorScheme,
  };
}

export function ChildThemeLock(): null {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = captureThemeSnapshot(root);

    root.classList.remove("dark");
    root.dataset.theme = "light";
    root.style.colorScheme = "light";

    return () => {
      root.classList.toggle("dark", previousTheme.hadDarkClass);
      if (previousTheme.dataTheme) {
        root.dataset.theme = previousTheme.dataTheme;
      } else {
        delete root.dataset.theme;
      }
      root.style.colorScheme = previousTheme.colorScheme;
    };
  }, []);

  return null;
}
