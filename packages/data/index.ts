/// <reference path="./dataset.d.ts" />
// Lưu ý: chỉ thị /// <reference> phải nằm ở DÒNG ĐẦU file, nếu đặt sau import sẽ bị TypeScript bỏ qua.
import type { CartProduct, Category, Product } from "@repo/types";
import categoriesJson from "./json/categories.json";
import productsJson from "@dataset";

export const categories: Category[] = categoriesJson;

// Ranh giới kiểu duy nhất. Schema đã được scripts/validate.mjs kiểm tra
// (chạy trong `pnpm sync` / `pnpm validate`), nên cast này an toàn.
export const products = productsJson as unknown as Product[];

/** Rút gọn danh mục cho trang giỏ hàng: chỉ giữ trường giỏ hàng cần hiển thị. */
export function toCartCatalog(list: Product[]): CartProduct[] {
  return list.map(({ id, name, price, thumbUrl }) => ({ id, name, price, thumbUrl }));
}

export * from "./listing";
