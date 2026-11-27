#!/usr/bin/env node
/**
 * Đo 6 chỉ số Web Vitals cho 2 phiên bản CSR và SSR — 1 script dùng chung, chỉ khác URL (SAD mục 5).
 *
 *   node run.mjs --csr https://csr.example.com --ssr https://ssr.example.com \
 *                --dataset 2000 --runs 5 --profiles 3g,4g,wifi --pages list,detail,cart --device mobile
 *
 * Mỗi lượt đo gồm 2 phần, đều chạy trên trình duyệt MỚI (hồ sơ trống, không cache):
 *   A. Lighthouse (navigation)  → LCP, FCP, TBT, CLS, Speed Index (+ SRT: server-response-time, tham khảo)
 *   B. Playwright + web-vitals   → INP (bấm "Thêm vào giỏ"/"Tăng số lượng" 3 lần) và TTFB theo định nghĩa
 *      Web Vitals (gồm DNS, kết nối, TLS, xử lý của server), kèm LCP/CLS/FCP thực đo (cột wv_*)
 *      (Lighthouse navigation không đo được INP vì INP cần thao tác của người dùng.)
 *      Lưu ý: TTFB KHÔNG chịu độ trễ mạng mô phỏng (responseStart lấy từ tầng mạng thật) → không đổi
 *      theo 3G/4G/WiFi; wv_LCP chỉ tham khảo (LCP dừng khi có thao tác). Xem README "Đọc TTFB".
 * Thứ tự CSR/SSR được đảo luân phiên mỗi lượt để tránh thiên lệch theo thời gian.
 *
 * Kết quả: results/<thời-điểm>/results.csv (từng lượt) + summary.csv (trung vị) + meta.json
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { DEVICES, NETWORK_PROFILES, PAGES } from "./profiles.mjs";

const { values: a } = parseArgs({
  // bỏ "--" nếu chạy kiểu `pnpm measure -- --csr ...`
  args: process.argv.slice(2).filter((x) => x !== "--"),
  options: {
    csr: { type: "string" },
    ssr: { type: "string" },
    dataset: { type: "string", default: "?" },
    // 10 lượt/ô: với 5 lượt, Mann-Whitney có p nhỏ nhất 0,008 → mất ý nghĩa sau hiệu chỉnh Holm cho 108 ô.
    runs: { type: "string", default: "10" },
    profiles: { type: "string", default: "3g,4g,wifi" },
    pages: { type: "string", default: "list,detail,cart" },
    device: { type: "string", default: "mobile" },
    product: { type: "string", default: "prod-101" },
    out: { type: "string", default: "results" },
    warmup: { type: "string", default: "1" },
    "skip-lighthouse": { type: "boolean", default: false },
    "skip-inp": { type: "boolean", default: false },
    "save-lhr": { type: "boolean", default: false },
    headed: { type: "boolean", default: false },
  },
});

if (!a.csr || !a.ssr) {
  console.error("Thiếu --csr <url> hoặc --ssr <url>. Xem README.md trong scripts/measurement.");
  process.exit(1);
}
const TARGETS = { CSR: a.csr.replace(/\/$/, ""), SSR: a.ssr.replace(/\/$/, "") };
const RUNS = Number(a.runs);
// Tách theo dấu phẩy HOẶC dấu cách: PowerShell biến "list,detail" (không nháy) thành "list detail".
const splitList = (v) => v.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
const profiles = splitList(a.profiles);
const pages = splitList(a.pages);
const device = DEVICES[a.device];
for (const p of profiles) if (!NETWORK_PROFILES[p]) throw new Error(`Không có profile mạng "${p}"`);
for (const p of pages) if (!PAGES[p]) throw new Error(`Không có trang "${p}"`);
if (!device) throw new Error(`Không có thiết bị "${a.device}" (mobile | desktop)`);

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = path.resolve(a.out, `${stamp}_ds${a.dataset}_${a.device}`);
fs.mkdirSync(OUT, { recursive: true });

const urlOf = (arch, page) => TARGETS[arch] + PAGES[page].path.replace("{product}", a.product);
const CART_SEED = JSON.stringify({
  state: { items: [{ productId: a.product, quantity: 1, addedAt: 1 }] },
  version: 0,
});

// ---------------------------------------------------------------- helpers
async function freshBrowser() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tqmart-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: !a.headed,
    args: [`--remote-debugging-port=${port}`],
    viewport: null,
  });
  return {
    ctx,
    port,
    async close() {
      await ctx.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

async function throttle(page, net) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: net.requestLatencyMs,
    downloadThroughput: (net.downloadThroughputKbps * 1024) / 8,
    uploadThroughput: (net.uploadThroughputKbps * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: device.cpuSlowdownMultiplier });
  return cdp;
}

/** Ghi giỏ hàng mẫu vào localStorage của origin rồi xoá cache HTTP (giữ storage). */
async function seedCart(b, origin) {
  const page = await b.ctx.newPage();
  await page.route("**/*", (route) =>
    route.request().resourceType() === "document"
      ? route.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" })
      : route.abort(),
  );
  await page.goto(origin + "/__seed__");
  await page.evaluate((v) => localStorage.setItem("tqmart-cart", v), CART_SEED);
  const cdp = await b.ctx.newCDPSession(page);
  await cdp.send("Network.clearBrowserCache");
  await page.close();
}

