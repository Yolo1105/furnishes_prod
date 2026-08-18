import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Lint policy.
 *
 * - Strict TypeScript everywhere.
 * - Frozen approved design sources (reference/) are immutable evidence and
 *   must never be imported into production code.
 * - Deferred backend/domain dependencies stay forbidden until the Account
 *   phase re-derives them from the legacy behavioral reference (see
 *   docs/ARCHITECTURE.md). Vanilla three is allowed for Landing parity.
 * - No blanket visual rules: nothing here forces Landing and Account onto
 *   one shared design language.
 */

const forbiddenProductionImports = [
  {
    group: ["**/reference/**", "**/*.jsx"],
    message:
      "Frozen approved design sources are immutable evidence and must never be imported into production code.",
  },
  {
    group: [
      "stripe",
      "@stripe/*",
      "openai",
      "@ai-sdk/*",
      "ai",
      "@anthropic-ai/*",
      "@sentry/*",
      "@upstash/*",
      "ioredis",
      "redis",
      "resend",
      "@fal-ai/*",
      "next-auth",
      "@auth/*",
    ],
    message:
      "Deferred domains: no commerce, first-party AI SDKs, Redis, Sentry/APM, or NextAuth without an ARCHITECTURE.md entry. Prisma, custom session auth, nodemailer, @aws-sdk/client-s3, and structured ops logging are allowed. Canvas playground may use @react-three/* (see ARCHITECTURE.md Phase 15).",
  },
];

const productionRestrictedSyntax = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: "dangerouslySetInnerHTML is forbidden in production code.",
  },
  {
    selector: "AssignmentExpression[left.property.name='innerHTML']",
    message: "Direct innerHTML assignment is forbidden in production code.",
  },
];

const canvasPlaygroundFiles = [
  "src/features/account/canvas/playground/**/*.{ts,tsx}",
  "src/app/api/chat/**/*.{ts,tsx}",
  "src/app/api/suggestions/**/*.{ts,tsx}",
  "src/app/api/explain/**/*.{ts,tsx}",
  "src/app/api/arrange/**/*.{ts,tsx}",
  "src/app/api/generate-asset/**/*.{ts,tsx}",
  "src/app/api/generate-room/**/*.{ts,tsx}",
  "src/app/api/studio/**/*.{ts,tsx}",
  "src/app/api/conversations/**/*.{ts,tsx}",
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      ".data/**",
      "reference/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: forbiddenProductionImports },
      ],
      "no-restricted-syntax": ["error", ...productionRestrictedSyntax],
    },
  },
  {
    files: ["src/lib/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom", "three"],
              message:
                "Contracts hold non-visual domain types and route builders only — no framework imports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: canvasPlaygroundFiles,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
      "no-useless-escape": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["**/*.{test,spec}.ts", "**/*.{test,spec}.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "scripts/**/*.{mjs,cjs,js}",
      "prisma/**/*.{mjs,cjs,js}",
      "e2e/**/*.mjs",
      "*.config.mjs",
      "eslint.config.mjs",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  {
    files: ["src/features/quiz/components/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  prettier,
);
