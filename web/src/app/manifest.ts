import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DriftAway",
    short_name: "DriftAway",
    description: "AI-powered collaborative travel planner",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f13",
    theme_color: "#FF6B35",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/favicon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
