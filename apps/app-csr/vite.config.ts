import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataset = process.env.DATASET ?? "2000";
if (!["20", "500", "2000"].includes(dataset)) throw new Error(`DATASET không hợp lệ: ${dataset}`);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@dataset": path.resolve(dir, `../../packages/data/json/products-${dataset}.json`) },
  },
  server: { port: 5180, strictPort: true },
});