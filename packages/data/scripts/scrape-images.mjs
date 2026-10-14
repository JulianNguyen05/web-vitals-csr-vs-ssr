// packages/data/scripts/scrape-images.mjs
// Đọc products-2000.json -> tải ảnh (Pixabay API) -> lưu vào assets/raw/<category-slug>/
//   <slug>.jpg           (ảnh chính -> thumb + detail)
//   <slug>-a|b|c.jpg     (gallery)
// Khớp quy ước của process-images.mjs. Bỏ qua ảnh đã tồn tại, chạy lại được (resumable).
//
// Chạy:
//   node --env-file=.env scripts/scrape-images.mjs --dry            # xem kế hoạch, không tải
//   node --env-file=.env scripts/scrape-images.mjs --limit 20       # thử 20 ảnh
//   node --env-file=.env scripts/scrape-images.mjs                  # tải toàn bộ phần còn thiếu
//   node --env-file=.env scripts/scrape-images.mjs --category dien-tu
//
// Cần: Node >= 20.6, PIXABAY_API_KEY trong .env (đăng ký free, có key ngay tại https://pixabay.com/api/docs/)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- Cấu hình ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..');
const JSON_FILE = path.join(DATA_DIR, 'json', 'products-2000.json');
const RAW_DIR = path.join(DATA_DIR, 'assets', 'raw');
const CACHE_FILE = path.join(__dirname, '.cache', 'pixabay-pools.json');
const FAILED_FILE = path.join(__dirname, '.cache', 'scrape-failed.json');

const SUFFIXES = ['', '-a', '-b', '-c']; // '' = ảnh chính, còn lại là gallery
const CONCURRENCY = 5;
const POOL_PAGES = 2; // 2 trang x 200 = tối đa 400 ảnh / từ khoá (Pixabay giới hạn ~500 kết quả/query)
const MAX_RETRY = 3;
const API_KEY = process.env.PIXABAY_API_KEY;

// ---------- Tham số CLI ----------
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = args.includes('--dry');
const LIMIT = getArg('limit') ? Number(getArg('limit')) : Infinity;
const ONLY_CATEGORY = getArg('category');
const QUERIES = args.includes('--queries'); // in danh sách từ khoá sẽ dùng rồi thoát
const VERIFY = args.includes('--verify'); // quét assets/raw tìm file hỏng / không đọc được bằng sharp
const DELETE_BAD = args.includes('--delete'); // dùng kèm --verify: xoá file hỏng để lần chạy sau tải lại
const CLEAN = args.includes('--clean'); // xoá các ảnh do script này đã tải (theo manifest)

// Từ khoá tiếng Anh dự phòng theo category (Pixabay tìm tiếng Việt không dấu rất tệ -> ra ảnh sai hoàn toàn)
const CATEGORY_EN = {
  'dien-tu': 'electronics gadget',
  'gia-dung': 'home appliance',
  'me-va-be-do-choi-tre-em': 'baby toys',
  'my-pham-cham-soc-ca-nhan': 'cosmetics skincare',
  'noi-that-trang-tri': 'furniture home decor',
  'sach-van-phong-pham': 'stationery office supplies',
  'the-thao-da-ngoai': 'sports equipment outdoor',
  'thoi-trang': 'fashion clothing',
  'thuc-pham-do-uong': 'food drink',
  'vat-nuoi-thu-cung': 'pet supplies',
};
// Ghi đè từ khoá: tạo scripts/image-queries.json dạng { "đồng hồ thông minh": "smartwatch" }
const OVERRIDES = JSON.parse(await fs.readFile(path.join(__dirname, 'image-queries.json'), 'utf8').catch(() => '{}'));
const isAscii = (str) => /^[\x20-\x7e]+$/.test(str);

function resolveQuery(key, cat) {
  const k = key.trim();
  if (OVERRIDES[k]) return OVERRIDES[k];
  if (k && isAscii(k)) return k; // tag tiếng Anh như "laptop", "smartphone" dùng được luôn
  return CATEGORY_EN[cat] ?? 'product'; // tag tiếng Việt chưa có override -> dùng từ khoá chung của ngành
}

