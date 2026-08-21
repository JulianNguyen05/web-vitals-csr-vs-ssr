module.exports = [
  {
    ignores: ["dist/**", ".next/**", "node_modules/**"],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];