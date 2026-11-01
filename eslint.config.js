// ESLint configuration for ESLint v9+
export default [
  {
    files: ["**/*.js"],
    ignores: [
      "*.min.js",
      "node_modules/**",
      "dist/**",
      "build/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      ".playwright-browsers/**",
    ],
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
      quotes: ["error", "double", { avoidEscape: true }],
      "no-unused-vars": ["warn"],
    },
  },
];
