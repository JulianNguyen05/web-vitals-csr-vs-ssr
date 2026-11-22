// Cấu hình build DÙNG CHUNG cho vite.config.ts (CSR) và next.config.mjs (SSR).
// Cả hai app đọc cùng 1 bộ biến môi trường, qua cùng 1 hàm kiểm tra → không thể lệch nhau.
//
//   DATASET          20 | 500 | 2000                 (mặc định 2000)  – ngưỡng dữ liệu
//   SHOW_ARCH_LABEL  1 | 0                           (mặc định 1)     – hiện nhãn CSR/SSR trên header + tiêu đề tab
//                    đặt 0 khi build bản dùng cho khảo sát người dùng (làm mù kiến trúc)
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export function readAppEnv(env = process.env) {
  const dataset = env.DATASET ?? "2000";
  if (!["20", "500", "2000"].includes(dataset)) {
    throw new Error(`DATASET không hợp lệ: "${dataset}" (chỉ nhận 20 | 500 | 2000)`);
  }

  const showArchLabel = (env.SHOW_ARCH_LABEL ?? "1") !== "0";

  return {
    dataset,
    showArchLabel,
    datasetPath: path.resolve(dir, `../data/json/products-${dataset}.json`),
  };
}

/** Tên cửa hàng hiển thị ở header / tiêu đề tab. */
export function storeLabel(arch, showArchLabel) {
  return showArchLabel ? `T&Q Mart (${arch})` : "T&Q Mart";
}
