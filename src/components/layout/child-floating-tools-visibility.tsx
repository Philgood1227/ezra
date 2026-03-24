"use client";

import * as React from "react";

interface ChildFloatingToolsVisibilityContextValue {
  registerHiddenRequester: () => () => void;
}

const ChildFloatingToolsVisibilityContext = React.createContext<ChildFloatingToolsVisibilityContextValue | null>(null);

export interface ChildFloatingToolsVisibilityProviderProps {
  children: React.ReactNode;
  onHiddenCountChange: (count: number) => void;
}

export function ChildFloatingToolsVisibilityProvider({
  children,
  onHiddenCountChange,
}: ChildFloatingToolsVisibilityProviderProps): React.JSX.Element {
  const [hiddenCount, setHiddenCount] = React.useState(0);

  React.useEffect(() => {
    onHiddenCountChange(hiddenCount);
  }, [hiddenCount, onHiddenCountChange]);

  const registerHiddenRequester = React.useCallback(() => {
    setHiddenCount((current) => current + 1);

    let cleaned = false;
    return () => {
      if (cleaned) {
        return;
      }
      cleaned = true;
      setHiddenCount((current) => Math.max(0, current - 1));
    };
  }, []);

  const value = React.useMemo<ChildFloatingToolsVisibilityContextValue>(
    () => ({
      registerHiddenRequester,
    }),
    [registerHiddenRequester],
  );

  return (
    <ChildFloatingToolsVisibilityContext.Provider value={value}>
      {children}
    </ChildFloatingToolsVisibilityContext.Provider>
  );
}

export function useChildFloatingToolsVisibility(hidden: boolean): void {
  const context = React.useContext(ChildFloatingToolsVisibilityContext);

  React.useEffect(() => {
    if (!context || !hidden) {
      return;
    }

    const unregister = context.registerHiddenRequester();
    return unregister;
  }, [context, hidden]);
}
