// packages/data/scripts/reset-images.mjs
// Xoá sạch ảnh cũ để cào lại từ đầu.
//
//   node scripts/reset-images.mjs                 # xem trước (mặc định, không xoá gì)
//   node scripts/reset-images.mjs --yes           # xoá local: raw/<ngành>/, processed/, rejected/, cache
//   node scripts/reset-images.mjs --yes --r2      # xoá thêm ảnh trên R2 (thumb/, detail/, gallery/)
//
// Giữ nguyên: ảnh nằm thẳng trong assets/raw/ (no-image-icon.jpg...), misc/ trên R2, và toàn bộ file JSON.
// URL trong JSON không cần đổi vì tên file ảnh giữ nguyên theo slug.

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { CACHE, DATA_DIR, LEGACY_CACHE, PROCESSED_DIR, RAW_DIR, REJECTED_DIR, makeArgs } from './image-lib.mjs';

dotenv.config({ path: path.join(DATA_DIR, '.env') });
const { flag } = makeArgs();
const YES = flag('yes');
const R2 = flag('r2');
const PREFIXES = ['thumb/', 'detail/', 'gallery/']; // KHÔNG đụng misc/

const exists = (p) => fs.stat(p).then(() => true, () => false);

async function countFiles(dir) {
  let n = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    n += e.isDirectory() ? await countFiles(path.join(dir, e.name)) : 1;
  }
  return n;
}

// --- Local ---
const rawCatDirs = (await fs.readdir(RAW_DIR, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => path.join(RAW_DIR, e.name));
const cacheFiles = [...Object.values(CACHE), ...LEGACY_CACHE];
const localTargets = [...rawCatDirs, PROCESSED_DIR, REJECTED_DIR];

console.log(YES ? 'Đang xoá:' : 'Sẽ xoá (thêm --yes để thực hiện):');
for (const d of localTargets) {
  if (await exists(d)) console.log(`  ${path.relative(DATA_DIR, d)}  (${await countFiles(d)} file)`);
}
console.log(`  .cache: ${cacheFiles.filter((f) => f).length} file cache (nếu có)`);

if (YES) {
  for (const d of localTargets) await fs.rm(d, { recursive: true, force: true });
  for (const f of cacheFiles) await fs.rm(f, { force: true });
  console.log('Đã xoá local.');
}

// --- R2 ---
if (R2) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (![R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET].every(Boolean)) {
    console.error('Thiếu biến R2_* trong .env');
    process.exit(1);
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const keys = [];
  for (const Prefix of PREFIXES) {
    let ContinuationToken;
    do {
      const res = await client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix, ContinuationToken }));
      for (const o of res.Contents ?? []) keys.push(o.Key);
      ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);
  }
  console.log(`\nR2 bucket "${R2_BUCKET}": ${keys.length} object trong ${PREFIXES.join(', ')}`);

  if (YES) {
    let failed = 0;
    for (let i = 0; i < keys.length; i += 1000) {
      const res = await client.send(
        new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } })
      );
      failed += res.Errors?.length ?? 0;
    }
    console.log(`Đã xoá trên R2, lỗi: ${failed}.`);
  }
}

if (!YES) console.log('\n(Chưa xoá gì. Chạy lại với --yes.)');