// ---------------------------------------------------------------- A. Lighthouse
async function runLighthouse(arch, pageKey, profileKey) {
  const b = await freshBrowser();
  try {
    const url = urlOf(arch, pageKey);
    if (PAGES[pageKey].seedCart) await seedCart(b, TARGETS[arch]);
    const net = NETWORK_PROFILES[profileKey];
    const result = await lighthouse(
      url,
      { port: b.port, output: "json", logLevel: "error" },
      {
        extends: "lighthouse:default",
        settings: {
          onlyCategories: ["performance"],
          formFactor: a.device,
          screenEmulation: device.screen,
          emulatedUserAgent: device.userAgent,
          throttlingMethod: "devtools",
          throttling: { ...net, cpuSlowdownMultiplier: device.cpuSlowdownMultiplier },
          disableStorageReset: Boolean(PAGES[pageKey].seedCart), // giữ giỏ hàng mẫu
        },
      },
    );
    const lhr = result.lhr;
    const v = (id) => lhr.audits[id]?.numericValue;
    if (a["save-lhr"]) {
      fs.writeFileSync(
        path.join(OUT, `lhr_${arch}_${pageKey}_${profileKey}_${Date.now()}.json`),
        JSON.stringify(lhr),
      );
    }
    return {
      lh_score: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      LCP: v("largest-contentful-paint"),
      FCP: v("first-contentful-paint"),
      TBT: v("total-blocking-time"),
      CLS: v("cumulative-layout-shift"),
      // "server-response-time" của Lighthouse KHÔNG gồm thời gian thiết lập kết nối → không phải TTFB
      // theo định nghĩa Web Vitals. Giữ lại ở cột SRT để tham khảo; TTFB lấy từ web-vitals (phần B).
      SRT: v("server-response-time"),
      SI: v("speed-index"),
      // Sức mạnh CPU máy đo do Lighthouse tự chấm — dùng để chứng minh máy đo ổn định suốt đợt đo.
      bench: lhr.environment?.benchmarkIndex,
      lh_error: lhr.runtimeError?.code ?? "",
    };
  } finally {
    await b.close();
  }
}

// ---------------------------------------------------------------- B. INP (Playwright + web-vitals)
async function interact(page, kind) {
  if (kind === "list") {
    const buttons = page.locator('[data-testid="add-to-cart"]');
    for (let i = 0; i < 3; i++) {
      await buttons.nth(i).click();
      await page.waitForTimeout(300);
    }
  } else if (kind === "detail") {
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="add-to-cart"]').click();
      await page.waitForTimeout(300);
    }
  } else if (kind === "cart") {
    const plus = page.getByRole("button", { name: "Tăng số lượng" }).first();
    await plus.waitFor();
    for (let i = 0; i < 3; i++) {
      await plus.click();
      await page.waitForTimeout(300);
    }
  }
}

