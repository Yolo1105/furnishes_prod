import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  /** Ported verbatim from `chatbot_v3` — keep upstream patterns; relax hooks that flag reference code. */
  {
    files: [
      "components/eva-dashboard/**/*.{ts,tsx}",
      "lib/eva-dashboard/**/*.{ts,tsx}",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  /** Studio reference UI — match upstream lint posture (copy-paste fidelity). */
  {
    files: [
      "app/(chromeless)/account/**/*.{ts,tsx}",
      "app/(site)/(auth)/**/*.{ts,tsx}",
      "app/admin/**/*.{ts,tsx}",
      "app/cart/**/*.{ts,tsx}",
      "app/checkout/**/*.{ts,tsx}",
      "app/privacy-policy/**/*.{ts,tsx}",
      "app/terms/**/*.{ts,tsx}",
      "app/unsubscribe/**/*.{ts,tsx}",
      "components/commerce/**/*.{ts,tsx}",
      "components/site/cookie-consent.tsx",
      "components/site/route-progress-sweep.tsx",
      "components/site/auth-poster-image.tsx",
      "components/eva-dashboard/account/**/*.{ts,tsx}",
      "lib/actions/**/*.{ts,tsx}",
      "lib/auth/**/*.{ts,tsx}",
      "lib/email/**/*.{ts,tsx}",
      "lib/jobs/**/*.{ts,tsx}",
      "lib/payments/**/*.{ts,tsx}",
      "lib/site/account/**/*.{ts,tsx}",
      "lib/site/commerce/**/*.{ts,tsx}",
      "lib/site/support/**/*.{ts,tsx}",
      "lib/validation/**/*.{ts,tsx}",
      "lib/rate-limit.ts",
      "app/api/auth/**/*.{ts,tsx}",
      "app/api/checkout/**/*.{ts,tsx}",
      "app/api/profile/**/*.{ts,tsx}",
      "app/api/user-preferences/**/*.{ts,tsx}",
      "app/api/uploads/sign/**/*.{ts,tsx}",
      "app/api/webhooks/stripe/**/*.{ts,tsx}",
      "app/api/inngest/**/*.{ts,tsx}",
      "scripts/verify-prod.ts",
    ],
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
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
