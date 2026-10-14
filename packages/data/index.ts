import type { Category, Product } from "@repo/types";
import categoriesJson from "./json/categories.json";
// Đổi ngưỡng dữ liệu (20 | 500 | 2000): chỉ sửa DÒNG IMPORT NÀY.
// Chỉ file được import mới vào bundle, nên không phình bundle ở các ngưỡng còn lại.
import productsJson from "./json/products-2000.json";

export const categories: Category[] = categoriesJson;

// Ranh giới kiểu duy nhất. Schema đã được scripts/validate.mjs kiểm tra
// (chạy trong `pnpm sync` / `pnpm validate`), nên cast này an toàn.
export const products = productsJson as unknown as Product[];