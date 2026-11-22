import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const jsonDir = join(dirname(fileURLToPath(import.meta.url)), "..", "json");
const read = (name) => JSON.parse(readFileSync(join(jsonDir, name), "utf8"));

const categoryIds = new Set(read("categories.json").map((c) => c.id));

const str = (v) => typeof v === "string" && v.trim() !== "";
const num = (v) => typeof v === "number" && Number.isFinite(v);
const url = (v) => str(v) && /^https?:\/\//.test(v);
const optional = (v, check) => v === undefined || Boolean(check(v));

function checkProduct(p) {
  const bad = [];
  const rule = (ok, field) => { if (!ok) bad.push(field); };

  rule(str(p.id), "id");
  rule(str(p.name), "name");
  rule(str(p.slug), "slug");
  rule(num(p.price) && p.price > 0, "price");
  rule(categoryIds.has(p.categoryId), "categoryId");
  rule(url(p.thumbUrl), "thumbUrl");
  rule(url(p.detailUrl), "detailUrl");
  rule(str(p.description), "description");

  for (const f of ["brand", "sku", "unit", "shortDescription", "origin", "warranty", "createdAt"])
    rule(optional(p[f], str), f);
  for (const f of ["originalPrice", "discountPercent", "stock", "soldCount", "weight"])
    rule(optional(p[f], num), f);

  rule(optional(p.gallery, (v) => Array.isArray(v) && v.every(url)), "gallery");
  rule(optional(p.tags, (v) => Array.isArray(v) && v.every(str)), "tags");
  rule(
    optional(p.specifications, (v) =>
      v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every(str)),
    "specifications"
  );
  rule(
    optional(p.rating, (v) => v && num(v.average) && v.average >= 0 && v.average <= 5 && num(v.count)),
    "rating"
  );
  rule(
    optional(p.dimensions, (v) => v && num(v.length) && num(v.width) && num(v.height)),
    "dimensions"
  );
  return bad;
}

let failed = false;
for (const file of ["products-20.json", "products-500.json", "products-2000.json"]) {
  const list = read(file);
  const ids = new Set();
  const slugs = new Set();
  const errors = [];

  if (!Array.isArray(list)) {
    errors.push("không phải mảng");
  } else {
    list.forEach((p, i) => {
      const bad = checkProduct(p);
      if (bad.length) errors.push(`#${i} ${p.id ?? "?"}: sai/thiếu ${bad.join(", ")}`);
      if (ids.has(p.id)) errors.push(`#${i}: trùng id ${p.id}`);
      if (slugs.has(p.slug)) errors.push(`#${i}: trùng slug ${p.slug}`);
      ids.add(p.id);
      slugs.add(p.slug);
    });
  }

  console.log(`${file}: ${Array.isArray(list) ? list.length : 0} sản phẩm, ${errors.length} lỗi`);
  errors.slice(0, 20).forEach((e) => console.error("  - " + e));
  if (errors.length) failed = true;
}
// Thứ tự: 20 sản phẩm đầu của 500/2000 phải trùng products-20 (cùng khung nhìn đầu ở mọi ngưỡng).
// Chỉ cảnh báo, không làm fail — chạy `pnpm merge` để sắp xếp lại.
{
  const core = read("products-20.json").map((p) => p.id);
  for (const file of ["products-500.json", "products-2000.json"]) {
    const head = read(file).slice(0, core.length).map((p) => p.id);
    const same = core.every((id, i) => head[i] === id);
    console.log(`${file}: 20 sản phẩm đầu ${same ? "trùng products-20 ✔" : "KHÁC products-20 ⚠️  (chạy pnpm merge)"}`);
  }
}

process.exit(failed ? 1 : 0);
