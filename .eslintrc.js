module.exports = {
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
    "plugin:security/recommended",
  ],
  rules: {
    "no-undef": "error",
    // comma-dangle used for browser compatibility for browsers that don't support trailing commas
    "comma-dangle": ["error", "always-multiline"],
    "eol-last": "error",
    // security/detect-object-injection just gives a lot of false positives
    // see https://github.com/nodesecurity/eslint-plugin-security/issues/21
    "security/detect-object-injection": "off",
  },
}
