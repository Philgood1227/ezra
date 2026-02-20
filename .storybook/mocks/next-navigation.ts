const DEFAULT_PATHNAME = "/child";

declare global {
  interface Window {
    __EZRA_STORYBOOK_PATHNAME__?: string;
  }
}

export function usePathname(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PATHNAME;
  }

  return window.__EZRA_STORYBOOK_PATHNAME__ ?? DEFAULT_PATHNAME;
}

export function useRouter() {
  return {
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    prefetch: async () => undefined,
  };
}
