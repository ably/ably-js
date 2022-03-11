module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true
  },
  plugins: [
    "security"
  ],
  extends: [
    "plugin:security/recommended"
  ],
  rules: {
    "no-undef": "error",
    "eol-last": "error",
    // security/detect-object-injection just gives a lot of false positives
    // see https://github.com/nodesecurity/eslint-plugin-security/issues/21
    "security/detect-object-injection": "off"
  },
  parserOptions: {
    sourceType: "module"
  }
}
