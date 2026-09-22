// scripts/upload-r2.mjs
//
// Upload assets/processed/ lên bucket R2, giữ nguyên cấu trúc thư mục:
//   assets/processed/thumb/dien-tu/x.webp  ->  <bucket>/thumb/dien-tu/x.webp
//
//  - File mới hoặc đã đổi nội dung  -> upload (ghi đè, không tốn thêm dung lượng)
//  - File không đổi (so MD5/ETag)    -> bỏ qua
//
// MẶC ĐỊNH KHÔNG XOÁ GÌ TRÊN R2. An toàn khi nhiều người mỗi người chỉ có ảnh gốc
// của một phần sản phẩm trên máy mình (vd mỗi partner phụ trách vài ngành) — chạy
// upload bình thường sẽ không đụng tới ảnh do người khác đã upload trước đó.
//
// Chỉ dùng --prune khi chắc chắn assets/raw/ trên máy đang chạy đã có ĐẦY ĐỦ ảnh
// của TẤT CẢ sản phẩm (mọi ngành, mọi partner đã gộp về), việc này để xoá ảnh
// mồ côi (sản phẩm đã xoá/đổi tên) — chỉ nên do một người (chủ dự án) chạy, không
// nên đưa vào script "dev"/"sync" dùng chung.
//
// Cần file .env trong packages/data: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET.
//
// Cách chạy (từ packages/data):
//   node scripts/upload-r2.mjs                 chỉ upload, không xoá gì
//   node scripts/upload-r2.mjs --prune          upload + xoá ảnh mồ côi trên R2
//   node scripts/upload-r2.mjs --prune --dry-run   xem trước sẽ upload/xoá gì, không làm gì cả

import dotenv from "dotenv";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const OUT = path.join(ROOT, "assets", "processed");
const PREFIXES = ["thumb/", "detail/", "gallery/", "misc/"]; // chỉ đụng tới các thư mục này trên bucket
const DRY_RUN = process.argv.includes("--dry-run");
const PRUNE = process.argv.includes("--prune");
const CONCURRENCY = 6;

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Thiếu biến môi trường trong .env: ${missing.join(", ")}`);
  process.exit(1);
}
if (!existsSync(OUT)) {
  console.error(`Chưa có ${OUT}. Hãy chạy process-images.mjs trước.`);
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  // Tránh lỗi checksum tự động của AWS SDK bản mới khi làm việc với dịch vụ tương thích S3
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

// key -> { file, md5 } cho ảnh local
function scanLocal() {
  const local = new Map();
  for (const file of walk(OUT)) {
    const key = path.relative(OUT, file).split(path.sep).join("/");
    const md5 = createHash("md5").update(readFileSync(file)).digest("hex");
    local.set(key, { file, md5 });
  }
  return local;
}

// key -> etag cho ảnh đang có trên R2 (ETag của PutObject thường chính là MD5)
async function listRemote() {
  const remote = new Map();
  for (const Prefix of PREFIXES) {
    let ContinuationToken;
    do {
      const res = await client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix, ContinuationToken }));
      for (const obj of res.Contents ?? []) remote.set(obj.Key, (obj.ETag ?? "").replaceAll('"', ""));
      ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);
  }
  return remote;
}

async function upload(key, file) {
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: readFileSync(file),
      ContentType: "image/webp",
      // Cache dài hạn. Nếu thay ảnh giữ nguyên tên, trình duyệt/edge có thể còn giữ bản cũ:
      // hãy hard-reload hoặc purge cache của Cloudflare.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

async function runPool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) await worker(queue.shift());
    })
  );
}

async function main() {
  const local = scanLocal();
  if (local.size === 0) {
    console.error("assets/processed/ đang rỗng. Hãy chạy process-images.mjs trước.");
    process.exit(1);
  }
  if (PRUNE) {
    console.log(
      "⚠ --prune: sẽ xoá trên R2 mọi ảnh không có trong assets/processed/ của MÁY NÀY.\n" +
      "  Chỉ chạy khi chắc chắn assets/raw/ ở đây đã có đủ ảnh của mọi ngành/mọi partner.\n"
    );
  }

  const remote = await listRemote();
  const toUpload = [...local].filter(([key, { md5 }]) => remote.get(key) !== md5).map(([key, v]) => ({ key, ...v }));
  const toDelete = PRUNE ? [...remote.keys()].filter((key) => !local.has(key)) : [];
  const unchanged = local.size - toUpload.length;

  console.log(`Local: ${local.size} ảnh | R2 hiện có: ${remote.size} ảnh`);
  console.log(
    `  Upload: ${toUpload.length} (mới/đã đổi) | Bỏ qua: ${unchanged} (không đổi)` +
    (PRUNE ? ` | Xoá: ${toDelete.length} (local không còn)` : ` | Xoá: bỏ qua (thêm --prune để bật)`)
  );

  if (DRY_RUN) {
    toUpload.forEach((f) => console.log(`  + ${f.key}${remote.has(f.key) ? "  (ghi đè)" : ""}`));
    toDelete.forEach((k) => console.log(`  - ${k}`));
    console.log("\n--dry-run: chưa thay đổi gì trên R2.");
    return;
  }

  let failed = 0;

  let done = 0;
  await runPool(toUpload, async ({ key, file }) => {
    try {
      await upload(key, file);
      console.log(`  ✓ [${++done}/${toUpload.length}] ${key}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${key}: ${err.message}`);
    }
  });

  // Chỉ xoá khi upload không lỗi, tránh trường hợp mất ảnh cũ mà ảnh mới chưa lên
  if (toDelete.length && failed === 0) {
    for (let i = 0; i < toDelete.length; i += 1000) {
      const chunk = toDelete.slice(i, i + 1000);
      const res = await client.send(
        new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } })
      );
      (res.Errors ?? []).forEach((e) => {
        failed++;
        console.error(`  ✗ xoá ${e.Key}: ${e.Message}`);
      });
    }
    toDelete.forEach((k) => console.log(`  - đã xoá ${k}`));
  } else if (toDelete.length) {
    console.log("\nBỏ qua bước xoá vì có ảnh upload lỗi. Chạy lại sau khi sửa lỗi.");
  }

  console.log(`\nXong: upload ${toUpload.length - failed}, bỏ qua ${unchanged}, xoá ${failed === 0 ? toDelete.length : 0}, lỗi ${failed}.`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
