// scripts/process-images.mjs
//
// Đọc ảnh gốc trong assets/raw/<slug-ngành>/ và xuất WebP vào assets/processed/:
//   <slug>.jpg         -> thumb/<ngành>/<slug>.webp   (400x400)
//                      -> detail/<ngành>/<slug>.webp  (800x800)
//   <slug>-a|b|c.jpg   -> gallery/<ngành>/<slug>-a.webp (800x800)
//   ảnh nằm thẳng trong raw/ (vd no-image-icon.jpg) -> misc/<tên>.webp (tối đa 400px)
//
// Mọi ảnh dùng CÙNG một bộ tham số (kích thước, chất lượng) để không làm lệch số đo.
// Cách chạy (từ packages/data): node scripts/process-images.mjs

import sharp from "sharp";
import { readdirSync, mkdirSync, rmSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "assets", "raw");
const OUT = path.join(ROOT, "assets", "processed");

const QUALITY = 80;
const SIZE = { thumb: 400, detail: 800, gallery: 800 };
const IMG_EXT = /\.(jpe?g|png|webp)$/i;
const GALLERY_RE = /-\d+-[abc]$/; // slug luôn kết thúc bằng id số, nên -<id>-a/b/c là ảnh gallery

let totalIn = 0;
let totalOut = 0;
let count = 0;
const warnings = [];

async function toWebp(src, dest, size, fit = "cover") {
  mkdirSync(path.dirname(dest), { recursive: true });

  const meta = await sharp(src).metadata();
  if (fit === "cover" && Math.min(meta.width ?? 0, meta.height ?? 0) < size) {
    warnings.push(`${path.relative(RAW, src)}: ảnh gốc ${meta.width}x${meta.height} nhỏ hơn ${size}px, sẽ bị phóng to`);
  }

  const pipeline = sharp(src).rotate(); // tôn trọng hướng EXIF
  const resized =
    fit === "cover"
      ? pipeline.resize(size, size, { fit: "cover", position: "centre" })
      : pipeline.resize(size, size, { fit: "inside", withoutEnlargement: true });

  const info = await resized.webp({ quality: QUALITY }).toFile(dest);
  totalIn += statSync(src).size;
  totalOut += info.size;
  count++;
  console.log(`  ✓ ${path.relative(OUT, dest).split(path.sep).join("/")}  (${(info.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  if (!existsSync(RAW)) {
    console.error(`Không thấy thư mục ${RAW}`);
    process.exit(1);
  }

  rmSync(OUT, { recursive: true, force: true }); // xuất lại từ đầu cho sạch
  const entries = readdirSync(RAW, { withFileTypes: true });

  for (const entry of entries) {
    // Ảnh nằm thẳng trong raw/ (ảnh dự phòng, icon...)
    if (entry.isFile() && IMG_EXT.test(entry.name)) {
      const stem = path.parse(entry.name).name;
      await toWebp(path.join(RAW, entry.name), path.join(OUT, "misc", `${stem}.webp`), SIZE.thumb, "inside");
      continue;
    }
    if (!entry.isDirectory()) continue;

    const category = entry.name;
    console.log(`\n[${category}]`);
    const files = readdirSync(path.join(RAW, category)).filter((f) => IMG_EXT.test(f)).sort();

    for (const file of files) {
      const src = path.join(RAW, category, file);
      const stem = path.parse(file).name;

      if (GALLERY_RE.test(stem)) {
        await toWebp(src, path.join(OUT, "gallery", category, `${stem}.webp`), SIZE.gallery);
      } else {
        await toWebp(src, path.join(OUT, "thumb", category, `${stem}.webp`), SIZE.thumb);
        await toWebp(src, path.join(OUT, "detail", category, `${stem}.webp`), SIZE.detail);
      }
    }
  }

  console.log(`\nXong: ${count} file WebP, ${(totalIn / 1048576).toFixed(1)} MB gốc -> ${(totalOut / 1048576).toFixed(1)} MB`);
  if (warnings.length) {
    console.log("\nCảnh báo:");
    warnings.forEach((w) => console.log("  ! " + w));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
