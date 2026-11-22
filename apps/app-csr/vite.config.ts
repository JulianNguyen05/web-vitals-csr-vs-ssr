import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Cấu hình build dùng chung với app-ssr/next.config.mjs (DATASET, SHOW_ARCH_LABEL).
import { readAppEnv, storeLabel } from "../../packages/config/app-env.mjs";

const env = readAppEnv();
const label = storeLabel("CSR", env.showArchLabel);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "tqmart-title",
      transformIndexHtml: (html) => html.replace("%STORE_LABEL%", label.replace("&", "&amp;")),
    },
  ],
  define: {
    __APP_CONFIG__: JSON.stringify({ storeLabel: label }),
  },
  resolve: {
    alias: { "@dataset": env.datasetPath },
  },
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
});
