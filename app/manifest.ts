import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yumoo",
    short_name: "Yumoo",
    description: "A cute visual food diary that turns your month into a soft little recap.",
    start_url: "/calendar",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF8F2",
    theme_color: "#FFF1DA",
    categories: ["food", "lifestyle", "photo"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}

