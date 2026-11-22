#!/usr/bin/env node
/**
 * Kiểm thử nghiệm thu tự động theo SRS (UC01–UC04) + kiểm tra đồng nhất HTML giữa CSR và SSR.
 *
 *   node smoke.mjs --csr http://localhost:5180 --ssr http://localhost:3001
 *   node smoke.mjs --csr https://csr.example.com --ssr https://ssr.example.com
 *
 * In ra từng tiêu chí ĐẠT/KHÔNG ĐẠT; thoát mã 1 nếu có tiêu chí không đạt.
 * Tuỳ chọn: --block-images (không tải ảnh, chạy nhanh hơn), --headed (mở trình duyệt để xem).
 */
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values: a } = parseArgs({
  // bỏ "--" nếu chạy kiểu `pnpm measure -- --csr ...`
  args: process.argv.slice(2).filter((x) => x !== "--"),
  options: {
    csr: { type: "string" },
    ssr: { type: "string" },
    "block-images": { type: "boolean", default: false },
    headed: { type: "boolean", default: false },
  },
});
if (!a.csr || !a.ssr) {
  console.error("Cần --csr <url> và --ssr <url>");
  process.exit(1);
}
const TARGETS = { CSR: a.csr.replace(/\/$/, ""), SSR: a.ssr.replace(/\/$/, "") };

const results = [];
const check = (arch, name, ok, detail = "") => results.push({ arch, name, ok: Boolean(ok), detail });
// Chuẩn hoá HTML để so sánh: bỏ comment rỗng React chèn khi SSR, gộp khoảng trắng.
const norm = (h) => h.replace(/<!-- -->/g, "").replace(/\s+/g, " ").trim();

const browser = await chromium.launch({ headless: !a.headed });
const snapshots = { CSR: {}, SSR: {} };