async function runInp(arch, pageKey, profileKey) {
  // Context mới (tương đương hồ sơ ẩn danh trống), mô phỏng đúng thiết bị như Lighthouse.
  const browser = await chromium.launch({ headless: !a.headed });
  try {
    const ctx = await browser.newContext({
      viewport: { width: device.screen.width, height: device.screen.height },
      deviceScaleFactor: device.screen.deviceScaleFactor,
      isMobile: device.screen.mobile,
      hasTouch: device.screen.mobile,
      userAgent: device.userAgent,
    });
    if (PAGES[pageKey].seedCart) {
      await ctx.addInitScript((v) => {
        if (!localStorage.getItem("tqmart-cart")) localStorage.setItem("tqmart-cart", v);
      }, CART_SEED);
    }
    const page = await ctx.newPage();
    await throttle(page, NETWORK_PROFILES[profileKey]);
    await page.goto(urlOf(arch, pageKey), { waitUntil: "load", timeout: 180_000 });
    // WebVitalsReporter đăng ký observer trong useEffect, tức là chỉ chạy sau khi React đã render
    // (CSR) hoặc hydrate xong (SSR). Có LCP trong window.__WEB_VITALS__ ⇒ nút bấm đã có handler.
    // Nếu hết giờ mà chưa sẵn sàng: vẫn đo nhưng ghi ready=0 để loại lượt này khi phân tích
    // (bấm trước khi hydrate xong sẽ cho INP thấp giả tạo).
    const ready = await page
      .waitForFunction(() => window.__WEB_VITALS__?.LCP, null, { timeout: 60_000 })
      .then(() => 1, () => 0);
    await page.waitForTimeout(1000);
    await interact(page, PAGES[pageKey].interaction);
    await page.waitForFunction(() => window.__WEB_VITALS__?.INP, null, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const wv = await page.evaluate(() => window.__WEB_VITALS__ ?? {});
    const pick = (k) => (wv[k] ? wv[k].value : undefined);
    return {
      ready,
      INP: pick("INP"),
      wv_LCP: pick("LCP"),
      wv_FCP: pick("FCP"),
      wv_CLS: pick("CLS"),
      TTFB: pick("TTFB"),
    };
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- kiểm tra trước khi đo
async function preflight() {
  const b = await freshBrowser();
  const page = await b.ctx.newPage();
  const info = {};
  for (const arch of Object.keys(TARGETS)) {
    await page.goto(TARGETS[arch] + "/", { waitUntil: "networkidle" });
    const counter = await page.locator("main h1 + p").innerText().catch(() => "?"); // "<n> sản phẩm"
    info[arch] = { counter, title: await page.title() };
  }
  await b.close();
  console.log("Kiểm tra trước khi đo:", info);
  if (info.CSR.counter !== info.SSR.counter) {
    console.warn("⚠️  Hai bản đang hiển thị KHÁC số lượng sản phẩm — kiểm tra biến DATASET khi deploy!");
  }
  return info;
}

/**
 * Đo nhanh thời gian tải 1 file tĩnh nhỏ của bản CSR (không điều tiết, từ Node) ngay trước mỗi lượt.
 * File tĩnh không phụ thuộc kiến trúc → nếu giá trị này tăng dần theo thời gian thì mạng thật
 * hoặc VPS đang chậm đi (dữ liệu đo thử cũ cho thấy TTFB của file tĩnh trôi từ ~100 ms lên ~600 ms
 * sau 2 giờ). Dùng cột `probe` để phát hiện và loại các đoạn bị trôi khi phân tích.
 */
async function probe() {
  const t0 = performance.now();
  try {
    const r = await fetch(TARGETS.CSR + "/favicon.svg?probe=" + Date.now(), { cache: "no-store" });
    await r.arrayBuffer();
    return Math.round(performance.now() - t0);
  } catch {
    return undefined;
  }
}

async function warmup() {
  // Gọi trước mỗi URL để tránh đo nhầm "cold start" của serverless (ảnh hưởng TTFB bản SSR).
  for (let i = 0; i < Number(a.warmup); i++) {
    for (const arch of Object.keys(TARGETS)) {
      for (const p of pages) await fetch(urlOf(arch, p)).then((r) => r.arrayBuffer()).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------- main
const COLS = ["time", "dataset", "device", "profile", "page", "arch", "run",
  "LCP", "FCP", "TBT", "CLS", "TTFB", "INP", "SI", "lh_score",
  "wv_LCP", "wv_FCP", "wv_CLS", "SRT", "ready", "bench", "probe", "lh_error", "error"];
const csvPath = path.join(OUT, "results.csv");
fs.writeFileSync(csvPath, COLS.join(",") + "\n");
const rows = [];
const fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(4)) : (v ?? ""));

const meta = { ...a, targets: TARGETS, startedAt: new Date().toISOString(), node: process.version };
meta.preflight = await preflight();
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));

const total = RUNS * profiles.length * pages.length * 2;
let done = 0;
for (const profileKey of profiles) {
  await warmup();
  for (let run = 1; run <= RUNS; run++) {
    for (const pageKey of pages) {
      const order = run % 2 ? ["CSR", "SSR"] : ["SSR", "CSR"];
      for (const arch of order) {
        const row = { time: new Date().toISOString(), dataset: a.dataset, device: a.device, profile: profileKey, page: pageKey, arch, run, probe: await probe() };
        try {
          if (!a["skip-lighthouse"]) Object.assign(row, await runLighthouse(arch, pageKey, profileKey));
          if (!a["skip-inp"]) Object.assign(row, await runInp(arch, pageKey, profileKey));
        } catch (e) {
          row.error = String(e.message || e).replace(/[\r\n,]+/g, " ").slice(0, 200);
        }
        rows.push(row);
        fs.appendFileSync(csvPath, COLS.map((c) => fmt(row[c])).join(",") + "\n");
        done++;
        console.log(
          `[${done}/${total}] ${profileKey} ${pageKey} ${arch} #${run}  LCP=${fmt(row.LCP)} FCP=${fmt(row.FCP)} TBT=${fmt(row.TBT)} CLS=${fmt(row.CLS)} TTFB=${fmt(row.TTFB)} INP=${fmt(row.INP)}${row.ready === 0 ? "  ⚠️ CHƯA HYDRATE XONG (ready=0)" : ""}${row.error ? "  ERR " + row.error : ""}`,
        );
      }
    }
  }
}

// trung vị theo (profile, page, arch)
const median = (xs) => {
  const s = xs.filter((x) => typeof x === "number").sort((p, q) => p - q);
  if (!s.length) return "";
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const METRICS = ["LCP", "FCP", "TBT", "CLS", "TTFB", "INP", "SI", "lh_score", "SRT"];
const groups = new Map();
for (const r of rows) {
  const k = [r.profile, r.page, r.arch].join("|");
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
const sumLines = [["dataset", "device", "profile", "page", "arch", "n", ...METRICS.map((m) => m + "_median")].join(",")];
for (const [k, rs] of groups) {
  const [profile, page, arch] = k.split("|");
  sumLines.push([a.dataset, a.device, profile, page, arch, rs.length, ...METRICS.map((m) => fmt(median(rs.map((r) => r[m]))))].join(","));
}
fs.writeFileSync(path.join(OUT, "summary.csv"), sumLines.join("\n") + "\n");
console.log("\nTrung vị:\n" + sumLines.join("\n"));
console.log(`\n✔ Kết quả: ${OUT}`);
