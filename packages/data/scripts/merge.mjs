// scripts/merge.mjs
//
// Gộp các file mock data theo từng ngành hàng (json/by-category/<count>/<slug>.json)
// thành lại 1 file phẳng duy nhất json/products-<count>.json — đúng định dạng mà
// app-csr / app-ssr đang import.
//
// THỨ TỰ SẢN PHẨM (quan trọng cho đo lường):
//   - products-20.json: nối theo thứ tự ngành hàng trong categories.json (như trước).
//   - products-500.json / products-2000.json: 20 sản phẩm ĐẦU TIÊN trùng đúng thứ tự
//     products-20.json, phần còn lại xếp xen kẽ lần lượt từng ngành hàng (round-robin).
//   → Khung nhìn đầu tiên (ảnh LCP, các ảnh eager) giống nhau ở cả 3 ngưỡng, nên khác
//     biệt đo được giữa các ngưỡng đến từ khối lượng dữ liệu, không phải từ ảnh khác nhau.
//   → Trang "Tất cả sản phẩm" có đủ các ngành ngay từ đầu thay vì toàn bộ là Điện tử.
//
// Cách chạy: node scripts/merge.mjs   (chạy từ trong packages/data, hoặc `pnpm merge`)

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const JSON_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "json");
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

/** Đọc sản phẩm theo từng ngành của 1 ngưỡng → [[...ngành 1], [...ngành 2], ...] */
function readByCategory(count) {
  const dir = join(JSON_DIR, "by-category", String(count));
  let missing = false;
  const groups = categories.map((category) => {
    const filePath = join(dir, `${category.slug}.json`);
    if (!existsSync(filePath)) {
      console.warn(`⚠️  Thiếu file: ${filePath} (bỏ qua ngành hàng "${category.name}")`);
      missing = true;
      return [];
    }
    return readJson(filePath);
  });
  return { groups, missing };
}

/** core đứng đầu theo đúng thứ tự, phần còn lại xen kẽ từng ngành. */
function orderProducts(groups, coreIds) {
  const byId = new Map(groups.flat().map((p) => [p.id, p]));
  const head = coreIds.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const used = new Set(head.map((p) => p.id));
  const queues = groups.map((g) => g.filter((p) => !used.has(p.id)));
  const tail = [];
  for (let i = 0; queues.some((q) => i < q.length); i++) {
    for (const q of queues) if (i < q.length) tail.push(q[i]);
  }
  return [...head, ...tail];
}

let coreIds = [];
for (const count of THRESHOLDS) {
  const { groups, missing } = readByCategory(count);
  const merged = count === 20 ? groups.flat() : orderProducts(groups, coreIds);
  if (count === 20) coreIds = merged.map((p) => p.id);

  const outPath = join(JSON_DIR, `products-${count}.json`);
  writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
  const headOk = merged.slice(0, coreIds.length).every((p, i) => p.id === coreIds[i]);
  console.log(
    `${missing ? "⚠️ " : "✅"} Gộp ${merged.length} sản phẩm từ ${categories.length} ngành hàng -> ${outPath}` +
      (count === 20 ? "" : headOk ? " (20 sp đầu trùng products-20 ✔)" : " (⚠️ 20 sp đầu KHÔNG trùng products-20)"),
  );
}
