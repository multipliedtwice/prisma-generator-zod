module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    es2021: true,
  },
  extends: ['plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off"
  },
};
