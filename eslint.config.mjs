import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next 15 ships legacy-style shareable configs; bridge them into
// the flat-config world with FlatCompat (the create-next-app default for v15).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "e2e/**",
      "scripts/**",
      "migrations/**",
      "**/.claude/**",
    ],
  },
];
