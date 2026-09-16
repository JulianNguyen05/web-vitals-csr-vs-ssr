// scripts/merge.mjs
//
// Gộp các file mock data theo từng ngành hàng (json/by-category/<count>/<slug>.json)
// thành lại 1 file phẳng duy nhất json/products-<count>.json — đúng định dạng mà
// app-csr / app-ssr đang import.
//
// Dùng khi bạn CHỈNH SỬA TAY dữ liệu trong các file theo ngành hàng (thêm/sửa/xoá
// sản phẩm của 1 ngành) và muốn build lại products-20.json / products-500.json /
// products-2000.json mà không cần chạy lại generate.mjs (generate.mjs sẽ SINH DỮ
// LIỆU MỚI HOÀN TOÀN bằng faker, còn merge.mjs chỉ GHÉP dữ liệu đã có).
//
// Cách chạy: node scripts/merge.mjs   (chạy từ trong packages/data)

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const JSON_DIR = "./json";
const THRESHOLDS = [20, 500, 2000];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const categoriesPath = join(JSON_DIR, "categories.json");
if (!existsSync(categoriesPath)) {
  console.error(`Không tìm thấy ${categoriesPath}`);
  process.exit(1);
}
const categories = readJson(categoriesPath);

for (const count of THRESHOLDS) {
  const dir = join(JSON_DIR, "by-category", String(count));
  const merged = [];
  let missing = false;

  for (const category of categories) {
    const filePath = join(dir, `${category.slug}.json`);
    if (!existsSync(filePath)) {
      console.warn(`⚠️  Thiếu file: ${filePath} (bỏ qua ngành hàng "${category.name}")`);
      missing = true;
      continue;
    }
    const products = readJson(filePath);
    merged.push(...products);
  }

  const outPath = join(JSON_DIR, `products-${count}.json`);
  writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
  console.log(
    `${missing ? "⚠️ " : "✅"} Gộp ${merged.length} sản phẩm từ ${categories.length} ngành hàng -> ${outPath}`
  );
}
