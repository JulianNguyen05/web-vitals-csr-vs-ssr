// packages/data/scripts/filter-images.mjs
// Kiểm tra từng ảnh trong assets/raw sau khi cào, chạy hoàn toàn offline trên máy bạn
// (model tải về 1 lần từ Hugging Face rồi cache):
//   1. NSFW      : onnx-community/nsfw_image_detection-ONNX (ViT, nhãn normal/nsfw)
//   2. Độ khớp   : CLIP zero-shot — ảnh có đúng là "<từ khoá sản phẩm>" không, có phải ảnh người /
//                  gợi cảm / phong cảnh / không liên quan không
//   3. Trùng lặp : dHash, loại ảnh gần giống nhau trong cùng ngành
// Ảnh không đạt được CHUYỂN sang assets/rejected/<ngành>/<lý-do>__<tên>.jpg (xem lại được),
// id ảnh được ghi vào .cache/rejected-ids.json để scrape-images không chọn lại.
//
// Chạy (từ packages/data):
//   node scripts/filter-images.mjs --dry            # chỉ báo cáo, không chuyển file (nên chạy thử trước)
//   node scripts/filter-images.mjs                  # lọc thật
//   Cờ: --category thoi-trang | --limit 200 | --nsfw 0.15 | --match 0.30 | --unsafe 0.25
//       --allow-people | --no-dedupe | --recheck
//
// Vòng lặp khuyến nghị:  scrape -> filter -> scrape (bù ảnh bị loại) -> filter ... đến khi không còn ảnh bị loại.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { RawImage, pipeline } from '@huggingface/transformers';
import { CACHE, CACHE_DIR, RAW_DIR, REJECTED_DIR, loadJson, makeArgs, saveJson } from './image-lib.mjs';

const { flag, opt } = makeArgs();
const DRY = flag('dry');
const ONLY_CATEGORY = opt('category');
const LIMIT = opt('limit') ? Number(opt('limit')) : Infinity;
const NSFW_T = Number(opt('nsfw') ?? 0.15); // điểm NSFW > ngưỡng -> loại (đặt thấp = nghiêm)
const MATCH_T = Number(opt('match') ?? 0.3); // xác suất CLIP của nhãn sản phẩm < ngưỡng -> loại
const UNSAFE_T = Number(opt('unsafe') ?? 0.25); // tổng xác suất các nhãn gợi cảm > ngưỡng -> loại
const PERSON_T = 0.35;
const DEDUPE = !flag('no-dedupe');
const HAMMING_T = 5; // dHash 64 bit, cách nhau <= 5 bit coi là trùng
const ALLOW_PEOPLE = flag('allow-people');

const NSFW_MODEL = process.env.NSFW_MODEL || 'onnx-community/nsfw_image_detection-ONNX';
const CLIP_MODEL = process.env.CLIP_MODEL || 'Xenova/clip-vit-base-patch32';

const UNSAFE_LABELS = ['a naked person', 'a sexually suggestive photo of a woman', 'a person in lingerie or a bikini'];
const PERSON_LABEL = 'a photo of a person';
const OTHER_LABELS = ['a landscape or nature scene', 'a blurry unrelated picture', 'a poster with text or an illustration'];

// ---------- Dữ liệu ----------
const meta = await loadJson(CACHE.meta, {});
const checked = flag('recheck') ? {} : await loadJson(CACHE.checked, {});
const rejectedIds = new Set(await loadJson(CACHE.rejected, []));

const keys = Object.keys(meta)
  .filter((k) => !ONLY_CATEGORY || meta[k].cat === ONLY_CATEGORY)
  .filter((k) => !checked[k])
  .sort();
const todo = keys.slice(0, LIMIT);
if (!todo.length) {
  console.log('Không có ảnh mới cần kiểm tra (đã kiểm tra hết, hoặc chưa chạy scrape-images).');
  process.exit(0);
}
console.log(`Cần kiểm tra: ${todo.length} ảnh${DRY ? ' (--dry: không chuyển file)' : ''}`);

console.log('Đang nạp model (lần đầu sẽ tải về, vài trăm MB)...');
const nsfwClassifier = await pipeline('image-classification', NSFW_MODEL);
const clip = await pipeline('zero-shot-image-classification', CLIP_MODEL);

