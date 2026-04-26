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
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["error", "log"] }],
    },
  },

  // Allow console.error in server/API files only
  {
    files: [
      "src/app/api/**/*.ts",
      "src/app/api/**/*.tsx",
      "src/lib/**/*.ts",
      "src/services/**/*.ts",
      "src/server/**/*.ts",
    ],
    rules: {
      "no-console": ["warn", { allow: ["error", "log"] }],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;