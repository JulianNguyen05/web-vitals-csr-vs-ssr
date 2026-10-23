import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataset = process.env.DATASET ?? "2000";
if (!["20", "500", "2000"].includes(dataset)) throw new Error(`DATASET không hợp lệ: ${dataset}`);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias["@dataset"] = path.resolve(dir, `../../packages/data/json/products-${dataset}.json`);
    return config;
  },
};
export default nextConfig;