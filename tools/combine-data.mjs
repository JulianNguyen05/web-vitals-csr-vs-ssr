#!/usr/bin/env node
/**
 * combine-data.mjs — Tóm tắt + kiểm tra bộ dữ liệu packages/data thành 1 file Markdown để gửi review.
 *
 * Cách dùng (đứng ở thư mục gốc web-vitals):
 *     node tools/combine-data.mjs
 * Kết quả: _review/combined-data.md
 *
 * Tùy chọn:
 *     --out <file>       đổi file kết quả
 *     --no-net           không kiểm tra ảnh trên CDN (mặc định có kiểm tra ~30 ảnh mẫu)
 *     --img-sample <n>   số ảnh mẫu kiểm tra trên CDN (mặc định 30)
 *
 * File gồm: thống kê + kiểm lỗi cho 20/500/2000, so khớp by-category, toàn văn categories.json,
 * products-20.json, vài bản ghi mẫu của 500/2000, image-queries.json, kích thước thật của ảnh trên R2.
 * Không cần cài thêm thư viện, chỉ cần Node >= 18.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = fs.existsSync(path.join(process.cwd(), "pnpm-workspace.yaml"))
  ? process.cwd()
  : path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "packages", "data");
const JSON_DIR = path.join(DATA, "json");
const OUT = path.resolve(ROOT, argVal("--out", "_review/combined-data.md"));
const NET = !args.includes("--no-net");
const IMG_SAMPLE = Number(argVal("--img-sample", 30));
const THRESHOLDS = ["20", "500", "2000"];

const md = [];
const issues = []; // danh sách cảnh báo tổng hợp
const w = (s = "") => md.push(s);
const warn = (s) => issues.push(s);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const fmtKB = (b) => (b / 1024).toFixed(1) + " KB";
const fence = (lang, s) => "````" + lang + "\n" + s + "\n````";

function readJSON(p) {
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, "")), size: fs.statSync(p).size };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
// lấy mảng bản ghi dù file là [] hay { products: [] } hay { items: [] }...
function toArray(d) {
  if (Array.isArray(d)) return { arr: d, wrapper: "(mảng gốc)" };
  if (d && typeof d === "object") {
    for (const k of ["products", "items", "data", "categories", "list"]) if (Array.isArray(d[k])) return { arr: d[k], wrapper: k };
    const k = Object.keys(d).find((x) => Array.isArray(d[x]));
    if (k) return { arr: d[k], wrapper: k };
  }
  return { arr: [], wrapper: "(không tìm thấy mảng)" };
}
const pickKey = (obj, cands) => cands.find((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));
const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const stats = (nums) => {
  const a = nums.filter((n) => typeof n === "number" && !Number.isNaN(n)).sort((x, y) => x - y);
  if (!a.length) return "n/a";
  const sum = a.reduce((s, n) => s + n, 0);
  return `min ${a[0]} | median ${a[Math.floor(a.length / 2)]} | max ${a[a.length - 1]} | mean ${(sum / a.length).toFixed(1)}`;
};

// Lấy tất cả URL ảnh trong 1 bản ghi (đệ quy), kèm tên khóa
const IMG_URL_RE = /^(https?:)?\/\/|^\//;
const IMG_EXT_RE = /\.(webp|jpe?g|png|avif|gif|svg)(\?|#|$)/i;
function collectImages(obj, keyPath = "", out = []) {
  if (typeof obj === "string") {
    if ((IMG_EXT_RE.test(obj) && (IMG_URL_RE.test(obj) || obj.includes("/"))) || (/image|thumb|img|photo|gallery/i.test(keyPath) && IMG_URL_RE.test(obj)))
      out.push({ key: keyPath, url: obj });
  } else if (Array.isArray(obj)) obj.forEach((v, i) => collectImages(v, keyPath + "[" + i + "]", out));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) collectImages(v, keyPath ? keyPath + "." + k : k, out);
  return out;
}

// ---------- phân tích 1 tập sản phẩm ----------
const datasets = {};
function analyzeProducts(label, file) {
  w(`### products-${label}.json`);
  if (!fs.existsSync(file)) {
    w(`❌ Không tìm thấy ${rel(file)}`);
    warn(`Thiếu file products-${label}.json`);
    return;
  }
  const r = readJSON(file);
  if (!r.ok) {
    w(`❌ JSON lỗi: ${r.error}`);
    warn(`products-${label}.json không parse được`);
    return;
  }
  const { arr, wrapper } = toArray(r.data);
  const first = arr[0] || {};
  const idK = pickKey(first, ["id", "productId", "ProductID", "product_id", "slug", "sku"]);
  const catK = pickKey(first, ["categoryId", "CategoryID", "category_id", "categorySlug", "category", "categoryName"]);
  const nameK = pickKey(first, ["name", "productName", "ProductName", "title"]);
  const priceK = pickKey(first, ["price", "Price", "salePrice", "finalPrice"]);
  const shortK = pickKey(first, ["shortDescription", "ShortDescription", "short_description", "summary"]);
  const longK = pickKey(first, ["detailedDescription", "DetailedDescription", "description", "longDescription"]);
  const specK = pickKey(first, ["specifications", "Specifications", "specs", "attributes"]);
  datasets[label] = { arr, idK, catK };

  w(`- Dung lượng file: ${fmtKB(r.size)} | Wrapper: \`${wrapper}\` | **Số bản ghi: ${arr.length}**`);
  if (String(arr.length) !== label) warn(`products-${label}.json có ${arr.length} bản ghi (kỳ vọng ${label})`);
  w(`- Khóa nhận diện: id=\`${idK}\` category=\`${catK}\` name=\`${nameK}\` price=\`${priceK}\` short=\`${shortK}\` detail=\`${longK}\` specs=\`${specK}\``);

  // tần suất trường + kiểu
  const fieldFreq = {};
  for (const p of arr) for (const [k, v] of Object.entries(p || {})) {
    fieldFreq[k] ||= { n: 0, types: new Set() };
    fieldFreq[k].n++;
    fieldFreq[k].types.add(typeOf(v));
  }
  w("");
  w("| Trường | Có mặt | Kiểu |");
  w("|---|---|---|");
  for (const [k, v] of Object.entries(fieldFreq)) w(`| ${k} | ${v.n}/${arr.length} | ${[...v.types].join(", ")} |`);
  for (const [k, v] of Object.entries(fieldFreq)) if (v.types.size > 1) warn(`[${label}] Trường "${k}" lẫn nhiều kiểu: ${[...v.types].join(", ")}`);

  // trùng id, thiếu trường bắt buộc (theo SRS: id, categoryId, name, price, imageURL)
  if (idK) {
    const seen = new Map();
    arr.forEach((p, i) => seen.set(p[idK], (seen.get(p[idK]) || 0) + 1));
    const dups = [...seen].filter(([, n]) => n > 1);
    w(`- ID trùng: ${dups.length ? dups.slice(0, 10).map(([k, n]) => `${k}×${n}`).join(", ") : "không"}`);
    if (dups.length) warn(`[${label}] Có ${dups.length} id bị trùng`);
    const idPattern = [...new Set(arr.slice(0, 5).map((p) => String(p[idK])))].join(", ");
    w(`- Ví dụ id: ${idPattern}`);
  } else warn(`[${label}] Không xác định được trường id`);

  const missing = { id: 0, category: 0, name: 0, price: 0, image: 0 };
  const prices = [];
  let badPrice = 0;
  const nameCount = new Map();
  const shortLen = [], longLen = [], specCount = [], imgPerProduct = [];
  const urlUse = new Map();
  const keyNames = new Map();
  for (const p of arr) {
    if (!idK || p[idK] === undefined || p[idK] === "") missing.id++;
    if (!catK || p[catK] === undefined || p[catK] === "") missing.category++;
    if (!nameK || !p[nameK]) missing.name++;
    if (!priceK || p[priceK] === undefined) missing.price++;
    const pr = priceK ? p[priceK] : undefined;
    if (typeof pr === "number") {
      prices.push(pr);
      if (pr <= 0 || !Number.isFinite(pr)) badPrice++;
    } else if (pr !== undefined) badPrice++;
    if (nameK && p[nameK]) nameCount.set(p[nameK], (nameCount.get(p[nameK]) || 0) + 1);
    if (shortK && typeof p[shortK] === "string") shortLen.push(p[shortK].length);
    if (longK && typeof p[longK] === "string") longLen.push(p[longK].length);
    if (specK && p[specK] && typeof p[specK] === "object") specCount.push(Array.isArray(p[specK]) ? p[specK].length : Object.keys(p[specK]).length);
    const imgs = collectImages(p);
    imgPerProduct.push(imgs.length);
    if (!imgs.length) missing.image++;
    for (const { key, url } of imgs) {
      urlUse.set(url, (urlUse.get(url) || 0) + 1);
      const k = key.replace(/\[\d+\]/g, "[]");
      keyNames.set(k, (keyNames.get(k) || 0) + 1);
    }
  }
  w(`- Thiếu trường: ${Object.entries(missing).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  for (const [k, v] of Object.entries(missing)) if (v) warn(`[${label}] ${v} bản ghi thiếu ${k}`);
  w(`- Giá: ${stats(prices)} | giá không hợp lệ (≤0 / không phải số): ${badPrice}`);
  if (badPrice) warn(`[${label}] ${badPrice} giá không hợp lệ`);
  const dupNames = [...nameCount].filter(([, n]) => n > 1);
  w(`- Tên trùng: ${dupNames.length} tên (ví dụ: ${dupNames.slice(0, 5).map(([k, n]) => `"${k}"×${n}`).join(", ") || "—"})`);
  w(`- Độ dài mô tả ngắn: ${stats(shortLen)}`);
  w(`- Độ dài mô tả chi tiết: ${stats(longLen)}`);
  w(`- Số thông số kỹ thuật/sp: ${stats(specCount)}`);
  w(`- Số ảnh/sp: ${stats(imgPerProduct)}`);

  // phân bố ngành hàng
  if (catK) {
    const dist = new Map();
    for (const p of arr) dist.set(String(p[catK]), (dist.get(String(p[catK])) || 0) + 1);
    w(`- Phân bố ngành hàng (${dist.size} ngành): ${[...dist].map(([k, n]) => `${k}: ${n}`).join(" | ")}`);
    const vals = [...dist.values()];
    if (dist.size !== 10) warn(`[${label}] Có ${dist.size} ngành hàng (SRS quy định 10)`);
    if (Math.max(...vals) !== Math.min(...vals)) warn(`[${label}] Phân bố ngành hàng không đều: ${Math.min(...vals)}–${Math.max(...vals)}`);
  }

  // ảnh
  const urls = [...urlUse.keys()];
  const hosts = new Map(), exts = new Map(), sizeHints = new Map();
  for (const u of urls) {
    try {
      const h = new URL(u, "http://local").host;
      hosts.set(h, (hosts.get(h) || 0) + 1);
    } catch {}
    const e = (u.match(IMG_EXT_RE) || [])[1]?.toLowerCase() || "?";
    exts.set(e, (exts.get(e) || 0) + 1);
    const s = (u.match(/(thumb|detail|\d{3,4}x\d{3,4}|small|large|medium)/i) || [])[1]?.toLowerCase() || "(không rõ)";
    sizeHints.set(s, (sizeHints.get(s) || 0) + 1);
  }
  const maxReuse = Math.max(0, ...urlUse.values());
  w(`- Trường chứa ảnh: ${[...keyNames].map(([k, n]) => `\`${k}\`×${n}`).join(", ") || "—"}`);
  w(`- URL ảnh duy nhất: ${urls.length} | host: ${[...hosts].map(([k, n]) => `${k}(${n})`).join(", ") || "—"} | đuôi: ${[...exts].map(([k, n]) => `${k}(${n})`).join(", ")}`);
  w(`- Nhận diện kích thước qua URL: ${[...sizeHints].map(([k, n]) => `${k}(${n})`).join(", ")}`);
  w(`- 1 URL ảnh được dùng lại nhiều nhất: ${maxReuse} lần`);
  if ([...exts.keys()].some((e) => e !== "webp")) warn(`[${label}] Có ảnh không phải WebP: ${[...exts.keys()].join(", ")}`);
  if (hosts.size > 1) warn(`[${label}] Ảnh đến từ ${hosts.size} host khác nhau: ${[...hosts.keys()].join(", ")}`);
  if ([...hosts.keys()].some((h) => /pixabay|unsplash|pexels/i.test(h))) warn(`[${label}] Còn URL ảnh trỏ thẳng về thư viện gốc (không qua R2)`);

  w("");
  w(`<details><summary>3 bản ghi đầu của products-${label}.json</summary>\n`);
  w(fence("json", JSON.stringify(arr.slice(0, 3), null, 2)));
  w("\n</details>\n");
  datasets[label].urls = urlUse;
}

// ---------- so sánh giữa các ngưỡng ----------
function crossCompare() {
  w("## 3. So sánh giữa các ngưỡng 20 / 500 / 2000");
  const a = datasets["20"], b = datasets["500"], c = datasets["2000"];
  if (!a || !b || !c || !a.idK) {
    w("(không đủ dữ liệu để so sánh)");
    return;
  }
  const ids = (d) => new Set(d.arr.map((p) => p[d.idK]));
  const sub = (x, y) => [...x].filter((v) => y.has(v)).length;
  const A = ids(a), B = ids(b), C = ids(c);
  w(`- Số id của tập 20 có trong 500: ${sub(A, B)}/${A.size} | có trong 2000: ${sub(A, C)}/${A.size}`);
  w(`- Số id của tập 500 có trong 2000: ${sub(B, C)}/${B.size}`);
  // sản phẩm đầu trang (ảnh hưởng LCP) có giống nhau giữa 3 ngưỡng?
  const N = 8;
  const head = (d) => d.arr.slice(0, N).map((p) => p[d.idK]);
  const same = head(a).every((v, i) => v === head(b)[i] && v === head(c)[i]);
  w(`- ${N} sản phẩm đầu tiên giống hệt nhau ở cả 3 ngưỡng (quan trọng cho LCP): **${same ? "CÓ" : "KHÔNG"}**`);
  w(`  - 20:   ${head(a).join(", ")}`);
  w(`  - 500:  ${head(b).join(", ")}`);
  w(`  - 2000: ${head(c).join(", ")}`);
  if (!same) warn(`Các sản phẩm đầu trang khác nhau giữa 3 ngưỡng → ảnh LCP khác nhau, làm nhiễu so sánh theo ngưỡng`);
  const firstImg = (d) => collectImages(d.arr[0] || {})[0]?.url;
  w(`- Ảnh của sản phẩm đầu tiên: 20=${firstImg(a)} | 500=${firstImg(b)} | 2000=${firstImg(c)}`);
  const ua = a.urls ? a.urls.size : 0, uc = c.urls ? c.urls.size : 0;
  w(`- Số URL ảnh duy nhất: 20=${ua} | 500=${b.urls?.size ?? 0} | 2000=${uc}`);
  w("");
}

// ---------- by-category ----------
function checkByCategory() {
  w("## 4. Đối chiếu json/by-category với file tổng");
  const base = path.join(JSON_DIR, "by-category");
  if (!fs.existsSync(base)) {
    w("(không có thư mục by-category)");
    return;
  }
  w("| Ngưỡng | File | Số bản ghi | Có trong file tổng | Sai ngành |");
  w("|---|---|---|---|---|");
  for (const t of THRESHOLDS) {
    const dir = path.join(base, t);
    if (!fs.existsSync(dir)) continue;
    const ds = datasets[t];
    const masterIds = ds && ds.idK ? new Set(ds.arr.map((p) => p[ds.idK])) : null;
    let sum = 0;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const r = readJSON(path.join(dir, f));
      if (!r.ok) {
        w(`| ${t} | ${f} | JSON lỗi | | |`);
        warn(`by-category/${t}/${f} lỗi JSON`);
        continue;
      }
      const { arr } = toArray(r.data);
      sum += arr.length;
      const idK = ds?.idK || pickKey(arr[0] || {}, ["id", "productId"]);
      const inMaster = masterIds ? arr.filter((p) => masterIds.has(p[idK])).length : "?";
      const catK = ds?.catK;
      const cats = catK ? new Set(arr.map((p) => String(p[catK]))) : new Set();
      const wrongCat = cats.size > 1 ? `${cats.size} ngành: ${[...cats].join(",")}` : "";
      w(`| ${t} | ${f} | ${arr.length} | ${inMaster} | ${wrongCat} |`);
      if (masterIds && inMaster !== arr.length) warn(`by-category/${t}/${f}: ${arr.length - inMaster} bản ghi không có trong products-${t}.json`);
      if (wrongCat) warn(`by-category/${t}/${f} chứa sản phẩm của nhiều ngành`);
    }
    w(`| ${t} | **Tổng** | **${sum}** | | |`);
    if (ds && sum !== ds.arr.length) warn(`by-category/${t}: tổng ${sum} ≠ products-${t}.json (${ds.arr.length})`);
  }
  w("");
}

// ---------- assets ----------
function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(f, out);
    else out.push(f);
  }
  return out;
}
function checkAssets() {
  w("## 5. Thư mục packages/data/assets (ảnh cục bộ)");
  const dir = path.join(DATA, "assets");
  if (!fs.existsSync(dir)) {
    w("(không có)");
    return;
  }
  const files = walkFiles(dir);
  const byExt = new Map();
  const bySub = new Map();
  let total = 0;
  for (const f of files) {
    const s = fs.statSync(f).size;
    total += s;
    const e = path.extname(f).toLowerCase() || "(none)";
    byExt.set(e, (byExt.get(e) || 0) + 1);
    const sub = rel(path.dirname(f)).replace("packages/data/assets", "assets") || "assets";
    const cur = bySub.get(sub) || { n: 0, size: 0 };
    cur.n++;
    cur.size += s;
    bySub.set(sub, cur);
  }
  w(`- Tổng: ${files.length} file, ${(total / 1048576).toFixed(1)} MB | theo đuôi: ${[...byExt].map(([k, n]) => `${k}(${n})`).join(", ")}`);
  w("");
  w("| Thư mục | Số file | Dung lượng | Trung bình/file |");
  w("|---|---|---|---|");
  for (const [k, v] of [...bySub].sort()) w(`| ${k} | ${v.n} | ${(v.size / 1048576).toFixed(2)} MB | ${fmtKB(v.size / v.n)} |`);
  w("");
  w(`Ví dụ tên file: ${files.slice(0, 8).map((f) => "`" + rel(f) + "`").join(", ")}`);
  w("");
}

// ---------- kiểm tra ảnh trên CDN ----------
function imageDims(buf) {
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { fmt: "webp", w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      return { fmt: "webp-lossless", w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
    }
    if (chunk === "VP8X") return { fmt: "webp-ext", w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  }
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return { fmt: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) return { fmt: "jpeg", w: "?", h: "?" };
  return { fmt: "không rõ", w: "?", h: "?" };
}
async function checkCdn() {
  w("## 6. Kiểm tra ảnh thật trên CDN (mẫu)");
  if (!NET) {
    w("(bỏ qua vì chạy với --no-net)");
    return;
  }
  if (typeof fetch !== "function") {
    w("(Node quá cũ, không có fetch — cần Node ≥ 18)");
    return;
  }
  // gom URL: ưu tiên ảnh của 8 sp đầu tập 20 (ảnh LCP), rồi rải đều tập 2000
  const pool = [];
  const add = (u) => { if (u && /^https?:/.test(u) && !pool.includes(u)) pool.push(u); };
  for (const p of datasets["20"]?.arr.slice(0, 8) || []) collectImages(p).forEach((x) => add(x.url));
  const big = datasets["2000"]?.arr || datasets["500"]?.arr || [];
  const step = Math.max(1, Math.floor(big.length / IMG_SAMPLE));
  for (let i = 0; i < big.length && pool.length < IMG_SAMPLE; i += step) collectImages(big[i]).slice(0, 2).forEach((x) => add(x.url));
  const sample = pool.slice(0, IMG_SAMPLE);
  if (!sample.length) {
    w("(không tìm thấy URL ảnh http(s) nào)");
    return;
  }
  w("| URL | HTTP | Content-Type | Dung lượng | Kích thước thật | Cache-Control |");
  w("|---|---|---|---|---|---|");
  const sizes = [];
  for (const url of sample) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 10000);
      const res = await fetch(url, { headers: { Range: "bytes=0-127" }, signal: ctl.signal });
      clearTimeout(t);
      const buf = Buffer.from(await res.arrayBuffer()).subarray(0, 128);
      const cr = res.headers.get("content-range");
      const len = cr ? Number(cr.split("/")[1]) : Number(res.headers.get("content-length"));
      const d = imageDims(buf);
      if (len) sizes.push(len);
      const hint = (url.match(/(thumb|detail)/i) || [])[1]?.toLowerCase();
      const expect = hint === "thumb" ? 400 : hint === "detail" ? 800 : null;
      const flag = expect && (d.w !== expect || d.h !== expect) ? " ⚠" : "";
      if (flag) warn(`Ảnh ${hint} không đúng ${expect}×${expect}: ${url} (${d.w}×${d.h})`);
      if (res.status >= 400) warn(`Ảnh lỗi HTTP ${res.status}: ${url}`);
      w(`| ${url} | ${res.status} | ${res.headers.get("content-type")} | ${len ? fmtKB(len) : "?"} | ${d.fmt} ${d.w}×${d.h}${flag} | ${res.headers.get("cache-control") || "—"} |`);
    } catch (e) {
      w(`| ${url} | LỖI | ${String(e.name === "AbortError" ? "timeout 10s" : e.message).slice(0, 60)} | | | |`);
      warn(`Không tải được ảnh: ${url}`);
    }
  }
  w("");
  if (sizes.length) w(`- Dung lượng ảnh mẫu: ${stats(sizes.map((s) => Math.round(s / 1024)))} (KB)`);
  w("");
}

// ---------- main ----------
w("# COMBINED DATA — packages/data (T&Q Mart)");
w("");
w(`- Thời điểm tạo: ${new Date().toISOString()} | Node ${process.version}`);
w("");

if (!fs.existsSync(DATA)) {
  console.error("Không tìm thấy packages/data — hãy chạy lệnh ở thư mục gốc web-vitals.");
  process.exit(1);
}

// danh sách file trong packages/data (trừ assets)
w("## 0. File trong packages/data (không gồm assets)");
const listing = [];
(function ls(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["assets", "node_modules"].includes(e.name)) continue;
      ls(f);
    } else listing.push(`${rel(f)}  (${fmtKB(fs.statSync(f).size)})`);
  }
})(DATA);
w(fence("text", listing.join("\n")));
w("");

// categories
w("## 1. categories.json (toàn văn)");
const catR = readJSON(path.join(JSON_DIR, "categories.json"));
if (catR.ok) {
  const { arr } = toArray(catR.data);
  w(`- Số ngành hàng: ${arr.length}`);
  if (arr.length !== 10) warn(`categories.json có ${arr.length} ngành (SRS: 10)`);
  w(fence("json", JSON.stringify(catR.data, null, 2)));
} else {
  w("❌ " + (catR.error || "không có file"));
  warn("categories.json lỗi hoặc thiếu");
}
w("");

w("## 2. Thống kê từng ngưỡng");
for (const t of THRESHOLDS) analyzeProducts(t, path.join(JSON_DIR, `products-${t}.json`));
crossCompare();
checkByCategory();
checkAssets();
await checkCdn();

w("## 7. products-20.json (toàn văn)");
const p20 = readJSON(path.join(JSON_DIR, "products-20.json"));
w(p20.ok ? fence("json", JSON.stringify(p20.data, null, 2)) : "(không có)");
w("");

w("## 8. scripts/image-queries.json");
const iq = path.join(DATA, "scripts", "image-queries.json");
if (fs.existsSync(iq)) {
  const s = fs.readFileSync(iq, "utf8");
  w(fence("json", s.length > 60000 ? s.slice(0, 60000) + "\n... (cắt bớt, file dài " + fmtKB(s.length) + ")" : s));
} else w("(không có)");
w("");

// đưa phần cảnh báo lên đầu
const head = [md[0], md[1], md[2], md[3], "", "## ⚠ Cảnh báo tự động (" + issues.length + ")", "", ...(issues.length ? issues.map((s) => "- " + s) : ["- Không phát hiện vấn đề nào."]), ""];
const body = md.slice(4);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, head.concat(body).join("\n"), "utf8");
console.log(`✔ Đã tạo ${rel(OUT)} — ${fmtKB(fs.statSync(OUT).size)} — ${issues.length} cảnh báo`);
