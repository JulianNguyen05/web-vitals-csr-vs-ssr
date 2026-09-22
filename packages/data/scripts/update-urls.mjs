// scripts/update-urls.mjs
//
// Đổi thumbUrl / detailUrl / gallery trong json/by-category/<số lượng>/*.json
// từ picsum.photos sang URL ảnh trên R2. URL được tính từ `slug` của từng sản phẩm
// và tên file JSON (= slug ngành), nên chạy lại nhiều lần vẫn cho cùng kết quả.
//
//   thumbUrl  -> ${R2_PUBLIC_BASE}/thumb/<ngành>/<slug>.webp
//   detailUrl -> ${R2_PUBLIC_BASE}/detail/<ngành>/<slug>.webp
//   gallery   -> ${R2_PUBLIC_BASE}/gallery/<ngành>/<slug>-a.webp, -b, -c ...
//
// Cách chạy (từ packages/data): node scripts/update-urls.mjs [số lượng]   (mặc định 20)
// Sau đó chạy lại merge để tạo lại products-<số lượng>.json.

import dotenv from "dotenv";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const BASE = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");
if (!BASE) {
  console.error("Thiếu R2_PUBLIC_BASE trong .env (vd https://pub-xxxxxxxx.r2.dev)");
  process.exit(1);
}

const count = process.argv[2] || "20";
const dir = path.join(ROOT, "json", "by-category", count);
if (!existsSync(dir)) {
  console.error(`Không thấy thư mục ${dir}`);
  process.exit(1);
}

const PROCESSED = path.join(ROOT, "assets", "processed");
const SUFFIX = ["a", "b", "c", "d", "e"];
const missing = [];
let updated = 0;

function check(rel) {
  if (existsSync(PROCESSED) && !existsSync(path.join(PROCESSED, rel))) missing.push(rel);
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const category = path.parse(file).name;
  const filePath = path.join(dir, file);
  const products = JSON.parse(readFileSync(filePath, "utf8"));

  for (const p of products) {
    const thumb = `thumb/${category}/${p.slug}.webp`;
    const detail = `detail/${category}/${p.slug}.webp`;
    const gallery = (p.gallery ?? []).map((_, i) => `gallery/${category}/${p.slug}-${SUFFIX[i]}.webp`);

    [thumb, detail, ...gallery].forEach(check);

    p.thumbUrl = `${BASE}/${thumb}`;
    p.detailUrl = `${BASE}/${detail}`;
    p.gallery = gallery.map((g) => `${BASE}/${g}`);
    updated++;
  }

  writeFileSync(filePath, JSON.stringify(products, null, 2) + "\n");
  console.log(`✓ ${file} (${products.length} sản phẩm)`);
}

console.log(`\nĐã cập nhật ${updated} sản phẩm trong by-category/${count}. Nhớ chạy lại merge.`);
if (missing.length) {
  console.log("\nCảnh báo - chưa có ảnh đã xử lý cho các URL sau:");
  missing.forEach((m) => console.log("  ! " + m));
}