for (const [arch, base] of Object.entries(TARGETS)) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (a["block-images"]) await ctx.route(/\.(webp|png|jpe?g)(\?|$)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  const apiCalls = [];
  page.on("request", (r) => {
    if (["fetch", "xhr"].includes(r.resourceType()) && !/_rsc=|\.json$/.test(r.url())) apiCalls.push(r.url());
  });

  try {
    // ---------- UC01
    await page.goto(base + "/", { waitUntil: "networkidle" });
    const countTxt = await page.locator("main h1 + p").innerText();
    const total = Number(countTxt.replace(/\D/g, ""));
    const cards = await page.locator("article").count();
    check(arch, "UC01 hiển thị toàn bộ sản phẩm của ngưỡng", cards === total, `${cards} thẻ / "${countTxt}"`);
    check(arch, "UC01 tổng sản phẩm đúng 1 trong 3 ngưỡng", [20, 500, 2000].includes(total), `tổng ${total}`);
    const eager = await page.locator('article img[loading="eager"]').count();
    check(arch, "Ảnh khung nhìn đầu tải ngay (eager)", eager === Math.min(8, cards), `${eager} ảnh eager`);
    const noSize = await page.locator("img:not([width]), img:not([height])").count();
    check(arch, "Mọi <img> khai báo width/height (chống CLS)", noSize === 0, `${noSize} ảnh thiếu`);
    snapshots[arch].home = norm(await page.locator("main").innerHTML());

    await page.goto(base + "/", { waitUntil: "networkidle" });
    const chip = page.locator('nav[aria-label="Ngành hàng"] a').nth(1);
    const catName = await chip.innerText();
    await chip.click();
    await page.waitForFunction((n) => document.querySelector("main h1")?.textContent === n, catName);
    const catCards = await page.locator("article").count();
    check(arch, "UC01 lọc theo ngành hàng", catCards > 0 && catCards < total, `${catName}: ${catCards} thẻ`);
    await page.goto(base + "/?category=khong-ton-tai", { waitUntil: "networkidle" });
    check(arch, "UC01 thông báo 'Chưa có sản phẩm nào'",
      (await page.locator("main h1").innerText()) === "Chưa có sản phẩm nào");

    // ---------- UC02
    await page.goto(base + "/", { waitUntil: "networkidle" });
    const card = page.locator("article").nth(Math.min(12, cards - 1));
    await card.scrollIntoViewIfNeeded();
    const name = await card.locator("h3").innerText();
    await card.locator("h3 a").click();
    await page.waitForURL(/\/products\//);
    await page.waitForFunction((n) => document.querySelector("main h1")?.textContent === n, name);
    check(arch, "UC02 mở đúng chi tiết sản phẩm", true, name);
    check(arch, "UC02 trang chi tiết cuộn về đầu", (await page.evaluate(() => scrollY)) === 0);
    const detailUrl = page.url().replace(base, "");
    snapshots[arch].detailUrl = detailUrl;
    check(arch, "UC02 có ảnh, giá, thông số",
      (await page.locator("main img").count()) > 0 &&
      (await page.getByText("₫").count()) > 0 &&
      (await page.getByText("Thông số kỹ thuật").count()) > 0);

    // ---------- UC03
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.waitForFunction(() => /1 sản phẩm/.test(document.querySelector("header")?.textContent || ""));
    const ls = await page.evaluate(() => JSON.parse(localStorage.getItem("tqmart-cart") || "{}"));
    check(arch, "UC03 lưu vào localStorage", ls?.state?.items?.length === 1);
    check(arch, "UC03 biểu tượng giỏ cập nhật ngay", true);
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.waitForFunction(() => /2 sản phẩm/.test(document.querySelector("header")?.textContent || ""));
    const ls2 = await page.evaluate(() => JSON.parse(localStorage.getItem("tqmart-cart") || "{}"));
    check(arch, "UC03 sản phẩm đã có → cộng dồn số lượng", ls2?.state?.items?.[0]?.quantity === 2);

    // ---------- UC04
    await page.locator("header a[href='/cart']").click();
    await page.waitForURL(/\/cart/);
    const input = page.locator('main input[type="number"]');
    await input.waitFor();
    const unit = Number((await page.getByText(/₫ \/ sản phẩm/).innerText()).replace(/\D/g, ""));
    await input.fill("3");
    await page.waitForFunction(() => /\(3 sản phẩm\)/.test(document.querySelector("main h1")?.textContent || ""));
    const totalTxt = await page.locator("main .text-2xl").innerText();
    check(arch, "UC04 nhập số lượng → tổng tiền tính lại", Number(totalTxt.replace(/\D/g, "")) === unit * 3, totalTxt);
    await input.fill("1");
    await page.waitForFunction(() => /\(1 sản phẩm\)/.test(document.querySelector("main h1")?.textContent || ""));
    check(arch, "UC04 số lượng tối thiểu 1 (nút − bị khoá)",
      await page.getByRole("button", { name: "Giảm số lượng" }).isDisabled());
    await input.fill("0");
    await input.blur();
    check(arch, "UC04 không chấp nhận số lượng 0", (await input.inputValue()) === "1");
    await page.getByRole("button", { name: /^Xoá/ }).click();
    check(arch, "UC04 xoá sản phẩm → giỏ trống", (await page.getByText("Giỏ hàng của bạn đang trống").count()) === 1);
    check(arch, "Không gọi API khi thao tác giỏ hàng", apiCalls.length === 0, apiCalls.slice(0, 3).join(" "));

    // ---------- 404
    await page.goto(base + "/products/khong-ton-tai", { waitUntil: "networkidle" });
    check(arch, "UC02-2a sản phẩm không tồn tại → trang 404",
      /Không tìm thấy/.test(await page.locator("main h1").innerText()));
    snapshots[arch].notFound = norm(await page.locator("main").innerHTML());

    // ---------- Web Vitals
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.locator('[data-testid="add-to-cart"]').first().click();
    // INP được báo sau khi trình duyệt vẽ xong khung hình kế tiếp — chờ tối đa 10 s (máy chậm, 2000 sản phẩm).
    await page.waitForFunction(() => window.__WEB_VITALS__?.INP, null, { timeout: 10_000 }).catch(() => {});
    const wv = await page.evaluate(() => Object.keys(window.__WEB_VITALS__ || {}));
    check(arch, "Thu thập được LCP, INP, CLS, FCP, TTFB",
      ["LCP", "INP", "CLS", "FCP", "TTFB"].every((k) => wv.includes(k)), wv.join(","));

    // ---------- Deep link (CSR cần rewrite về index.html)
    const resp = await page.goto(base + "/cart");
    check(arch, "Mở thẳng URL /cart không lỗi", resp && resp.status() < 400, `HTTP ${resp?.status()}`);

    check(arch, "Không có lỗi JavaScript", errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) {
    check(arch, "Kịch bản chạy hết", false, String(e.message).split("\n")[0]);
  }
  await ctx.close();
}

// ---------- đồng nhất HTML giữa 2 bản
const cmp = async (label, key) => {
  const x = snapshots.CSR[key], y = snapshots.SSR[key];
  if (!x || !y) return check("CSR=SSR", label, false, "thiếu dữ liệu");
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  check("CSR=SSR", label, x === y, x === y ? `${x.length} ký tự` : `lệch tại ký tự ${i}: CSR «${x.slice(i, i + 60)}» / SSR «${y.slice(i, i + 60)}»`);
};
await cmp("HTML <main> trang danh mục giống hệt", "home");
await cmp("HTML <main> trang 404 giống hệt", "notFound");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const html = {};
  for (const [arch, base] of Object.entries(TARGETS)) {
    await page.goto(base + (snapshots.CSR.detailUrl || "/products/prod-101"), { waitUntil: "networkidle" });
    html[arch] = norm(await page.locator("main").innerHTML());
  }
  check("CSR=SSR", "HTML <main> trang chi tiết giống hệt", html.CSR === html.SSR);
  await ctx.close();
}
await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "✅ ĐẠT     " : "❌ KHÔNG ĐẠT"}  [${r.arch}] ${r.name}${r.detail ? "  — " + r.detail : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} tiêu chí đạt.`);
process.exit(failed ? 1 : 0);
