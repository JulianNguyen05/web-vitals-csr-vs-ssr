// packages/data/scripts/scrape-images.mjs  (v2)
// Đọc products-2000.json -> tải ảnh từ Pixabay -> assets/raw/<category-slug>/<slug>[-a|-b|-c].jpg
//
// Khác bản cũ:
//  1. KHÔNG còn rơi về từ khoá chung của ngành ("fashion clothing", "cosmetics skincare"...).
//     Đây là nguyên nhân chính gây ra ảnh người mẫu/18+. Sản phẩm không map được từ khoá sẽ bị bỏ qua
//     và ghi vào .cache/unmapped-tags.json để bạn bổ sung image-queries.json.
//  2. Từ khoá rủi ro được viết lại (SAFE_REWRITE) theo hướng ảnh sản phẩm, không có người.
//  3. Lọc ảnh theo trường `tags` của Pixabay: loại tag nhạy cảm (nude, bikini, lingerie...) và tag
//     "người" (woman, girl, model...) trừ khi dùng --allow-people.
//  4. Sắp xếp ảnh theo độ liên quan (số từ khoá trùng với tags) và chọn ảnh ít được dùng nhất
//     -> mỗi sản phẩm 4 ảnh KHÁC NHAU, toàn bộ dataset ít trùng ảnh.
//  5. Ghi metadata (query, id, tags) vào .cache/images-meta.json để filter-images.mjs kiểm tra tiếp.
//
// Chạy (từ packages/data):
//   node --env-file=.env scripts/scrape-images.mjs --queries        # xem map từ khoá + tag chưa map
//   node --env-file=.env scripts/scrape-images.mjs --dry
//   node --env-file=.env scripts/scrape-images.mjs --limit 20
//   node --env-file=.env scripts/scrape-images.mjs                  # tải phần còn thiếu (chạy lại được)
//   Cờ khác: --category dien-tu | --allow-people | --allow-generic | --verify [--delete]

import fs from 'node:fs/promises';
import path from 'node:path';
import { CACHE, CACHE_DIR, JSON_FILE, RAW_DIR, SCRIPTS_DIR, loadJson, makeArgs, norm, saveJson } from './image-lib.mjs';

// ---------- Cấu hình ----------
const SUFFIXES = ['', '-a', '-b', '-c']; // '' = ảnh chính, còn lại là gallery
const CONCURRENCY = 5;
const POOL_PAGES = 2; // 2 trang x 200 ảnh / biến thể từ khoá
const VARIANTS = ['', ' isolated', ' modern', ' close up']; // nhiều biến thể -> pool lớn hơn, đa dạng hơn
const MIN_RELEVANT = 12; // cần ít nhất ngần này ảnh có tag khớp từ khoá, nếu không dùng cả pool
const MIN_SIDE = 700;
const MAX_RETRY = 3;
const API_KEY = process.env.PIXABAY_API_KEY;

const { flag, opt } = makeArgs();
const DRY = flag('dry');
const LIMIT = opt('limit') ? Number(opt('limit')) : Infinity;
const ONLY_CATEGORY = opt('category');
const QUERIES = flag('queries');
const VERIFY = flag('verify');
const DELETE_BAD = flag('delete');
const ALLOW_PEOPLE = flag('allow-people');
const ALLOW_GENERIC = flag('allow-generic');

// Tag nhạy cảm: loại ngay, không có ngoại lệ
const HARD_BAD =
  /\b(nude|naked|nudity|nudes|sexy|sex|sexual|erotic|erotica|topless|lingerie|underwear|bikini|swimsuit|swimwear|bra|bras|breast|breasts|cleavage|boudoir|sensual|seductive|fetish|adult|porn|nsfw|thong|panties|stripper|escort|busty|bodypaint|bodypainting|glamour|intimate|lust|temptation)\b/i;
// Tag "người": loại mặc định để ảnh là ảnh sản phẩm (bật lại bằng --allow-people)
const PEOPLE = /\b(girl|girls|woman|women|man|men|boy|lady|ladies|model|models|people|person|portrait|female|male|couple|face)\b/i;

// Từ khoá dự phòng AN TOÀN (chỉ dùng khi có --allow-generic), toàn đồ vật, không người
const CATEGORY_SAFE = {
  'dien-tu': 'electronics gadget',
  'gia-dung': 'home appliance',
  'me-va-be-do-choi-tre-em': 'baby toys',
  'my-pham-cham-soc-ca-nhan': 'cosmetic bottles',
  'noi-that-trang-tri': 'furniture interior',
  'sach-van-phong-pham': 'stationery office supplies',
  'the-thao-da-ngoai': 'sports equipment',
  'thoi-trang': 'clothes on hanger',
  'thuc-pham-do-uong': 'food drink',
  'vat-nuoi-thu-cung': 'pet supplies',
};

