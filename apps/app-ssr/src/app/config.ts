// Giá trị được next.config.mjs nhúng lúc build từ packages/config/app-env.mjs
// (cùng nguồn với vite.config.ts của bản CSR).
export const STORE_LABEL = process.env.APP_STORE_LABEL ?? "T&Q Mart (SSR)";
