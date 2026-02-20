"use client";

import * as React from "react";
import { useTheme } from "@/lib/hooks/useTheme";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  useTheme();

  return <>{children}</>;
}
