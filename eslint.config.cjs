const globals = require("globals");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const svelte = require("eslint-plugin-svelte");
const prettier = require("eslint-config-prettier");

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: 'readonly',
      }
    }
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    ignores: [
      "*.cjs", 
      "dist/**/*", 
      "dist-components/**/*", 
      "public/**/*",
      "playwright-report/**/*", 
      "storybook-static/**/*",
      "SuperClaude/**/*",
      "claudecodeui/**/*",
      "node_modules/**/*",
      "tests/**/*",
      "test-results/**/*"
    ],
  }
];