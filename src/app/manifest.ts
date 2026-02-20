import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ezra",
    short_name: "Ezra",
    description: "Assistant quotidien pour enfant TDAH et routines familiales",
    start_url: "/auth/login",
    display: "standalone",
    background_color: "#f7fafc",
    theme_color: "#1dba79",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