// Từ khoá hay kéo về ảnh người/nhạy cảm -> viết lại theo hướng "đồ vật". Khoá = từ khoá gốc (chữ thường).
const SAFE_REWRITE = {
  'breast pump': 'baby bottle sterilizer',
  'makeup remover cleansing': 'cosmetic bottle',
  'face mask skincare': 'skincare cosmetic jar',
  'face moisturizer cream': 'cream jar cosmetic',
  'face wash cleanser': 'cleanser bottle cosmetic',
  'face serum': 'serum dropper bottle',
  'dog bath': 'dog shampoo bottle',
  deodorant: 'deodorant spray bottle',
  'wall art painting': 'framed wall art interior',
  'fashion accessories': 'watch sunglasses accessories',
  dress: 'dress on hanger',
  shorts: 'shorts clothes hanger',
  jeans: 'jeans folded',
  't-shirt': 't-shirt folded clothes',
  shirt: 'shirt on hanger',
  jacket: 'jacket on hanger',
  sweater: 'sweater folded',
  'sportswear shirt': 'sportswear clothes',
  'yoga mat': 'yoga mat rolled',
  mirror: 'decorative mirror interior',
  'bed bedroom': 'bed bedroom interior',
  'baby diaper': 'diaper pack baby',
  'baby wet wipes': 'wet wipes pack',
  lipstick: 'lipstick tube',
  'perfume bottle': 'perfume bottle glass',
  handbag: 'handbag leather',
  'cat litter': 'cat litter box',
};

// ---------- Map sản phẩm -> từ khoá ----------
const OVERRIDES = await loadJson(path.join(SCRIPTS_DIR, 'image-queries.json'), {});
const rewrite = (q) => SAFE_REWRITE[q.toLowerCase()] ?? q;
const OVR = new Map(Object.entries(OVERRIDES).map(([k, v]) => [norm(k), rewrite(v)]));
const OVR_BY_LEN = [...OVR].sort((a, b) => b[0].length - a[0].length); // khớp cụm dài trước
const isAscii = (s) => /^[\x20-\x7e]+$/.test(s);

function resolveQuery(p) {
  const tags = (p.tags ?? []).map((t) => String(t).trim()).filter(Boolean);
  const t0 = tags[0];
  if (t0 && OVR.has(norm(t0))) return { query: OVR.get(norm(t0)), via: 'tag' };
  const padded = ` ${norm(p.name)} `;
  for (const [k, q] of OVR_BY_LEN) {
    if (k.length >= 3 && padded.includes(` ${k} `)) return { query: q, via: 'tên' };
  }
  if (t0 && isAscii(t0) && t0.length >= 3) return { query: rewrite(t0.toLowerCase()), via: 'tag-en' };
  for (const t of tags.slice(1)) if (OVR.has(norm(t))) return { query: OVR.get(norm(t)), via: 'tag phụ' };
  return null;
}

// ---------- Tiện ích ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IMG_EXT = /\.(jpe?g|png|webp)$/i;
const getSharp = async () => (await import('sharp')).default;

function categoryFolder(product) {
  const m = product.thumbUrl?.match(/\/thumb\/([^/]+)\//);
  return m ? m[1] : null;
}

async function readExistingBases(dir) {
  try {
    return new Set((await fs.readdir(dir)).filter((f) => IMG_EXT.test(f)).map((f) => f.replace(/\.[^.]+$/, '')));
  } catch {
    return new Set();
  }
}

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
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

// ---------- Kiểm tra ảnh hỏng ----------
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
        if ((await fs.stat(full)).size === 0) throw new Error('file rỗng (0 byte)');
        await sharp(full).metadata();
      } catch (err) {
        bad.push({ file: `${entry.name}/${f}`, lỗi: err.message });
      }
    }
  }
  console.log(`Đã quét ${total} ảnh, ${bad.length} file hỏng.`);
  if (bad.length) {
    console.table(bad);
    if (DELETE_BAD) {
      for (const b of bad) await fs.rm(path.join(RAW_DIR, b.file), { force: true });
      console.log('Đã xoá. Chạy lại script để tải bù.');
    } else console.log('Thêm --delete để xoá, rồi chạy lại để tải bù.');
  }
  process.exit(0);
}

