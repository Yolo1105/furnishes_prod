import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Furnishes",
    short_name: "Furnishes",
    description:
      "Interior design studio for modern living — concept, planning, and 3D visualization.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff2e5",
    theme_color: "#6b2c12",
  };
}