// ---------- Tiện ích ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Lấy slug thư mục category từ thumbUrl: .../thumb/<category>/<slug>.webp
function categoryFolder(product) {
  const m = product.thumbUrl?.match(/\/thumb\/([^/]+)\//);
  return m ? m[1] : null;
}

async function readExistingBases(dir) {
  try {
    const files = await fs.readdir(dir);
    return new Set(files.map((f) => f.replace(/\.[^.]+$/, '')));
  } catch {
    return new Set();
  }
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ---------- Pixabay ----------
const poolCache = await loadJson(CACHE_FILE, {});
const poolPromises = new Map();

async function fetchWithRetry(url, options = {}) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        // Pixabay: 100 request / 60s; header X-RateLimit-Reset = số giây còn lại
        const wait = Number(res.headers.get('x-ratelimit-reset')) || 60;
        console.warn(`  429 rate limit, chờ ${wait}s...`);
        await sleep(wait * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt === MAX_RETRY) throw err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error('Hết số lần thử');
}

async function searchPool(query) {
  if (poolCache[query]) return poolCache[query];
  const urls = [];
  for (let page = 1; page <= POOL_PAGES; page++) {
    const api =
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}` +
      `&image_type=photo&per_page=200&page=${page}&safe_search=true&min_width=800&min_height=800`;
    const res = await fetchWithRetry(api);
    const data = await res.json();
    // largeImageURL = bản 1280px, đủ cho detail 800x800 (process-images.mjs cắt cover)
    for (const h of data.hits ?? []) urls.push(h.largeImageURL);
    if ((data.hits?.length ?? 0) < 200) break; // hết kết quả
  }
  poolCache[query] = urls;
  await saveJson(CACHE_FILE, poolCache);
  return urls;
}

// Mỗi từ khoá chỉ search 1 lần (cache cả trên đĩa) -> tiết kiệm quota
function getPool(query) {
  if (!poolPromises.has(query)) poolPromises.set(query, searchPool(query));
  return poolPromises.get(query);
}

async function download(url, destPath) {
  const res = await fetchWithRetry(url);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`Không phải ảnh: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sharp = await getSharp();
  await sharp(buf).metadata(); // ném lỗi nếu không phải ảnh hợp lệ -> không ghi file hỏng xuống đĩa
  const tmp = `${destPath}.part`;
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, destPath); // tránh file dở dang nếu bị ngắt giữa chừng
}

// ---------- Kiểm tra ảnh hỏng ----------
const IMG_EXT = /\.(jpe?g|png|webp)$/i;
async function getSharp() {
  return (await import('sharp')).default;
}

if (VERIFY) {
  const sharp = await getSharp();
  const bad = [];
  let total = 0;
  for (const entry of await fs.readdir(RAW_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const f of await fs.readdir(path.join(RAW_DIR, entry.name))) {
      if (!IMG_EXT.test(f)) continue;
      const full = path.join(RAW_DIR, entry.name, f);
      total++;
      try {
        const size = (await fs.stat(full)).size;
        if (size === 0) throw new Error('file rỗng (0 byte)');
        await sharp(full).metadata();
      } catch (err) {
        const size = (await fs.stat(full).catch(() => ({ size: 0 }))).size;
        bad.push({ file: `${entry.name}/${f}`, 'KB': (size / 1024).toFixed(1), lỗi: err.message });
      }
    }
  }
  console.log(`Đã quét ${total} ảnh, ${bad.length} file hỏng.`);
  if (bad.length) {
    console.table(bad);
    if (DELETE_BAD) {
      for (const b of bad) await fs.rm(path.join(RAW_DIR, b.file), { force: true });
      console.log('Đã xoá. Chạy lại script (không cờ) để tải bù.');
    } else {
      console.log('Thêm --delete để xoá các file này, rồi chạy lại script để tải bù.');
    }
  }
  process.exit(0);
}

// ---------- Lập kế hoạch ----------
if (!DRY && !QUERIES && !CLEAN && !VERIFY && !API_KEY) {
  console.error('Thiếu PIXABAY_API_KEY. Thêm vào .env rồi chạy: node --env-file=.env scripts/scrape-images.mjs');
  process.exit(1);
}

const MANIFEST_FILE = path.join(__dirname, '.cache', 'downloaded.json');
const manifest = await loadJson(MANIFEST_FILE, []);

if (CLEAN) {
  for (const rel of manifest) await fs.rm(path.join(RAW_DIR, rel), { force: true });
  await saveJson(MANIFEST_FILE, []);
  console.log(`Đã xoá ${manifest.length} ảnh do script tải.`);
  process.exit(0);
}

