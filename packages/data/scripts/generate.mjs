// scripts/generate.mjs
//
// Sinh mock data theo 3 ngưỡng thực nghiệm (20 / 500 / 2.000 sản phẩm).
// Mỗi ngưỡng được chia thành 1 file JSON riêng cho từng ngành hàng
// (json/by-category/<count>/<slug>.json) để dễ quản lý/chỉnh sửa,
// đồng thời tự động gộp lại thành file phẳng json/products-<count>.json
// (giữ nguyên định dạng mà app-csr / app-ssr đang import trực tiếp).
//
// Cách chạy: node scripts/generate.mjs   (chạy từ trong packages/data)

import { faker } from "@faker-js/faker";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CATEGORIES = [
  { id: "cat-1", name: "Điện tử", slug: "dien-tu" },
  { id: "cat-2", name: "Thời trang", slug: "thoi-trang" },
  { id: "cat-3", name: "Gia dụng", slug: "gia-dung" },
  { id: "cat-4", name: "Sách", slug: "sach" },
];

function makeProduct(i, category) {
  const name = faker.commerce.productName();
  const slug = `${faker.helpers.slugify(name).toLowerCase()}-${i}`;
  return {
    id: `prod-${i}`,
    name,
    slug,
    price: faker.number.int({ min: 50000, max: 5000000 }),
    categoryId: category.id,
    thumbUrl: `https://picsum.photos/seed/prod-${i}/400/400`,
    detailUrl: `https://picsum.photos/seed/prod-${i}/800/800`,
    description: faker.commerce.productDescription(),
  };
}

// Chia đều `count` sản phẩm cho N ngành hàng (phần dư rải vào các ngành đầu tiên),
// đảm bảo mọi ngành hàng đều có dữ liệu ở mọi ngưỡng (kể cả ngưỡng 20).
function splitCounts(count, n) {
  const base = Math.floor(count / n);
  const remainder = count % n;
  return Array.from({ length: n }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

function generateByCategory(count) {
  const counts = splitCounts(count, CATEGORIES.length);
  let seq = 1;
  return CATEGORIES.map((category, idx) => ({
    category,
    products: Array.from({ length: counts[idx] }, () => makeProduct(seq++, category)),
  }));
}

const JSON_DIR = "./json";
mkdirSync(JSON_DIR, { recursive: true });

for (const count of [20, 500, 2000]) {
  const byCategory = generateByCategory(count);

  const catDir = join(JSON_DIR, "by-category", String(count));
  mkdirSync(catDir, { recursive: true });

  const merged = [];
  for (const { category, products } of byCategory) {
    writeFileSync(
      join(catDir, `${category.slug}.json`),
      JSON.stringify(products, null, 2) + "\n"
    );
    merged.push(...products);
  }

  writeFileSync(
    join(JSON_DIR, `products-${count}.json`),
    JSON.stringify(merged, null, 2) + "\n"
  );

  console.log(
    `Generated ${count}: ${CATEGORIES.length} file theo ngành hàng + products-${count}.json (${merged.length} items)`
  );
}

writeFileSync(join(JSON_DIR, "categories.json"), JSON.stringify(CATEGORIES, null, 2) + "\n");
console.log("Generated categories.json");
