// Cấu hình build dùng chung với app-csr/vite.config.ts (DATASET, SHOW_ARCH_LABEL).
import { readAppEnv, storeLabel } from "../../packages/config/app-env.mjs";

const env = readAppEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    APP_STORE_LABEL: storeLabel("SSR", env.showArchLabel),
  },
  webpack(config) {
    config.resolve.alias["@dataset"] = env.datasetPath;
    // Cache webpack của Next (.next/cache, Vercel cũng giữ giữa các lần deploy) KHÔNG tự nhận ra
    // khi alias @dataset trỏ sang file khác → build mới vẫn dùng dữ liệu của ngưỡng cũ.
    // Gắn ngưỡng dữ liệu vào version cache để mỗi ngưỡng có cache riêng.
    if (config.cache && typeof config.cache === "object") {
      config.cache.version = `${config.cache.version ?? ""}|dataset-${env.dataset}`;
    }
    return config;
  },
};
export default nextConfig;