// ---------- Tiện ích ----------
async function loadForModel(file) {
  const { data, info } = await sharp(file).rotate().removeAlpha().resize(256, 256, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
  return new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
}

async function dhash(file) {
  const buf = await sharp(file).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (buf[y * 9 + x] > buf[y * 9 + x + 1] ? 1n : 0n);
  return h;
}

function hamming(a, b) {
  let x = a ^ b;
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

// hash của các ảnh đã đạt trước đó, theo ngành
const hashesByCat = new Map();
for (const [k, v] of Object.entries(checked)) {
  if (!v.ok || !v.hash || !meta[k]) continue;
  const cat = meta[k].cat;
  if (!hashesByCat.has(cat)) hashesByCat.set(cat, []);
  hashesByCat.get(cat).push({ key: k, hash: BigInt(`0x${v.hash}`) });
}

// ---------- Kiểm tra ----------
const rows = ['key,query,reason,match,nsfw,unsafe,person'];
const rejectedCount = {};
let ok = 0;
let n = 0;

async function evaluate(key) {
  const m = meta[key];
  const file = path.join(RAW_DIR, key);
  const img = await loadForModel(file);

  const nsfwOut = await nsfwClassifier(img, { top_k: 2 });
  const nsfw = nsfwOut.find((o) => /nsfw/i.test(o.label))?.score ?? 0;

  const labels = [m.query, ...UNSAFE_LABELS, PERSON_LABEL, ...OTHER_LABELS];
  const clipOut = await clip(img, labels);
  const prob = (label) => clipOut.find((o) => o.label === label)?.score ?? 0;
  const match = prob(m.query);
  const unsafe = UNSAFE_LABELS.reduce((s, l) => s + prob(l), 0);
  const person = prob(PERSON_LABEL);

  let reason = null;
  if (nsfw > NSFW_T) reason = 'nsfw';
  else if (unsafe > UNSAFE_T) reason = 'suggestive';
  else if (!ALLOW_PEOPLE && person > PERSON_T) reason = 'person';
  else if (match < MATCH_T) reason = 'mismatch';

  let hash = null;
  if (!reason && DEDUPE) {
    hash = await dhash(file);
    const list = hashesByCat.get(m.cat) ?? [];
    const dup = list.find((o) => hamming(o.hash, hash) <= HAMMING_T);
    if (dup) reason = 'duplicate';
  }
  return { reason, match, nsfw, unsafe, person, hash };
}

for (const key of todo) {
  n++;
  const m = meta[key];
  let r;
  try {
    r = await evaluate(key);
  } catch (err) {
    console.warn(`  ! ${key}: không đọc được (${err.message}), coi như loại`);
    r = { reason: 'unreadable', match: 0, nsfw: 0, unsafe: 0, person: 0, hash: null };
  }
  const f = (x) => x.toFixed(2);
  rows.push([key, `"${m.query}"`, r.reason ?? 'ok', f(r.match), f(r.nsfw), f(r.unsafe), f(r.person)].join(','));

  if (!r.reason) {
    ok++;
    if (r.hash !== null) {
      if (!hashesByCat.has(m.cat)) hashesByCat.set(m.cat, []);
      hashesByCat.get(m.cat).push({ key, hash: r.hash });
    }
    if (!DRY) checked[key] = { ok: true, match: +f(r.match), hash: r.hash !== null ? r.hash.toString(16) : undefined };
  } else {
    rejectedCount[r.reason] = (rejectedCount[r.reason] ?? 0) + 1;
    if (!DRY) {
      const dest = path.join(REJECTED_DIR, m.cat, `${r.reason}__${path.basename(key)}`);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.rename(path.join(RAW_DIR, key), dest).catch(() => {});
      rejectedIds.add(m.id);
      delete meta[key];
    }
  }

  if (n % 25 === 0) {
    console.log(`  [${n}/${todo.length}] đạt ${ok} | loại ${n - ok} ${JSON.stringify(rejectedCount)}`);
    if (!DRY) await Promise.all([saveJson(CACHE.checked, checked), saveJson(CACHE.meta, meta), saveJson(CACHE.rejected, [...rejectedIds])]);
  }
}

if (!DRY) await Promise.all([saveJson(CACHE.checked, checked), saveJson(CACHE.meta, meta), saveJson(CACHE.rejected, [...rejectedIds])]);
await fs.mkdir(CACHE_DIR, { recursive: true });
await fs.writeFile(CACHE.report, rows.join('\n'));

console.log(`\nXong: đạt ${ok}/${todo.length}, loại ${todo.length - ok} ${JSON.stringify(rejectedCount)}`);
console.log(`Báo cáo chi tiết: ${path.relative(process.cwd(), CACHE.report)}`);
if (DRY) console.log('--dry: chưa chuyển file nào. Xem báo cáo để chỉnh ngưỡng (--match, --nsfw, --unsafe) rồi chạy lại không có --dry.');
else if (todo.length - ok > 0) console.log('Chạy lại scrape-images.mjs để bù các ảnh vừa bị loại, rồi filter-images.mjs lần nữa.');
