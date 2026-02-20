import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "../src"),
      "next/link": path.resolve(__dirname, "./mocks/next-link.tsx"),
      "next/image": path.resolve(__dirname, "./mocks/next-image.tsx"),
      "next/navigation": path.resolve(__dirname, "./mocks/next-navigation.ts"),
    };

    return viteConfig;
  },
};

export default config;
