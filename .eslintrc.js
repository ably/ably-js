module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    "security",
    'jsdoc',
  ],
  extends: [
    "eslint:recommended",
    "plugin:security/recommended",
  ],
  rules: {
    // comma-dangle used for browser compatibility for browsers that don't support trailing commas
    "comma-dangle": ["error", "always-multiline"],
    "eol-last": "error",
    // security/detect-object-injection just gives a lot of false positives
    // see https://github.com/nodesecurity/eslint-plugin-security/issues/21
    "security/detect-object-injection": "off",
    "@typescript-eslint/no-var-requires": "error",
    // Use typescript-eslint’s version of the no-redeclare rule, which isn’t triggered by overload signatures.
    // TODO remove this once we start using the full @typescript-eslint/recommended ruleset in #958
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      rules: {
	"comma-dangle": ["error", "only-multiline"],
	"@typescript-eslint/no-unused-vars": ["error"],

	// TypeScript already enforces these rules better than any eslint setup can
	"no-undef": "off",
	"no-dupe-class-members": "off",
      },
    },
    {
      files: 'ably.d.ts',
      extends: [
        'plugin:jsdoc/recommended',
      ],
    },
  ],
  ignorePatterns: [
    "build",
    "test",
    "tools",
    "scripts",
    "docs",
    "Gruntfile.js",
  ],
  settings: {
    jsdoc: {
      tagNamePreference: {
        'default': 'defaultValue',
      },
    },
  },
}
