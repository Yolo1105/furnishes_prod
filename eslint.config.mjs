import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,

  /**
   * Upstream-synced reference UI. We import this code verbatim from the
   * chatbot_v3 studio. Fully matching our lint rules would require forking
   * and maintaining the code long-term, which is not a seed-stage priority.
   *
   * Decision: docs/adr/0011-eva-dashboard-eslint-bypass.md. Revisit when
   * we have a dedicated dashboard engineer (post-Series A) or when upstream
   * archives.
   *
   * Do NOT add new folders to this block. Any new code must pass full lint.
   */
  {
    files: [
      "components/eva-dashboard/**/*.{ts,tsx}",
      "lib/eva-dashboard/**/*.{ts,tsx}",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react/no-unescaped-entities": "off",
    },
  },

  /**
   * Furnishes Studio (ported from furnishes-studio). Lint rules are
   * relaxed here until Phase 13 brings the lifted tree to full CI parity.
   */
  {
    files: [
      "components/studio/**/*.{ts,tsx}",
      "lib/studio/**/*.{ts,tsx}",
      "app/(chromeless)/playground/**/*.{ts,tsx}",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "right-sidebar-bundle/**",
  ]),
]);

export default eslintConfig;
