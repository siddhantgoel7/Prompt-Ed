import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Ignores (ESLint v9: replace .eslintignore with this)
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    ".venv/**",
    "venv/**",
    "env/**",
    "python_env/**",
    "**/.venv/**", // Catch it even if it's nested

    // Common generated folders:
    "coverage/**",
    "dist/**",
    "node_modules/**",
    "test-results/**",

    // Legacy Socket.IO server (not used, replaced by Supabase Realtime):
    "server.js",
  ]),

  // ✅ Allow `any` in tests (keeps src strict, unblocks CI)
  {
    files: [
      "tests/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
