import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "@studio": path.join(root, "src/features/account/canvas/playground/lib"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/features/account/canvas/playground/**"],
    passWithNoTests: false,
    reporters: "default",
  },
});
