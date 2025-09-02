// ESLint configuration for ESLint v9+
export default [
  {
    files: ["**/*.js"],
    ignores: ["*.min.js", "chart.min.js", "node_modules/**", "dist/**", "build/**"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
      },
    },
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "no-unused-vars": ["warn"],
    },
  },
];