if (!DRY && !QUERIES && !API_KEY) {
  console.error('Thiếu PIXABAY_API_KEY. Thêm vào .env rồi chạy: node --env-file=.env scripts/scrape-images.mjs');
  process.exit(1);
}

// ---------- Trạng thái ----------
const poolCache = await loadJson(CACHE.pools, {});
const meta = await loadJson(CACHE.meta, {});
const rejected = new Set(await loadJson(CACHE.rejected, []));
const useCount = new Map(); // id ảnh -> số lần đã dùng trong dataset
const takenBySlug = new Map(); // slug sản phẩm -> Set id ảnh đã gán cho sản phẩm đó
for (const m of Object.values(meta)) {
  useCount.set(m.id, (useCount.get(m.id) ?? 0) + 1);
  if (!takenBySlug.has(m.slug)) takenBySlug.set(m.slug, new Set());
  takenBySlug.get(m.slug).add(m.id);
}

// ---------- Pixabay ----------
async function searchPool(query) {
  if (poolCache[query]) return poolCache[query];
  const seen = new Map();
  for (const v of VARIANTS) {
    const q = (query + v).slice(0, 100);
    for (let page = 1; page <= POOL_PAGES; page++) {
      const api =
        `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(q)}` +
        `&image_type=photo&per_page=200&page=${page}&safe_search=true&min_width=${MIN_SIDE}&min_height=${MIN_SIDE}`;
      const data = await (await fetchWithRetry(api)).json();
      for (const h of data.hits ?? []) {
        if (!seen.has(h.id)) seen.set(h.id, { id: h.id, url: h.largeImageURL, tags: h.tags ?? '' });
      }
      if ((data.hits?.length ?? 0) < 200) break;
    }
  }
  poolCache[query] = [...seen.values()];
  await saveJson(CACHE.pools, poolCache);
  return poolCache[query];
}

const poolPromises = new Map();
const getRawPool = (query) => {
  if (!poolPromises.has(query)) poolPromises.set(query, searchPool(query));
  return poolPromises.get(query);
};

// Lọc + xếp hạng theo độ liên quan (số từ khoá nằm trong tags của ảnh)
const viewCache = new Map();
function usablePool(raw, query) {
  if (viewCache.has(query)) return viewCache.get(query);
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const scored = [];
  raw.forEach((h, i) => {
    if (rejected.has(h.id) || HARD_BAD.test(h.tags)) return;
    if (!ALLOW_PEOPLE && PEOPLE.test(h.tags)) return;
    const t = h.tags.toLowerCase();
    const score = words.filter((w) => t.includes(w.replace(/s$/, ''))).length;
    scored.push({ ...h, score, i });
  });
  const relevant = scored.filter((h) => h.score > 0);
  const base = relevant.length >= MIN_RELEVANT ? relevant : scored;
  const view = base.sort((a, b) => b.score - a.score || a.i - b.i);
  if (view.length < 20) console.warn(`  ! "${query}": chỉ còn ${view.length} ảnh sau khi lọc (ảnh sẽ bị dùng lại)`);
  viewCache.set(query, view);
  return view;
}

// Chọn ảnh ít được dùng nhất (hoà thì lấy ảnh liên quan nhất), không trùng ảnh đã gán cho cùng sản phẩm
function pickCandidate(pool, taken) {
  let best = null;
  for (const c of pool) {
    if (taken.has(c.id)) continue;
    const u = useCount.get(c.id) ?? 0;
    if (!best || u < best.u) {
      best = { c, u };
      if (u === 0) break;
    }
  }
  return best?.c ?? null;
}

async function download(url, destPath) {
  const res = await fetchWithRetry(url);
  if (!(res.headers.get('content-type') || '').startsWith('image/')) throw new Error('Không phải ảnh');
  const buf = Buffer.from(await res.arrayBuffer());
  const info = await (await getSharp())(buf).metadata();
  if (Math.min(info.width ?? 0, info.height ?? 0) < MIN_SIDE) throw new Error(`ảnh nhỏ ${info.width}x${info.height}`);
  await fs.writeFile(`${destPath}.part`, buf);
  await fs.rename(`${destPath}.part`, destPath);
}

// ---------- Lập kế hoạch ----------
const products = JSON.parse(await fs.readFile(JSON_FILE, 'utf8'));
console.log(`Đọc ${products.length} sản phẩm từ ${path.basename(JSON_FILE)}`);