const products = JSON.parse(await fs.readFile(JSON_FILE, 'utf8'));
console.log(`Đọc ${products.length} sản phẩm từ ${path.basename(JSON_FILE)}`);

const existingByCat = new Map();
const seqByQuery = new Map(); // thứ tự sản phẩm trong cùng từ khoá -> chọn ảnh ổn định giữa các lần chạy
const tasks = [];
const stats = new Map();
let skipped = 0;

for (const p of products) {
  const cat = categoryFolder(p);
  if (!cat) {
    console.warn(`Bỏ qua ${p.id}: không suy ra được thư mục category từ thumbUrl`);
    continue;
  }
  if (ONLY_CATEGORY && cat !== ONLY_CATEGORY) continue;

  if (!existingByCat.has(cat)) existingByCat.set(cat, await readExistingBases(path.join(RAW_DIR, cat)));
  const existing = existingByCat.get(cat);

  // Từ khoá = tag đầu tiên (loại sản phẩm), đã qua bảng ghi đè / dự phòng tiếng Anh
  const key = p.tags?.[0] ?? '';
  const query = resolveQuery(key, cat);
  const st = stats.get(key) ?? { count: 0, query, sample: p.name };
  st.count++;
  stats.set(key, st);
  const seq = seqByQuery.get(query) ?? 0;
  seqByQuery.set(query, seq + 1);

  SUFFIXES.forEach((suffix, i) => {
    const base = `${p.slug}${suffix}`;
    if (existing.has(base)) {
      skipped++;
      return;
    }
    tasks.push({ cat, base, query, fallback: CATEGORY_EN[cat] ?? 'product', photoIndex: seq * SUFFIXES.length + i });
  });
}

if (QUERIES) {
  console.table(
    [...stats].map(([tag, v]) => ({ 'tags[0]': tag, 'số SP': v.count, 'từ khoá dùng': v.query, 'ví dụ': v.sample })).sort((a, b) => b['số SP'] - a['số SP'])
  );
  console.log('Tag tiếng Việt chưa có override sẽ rơi về từ khoá chung của ngành. Thêm vào scripts/image-queries.json để chính xác hơn.');
  process.exit(0);
}

const todo = tasks.slice(0, LIMIT);
console.log(`Đã có: ${skipped} ảnh | Cần tải: ${tasks.length} ảnh | Lần này: ${todo.length}`);
if (DRY) {
  console.log('--dry: không tải gì. Ví dụ 5 task đầu:');
  console.table(todo.slice(0, 5));
  process.exit(0);
}

// ---------- Thực thi ----------
const failed = [];
let done = 0;
let cursor = 0;

async function runTask(t) {
  let pool = await getPool(t.query);
  if (pool.length === 0) pool = await getPool(t.fallback);
  if (pool.length === 0) throw new Error(`Không có kết quả cho "${t.query}"`);

  const dir = path.join(RAW_DIR, t.cat);
  await fs.mkdir(dir, { recursive: true });

  // Ảnh trong pool có thể hỏng / không đọc được -> thử ảnh kế tiếp (tối đa 5 ứng viên)
  let lastErr;
  for (let k = 0; k < Math.min(5, pool.length); k++) {
    const url = pool[(t.photoIndex + k * SUFFIXES.length) % pool.length];
    try {
      await download(url, path.join(dir, `${t.base}.jpg`));
      manifest.push(`${t.cat}/${t.base}.jpg`);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`  ảnh lỗi (${err.message}), thử ảnh khác cho ${t.base}`);
    }
  }
  throw lastErr;
}

async function worker() {
  while (cursor < todo.length) {
    const t = todo[cursor++];
    try {
      await runTask(t);
      done++;
      if (done % 25 === 0 || done === todo.length) console.log(`  [${done}/${todo.length}] ${t.cat}/${t.base}.jpg`);
    } catch (err) {
      failed.push({ ...t, error: err.message });
      console.error(`  LỖI ${t.cat}/${t.base}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

await saveJson(MANIFEST_FILE, manifest);
console.log(`\nXong: ${done} thành công, ${failed.length} lỗi.`);
if (failed.length) {
  await saveJson(FAILED_FILE, failed);
  console.log(`Danh sách lỗi: ${FAILED_FILE} (chạy lại script sẽ tự tải bù phần thiếu)`);
}
