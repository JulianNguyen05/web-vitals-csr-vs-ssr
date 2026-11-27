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
  // Nhúng file JSON sản phẩm dưới dạng JSON.parse("...") thay vì object literal JavaScript:
  // V8 phân tích JSON.parse nhanh hơn nhiều với object lớn (2,7 MB ở ngưỡng 2000).
  // Thiếu dòng này, TBT/LCP của CSR chậm do cách build chứ không do kiến trúc.
  json: { stringify: true },
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
});