const existingByCat = new Map();
const tasks = [];
const stats = new Map();
const unmapped = new Map();
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

  let r = resolveQuery(p);
  if (!r) {
    const key = p.tags?.[0] ?? '(không có tag)';
    const u = unmapped.get(key) ?? { count: 0, sample: p.name, category: cat };
    u.count++;
    unmapped.set(key, u);
    if (!ALLOW_GENERIC) continue; // không đoán mò nữa
    r = { query: CATEGORY_SAFE[cat] ?? 'product', via: 'generic' };
  }
  const st = stats.get(r.query) ?? { count: 0, via: r.via, sample: p.name, cat };
  st.count++;
  stats.set(r.query, st);

  for (const suffix of SUFFIXES) {
    const base = `${p.slug}${suffix}`;
    if (existing.has(base)) {
      skipped++;
      continue;
    }
    tasks.push({ cat, base, key: `${cat}/${base}.jpg`, query: r.query, slug: p.slug });
  }
}

await saveJson(CACHE.unmapped, Object.fromEntries(unmapped));

if (QUERIES) {
  console.table(
    [...stats].map(([query, v]) => ({ 'từ khoá': query, 'số SP': v.count, 'nguồn': v.via, 'ví dụ': v.sample })).sort((a, b) => b['số SP'] - a['số SP'])
  );
  if (unmapped.size) {
    console.log(`\n${[...unmapped.values()].reduce((s, v) => s + v.count, 0)} sản phẩm CHƯA map được từ khoá (sẽ bị bỏ qua). Thêm vào image-queries.json:`);
    console.table([...unmapped].map(([tag, v]) => ({ 'tags[0]': tag, 'số SP': v.count, 'ngành': v.category, 'ví dụ': v.sample })));
    console.log(`Danh sách đầy đủ: ${path.relative(process.cwd(), CACHE.unmapped)}`);
  }
  process.exit(0);
}

const todo = tasks.slice(0, LIMIT);
console.log(`Đã có: ${skipped} | Cần tải: ${tasks.length} | Lần này: ${todo.length} | Chưa map từ khoá: ${[...unmapped.values()].reduce((s, v) => s + v.count, 0)} SP`);
if (DRY) {
  console.table(todo.slice(0, 8).map(({ key, query }) => ({ key, query })));
  process.exit(0);
}

// ---------- Thực thi ----------
const failed = [];
let done = 0;
let cursor = 0;

const saveMeta = () => saveJson(CACHE.meta, meta);
process.on('SIGINT', async () => {
  await saveMeta();
  console.log('\nĐã lưu tiến độ, có thể chạy lại để tải tiếp.');
  process.exit(130);
});

async function runTask(t) {
  const pool = usablePool(await getRawPool(t.query), t.query);
  if (pool.length === 0) throw new Error(`Không còn ảnh hợp lệ cho "${t.query}"`);

  const taken = takenBySlug.get(t.slug) ?? new Set();
  takenBySlug.set(t.slug, taken);
  await fs.mkdir(path.join(RAW_DIR, t.cat), { recursive: true });

  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const c = pickCandidate(pool, taken); // đồng bộ, không await -> an toàn khi chạy song song
    if (!c) break;
    taken.add(c.id);
    useCount.set(c.id, (useCount.get(c.id) ?? 0) + 1);
    try {
      await download(c.url, path.join(RAW_DIR, t.cat, `${t.base}.jpg`));
      meta[t.key] = { cat: t.cat, slug: t.slug, query: t.query, id: c.id, url: c.url, tags: c.tags };
      return;
    } catch (err) {
      lastErr = err;
      useCount.set(c.id, 1e9); // ảnh lỗi: đẩy xuống cuối, đừng chọn lại
      console.warn(`  ảnh lỗi (${err.message}), thử ảnh khác cho ${t.base}`);
    }
  }
  throw lastErr ?? new Error('Không còn ảnh ứng viên');
}

async function worker() {
  while (cursor < todo.length) {
    const t = todo[cursor++];
    try {
      await runTask(t);
      done++;
      if (done % 25 === 0) {
        await saveMeta();
        console.log(`  [${done}/${todo.length}] ${t.key}`);
      }
    } catch (err) {
      failed.push({ ...t, error: err.message });
      console.error(`  LỖI ${t.key}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await saveMeta();
await fs.mkdir(CACHE_DIR, { recursive: true });

console.log(`\nXong: ${done} thành công, ${failed.length} lỗi.`);
if (failed.length) {
  await saveJson(CACHE.failed, failed);
  console.log(`Danh sách lỗi: ${CACHE.failed}`);
}
console.log('Bước tiếp theo: node scripts/filter-images.mjs  (lọc NSFW + độ khớp), rồi chạy lại scrape để bù ảnh bị loại.');
