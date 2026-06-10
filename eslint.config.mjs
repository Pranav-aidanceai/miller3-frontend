import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Global rules (all files)
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn"],
    },
  },

  // Allow console.error / console.warn in server/API files only
  {
    files: [
      "src/app/api/**/*.ts",
      "src/app/api/**/*.tsx",
      "src/lib/**/*.ts",
      "src/services/**/*.ts",
      "src/server/**/*.ts",
    ],
    rules: {
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;