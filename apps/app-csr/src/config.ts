// Giá trị được vite.config.ts nhúng lúc build từ packages/config/app-env.mjs
// (cùng nguồn với next.config.mjs của bản SSR).
declare const __APP_CONFIG__: { storeLabel: string };

export const STORE_LABEL = __APP_CONFIG__.storeLabel;
