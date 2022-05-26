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
  ],
  ignorePatterns: [
    "build",
    "test",
    "tools",
    "scripts",
    "Gruntfile.js",
  ],
}
