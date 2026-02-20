import * as React from "react";
import type { Preview } from "@storybook/react";
import { ThemeProvider } from "@/components/ds/theme-provider";

import "../src/app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Thème de l'interface",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Clair" },
          { value: "dark", title: "Sombre" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const selectedTheme = context.globals.theme === "dark" ? "dark" : "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", selectedTheme === "dark");
        document.documentElement.style.colorScheme = selectedTheme;
        window.localStorage.setItem("ezra-theme", selectedTheme);
      }

      return (
        <ThemeProvider>
          <div className="min-h-screen bg-bg-base p-4 text-text-primary sm:p-6">
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "surface",
      values: [
        { name: "surface", value: "#f8fafc" },
        { name: "panel", value: "#ffffff" },
        { name: "dark", value: "#0f172a" },
      ],
    },
  },
};

export default preview;
