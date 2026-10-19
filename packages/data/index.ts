import type { Category, Product } from "@repo/types";

/// <reference path="./dataset.d.ts" />
import categoriesJson from "./json/categories.json";
import productsJson from "@dataset";

export const categories: Category[] = categoriesJson;

// Ranh giới kiểu duy nhất. Schema đã được scripts/validate.mjs kiểm tra
// (chạy trong `pnpm sync` / `pnpm validate`), nên cast này an toàn.
export const products = productsJson as unknown as Product[];