const THEME_INIT_SCRIPT = `
(() => {
  try {
    const path = window.location.pathname || "";
    const isChildRoute = path === "/child" || path.startsWith("/child/");
    const storageKey = "ezra-theme";
    const savedTheme = localStorage.getItem(storageKey);
    const validTheme = savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
      ? savedTheme
      : "system";
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = isChildRoute
      ? "light"
      : validTheme === "system"
        ? (systemDark ? "dark" : "light")
        : validTheme;
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    root.dataset.theme = resolvedTheme;
  } catch (_error) {
    // Ignore script execution errors to avoid blocking render.
  }
})();
`;

export function ThemeScript(): React.JSX.Element {
  return <script id="ezra-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
