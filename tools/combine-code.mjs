#!/usr/bin/env node
/**
 * combine-code.mjs — Gộp toàn bộ mã nguồn monorepo web-vitals thành 1 file Markdown để gửi review.
 *
 * Cách dùng (đứng ở thư mục gốc web-vitals):
 *     node tools/combine-code.mjs
 * Kết quả: _review/combined-code.md
 *
 * Tùy chọn:
 *     --out <file>        đổi file kết quả
 *     --max-kb <n>        bỏ qua file lớn hơn n KB (mặc định 300)
 *
 * Script KHÔNG đưa vào: node_modules, .next, dist, dữ liệu JSON sản phẩm, ảnh, file .xlsx,
 * file .env thật (chỉ lấy ".env example" và tự che giá trị). Các chuỗi giống secret đều bị che.
 * Không cần cài thêm thư viện, chỉ cần Node >= 18.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------- cấu hình ----------
const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = fs.existsSync(path.join(process.cwd(), "pnpm-workspace.yaml"))
  ? process.cwd()
  : path.resolve(__dirname, "..");
const OUT = path.resolve(ROOT, argVal("--out", "_review/combined-code.md"));
const MAX_BYTES = Number(argVal("--max-kb", 300)) * 1024;

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", ".turbo", ".vercel",
  "coverage", ".cache", ".vite", "_review", ".idea", "__pycache__", ".pnpm-store",
]);
// đường dẫn tương đối (dùng dấu /) bị bỏ qua toàn bộ
const IGNORE_PATHS = ["packages/data/json", "packages/data/assets"];
const SKIP_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock", ".DS_Store", "Thumbs.db"]);

const TEXT_EXT = {
  ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx", ".mjs": "js", ".cjs": "js",
  ".json": "json", ".jsonc": "json", ".css": "css", ".scss": "scss", ".html": "html",
  ".md": "md", ".mdx": "mdx", ".yaml": "yaml", ".yml": "yaml", ".py": "python",
  ".toml": "toml", ".sh": "bash", ".ps1": "powershell", ".txt": "text",
};
const TEXT_DOTFILES = new Set([".gitignore", ".npmrc", ".nvmrc", ".prettierrc", ".prettierignore",
  ".eslintrc", ".eslintignore", ".editorconfig", ".node-version", ".vercelignore"]);
const SMALL_SVG_BYTES = 4 * 1024; // svg nhỏ thì in nội dung, lớn thì chỉ liệt kê

// ---------- tiện ích ----------
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const fmtKB = (b) => (b / 1024).toFixed(1) + " KB";

function isEnvFile(name) {
  return /^\.env/i.test(name) || /^\.?env[ ._-]/i.test(name);
}
function isEnvExample(name) {
  return isEnvFile(name) && /(example|sample|template)/i.test(name);
}

// Che các giá trị trông giống khóa bí mật
const SECRET_KEY_RE = /((?:SECRET|ACCESS_KEY|ACCESS_KEY_ID|TOKEN|PASSWORD|PASSWD|API_KEY|APIKEY|PRIVATE_KEY|ACCOUNT_ID|CLIENT_SECRET)[A-Z0-9_]*\s*[:=]\s*["'`]?)([^"'`\s,;]{8,})/gi;
function maskSecrets(text) {
  return text.replace(SECRET_KEY_RE, (_m, k, v) => k + "***MASKED(" + v.length + ")***");
}
function maskEnv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*)(.*)$/);
      if (!m) return line;
      const v = m[2].trim();
      if (!v) return line;
      // giữ lại URL công khai dạng r2.dev / http để mình kiểm tra cấu hình, che phần còn lại
      if (/^["']?https?:\/\//.test(v) && !/key|secret|token/i.test(m[1])) return line;
      return m[1] + "***MASKED***";
    })
    .join("\n");
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const r = rel(full);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      if (IGNORE_PATHS.some((p) => r === p || r.startsWith(p + "/"))) {
        out.push({ full, r, dir: true, skippedDir: true });
        continue;
      }
      out.push({ full, r, dir: true });
      walk(full, out);
    } else if (e.isFile()) {
      if (/^tools\/combine-(code|data)\.mjs$/.test(r)) continue; // không gộp chính script này
      out.push({ full, r, dir: false });
    }
  }
}

function classify(item) {
  const name = path.basename(item.full);
  const ext = path.extname(name).toLowerCase();
  const size = fs.statSync(item.full).size;
  if (SKIP_FILES.has(name)) return { kind: "skip", size, why: "lock file (đã trích version ở phần đầu)" };
  if (isEnvFile(name)) {
    return isEnvExample(name) ? { kind: "env", size, lang: "bash" } : { kind: "skip", size, why: "file .env thật — KHÔNG gửi" };
  }
  if (ext === ".svg") return size <= SMALL_SVG_BYTES ? { kind: "text", size, lang: "xml" } : { kind: "list", size, why: "svg lớn" };
  if (TEXT_EXT[ext] || TEXT_DOTFILES.has(name)) {
    if (size > MAX_BYTES) return { kind: "list", size, why: `lớn hơn ${fmtKB(MAX_BYTES)}` };
    return { kind: "text", size, lang: TEXT_EXT[ext] || "text" };
  }
  return { kind: "list", size, why: "file nhị phân / không phải code" };
}

// Trích version các thư viện quan trọng từ pnpm-lock.yaml
function lockVersions() {
  const lockPath = path.join(ROOT, "pnpm-lock.yaml");
  if (!fs.existsSync(lockPath)) return "(không tìm thấy pnpm-lock.yaml)";
  const text = fs.readFileSync(lockPath, "utf8");
  const wanted = ["react", "react-dom", "next", "vite", "@vitejs/plugin-react", "@vitejs/plugin-react-swc",
    "react-router", "react-router-dom", "zustand", "tailwindcss", "@tailwindcss/postcss", "postcss",
    "autoprefixer", "typescript", "lucide-react", "web-vitals", "vitest", "@testing-library/react",
    "playwright", "@playwright/test", "lighthouse", "@lhci/cli", "sharp", "eslint", "prettier"];
  const found = {};
  const lockVer = (text.match(/^lockfileVersion:\s*'?([\d.]+)/m) || [])[1] || "?";
  // định dạng v6/v9: "  react@18.3.1:" hoặc "  /react@18.3.1:" hoặc "  '@scope/x@1.2.3':"
  const re = /^\s{2}['"]?\/?((?:@[^@\s'"/]+\/)?[^@\s'"/]+)@(\d[^:'"(\s]*)/gm;
  let m;
  while ((m = re.exec(text))) {
    const [, name, ver] = m;
    if (wanted.includes(name)) (found[name] ||= new Set()).add(ver);
  }
  const lines = [`lockfileVersion: ${lockVer}`];
  for (const w of wanted) if (found[w]) lines.push(`${w}: ${[...found[w]].join(", ")}`);
  return lines.join("\n");
}

// Tổng hợp dependencies khai báo trong từng package.json
function manifestSummary(items) {
  const rows = [];
  for (const it of items) {
    if (it.dir || path.basename(it.full) !== "package.json") continue;
    try {
      const j = JSON.parse(fs.readFileSync(it.full, "utf8"));
      const deps = { ...(j.dependencies || {}), ...(j.devDependencies || {}) };
      const pick = ["react", "react-dom", "next", "vite", "react-router", "react-router-dom", "zustand",
        "tailwindcss", "typescript", "lucide-react", "web-vitals"]
        .filter((k) => deps[k]).map((k) => `${k}@${deps[k]}`).join("  ");
      rows.push(`- ${it.r}  →  name: ${j.name || "?"}  ${pick ? "| " + pick : ""}`);
    } catch {
      rows.push(`- ${it.r}  →  (JSON lỗi)`);
    }
  }
  return rows.join("\n");
}

// ---------- main ----------
const items = [];
walk(ROOT, items);

const tree = [];
const fileBlocks = [];
const listed = [];
let total = 0;

for (const it of items) {
  const depth = it.r.split("/").length - 1;
  const indent = "  ".repeat(depth);
  if (it.dir) {
    tree.push(`${indent}${path.basename(it.full)}/${it.skippedDir ? "  (bỏ qua — xem combined-data.md)" : ""}`);
    continue;
  }
  const c = classify(it);
  tree.push(`${indent}${path.basename(it.full)}  (${fmtKB(c.size)})${c.kind === "text" || c.kind === "env" ? "" : "  [không in]"}`);
  if (c.kind === "text" || c.kind === "env") {
    let content = fs.readFileSync(it.full, "utf8").replace(/^﻿/, "");
    content = c.kind === "env" ? maskEnv(content) : maskSecrets(content);
    total += Buffer.byteLength(content);
    fileBlocks.push(`### ${it.r}\n\n\`\`\`\`${c.lang}\n${content.replace(/\s+$/, "")}\n\`\`\`\`\n`);
  } else {
    listed.push(`- ${it.r} — ${fmtKB(c.size)} — ${c.why}`);
  }
}

const header = `# COMBINED CODE — web-vitals (T&Q Mart CSR vs SSR)

- Thời điểm tạo: ${new Date().toISOString()}
- Node: ${process.version} | OS: ${process.platform}
- Thư mục gốc: ${path.basename(ROOT)}
- Số file in nội dung: ${fileBlocks.length} | Dung lượng nội dung: ${fmtKB(total)}

## 1. Cây thư mục

\`\`\`text
${tree.join("\n")}
\`\`\`

## 2. Phiên bản thư viện thực tế (từ pnpm-lock.yaml)

\`\`\`text
${lockVersions()}
\`\`\`

## 3. Dependencies khai báo trong các package.json

${manifestSummary(items)}

## 4. File không in nội dung

${listed.join("\n") || "(không có)"}

## 5. Nội dung file

`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + fileBlocks.join("\n"), "utf8");
const outSize = fs.statSync(OUT).size;
console.log(`✔ Đã tạo ${rel(OUT)} — ${fileBlocks.length} file, ${fmtKB(outSize)}`);
if (outSize > 1.5 * 1024 * 1024) {
  console.log("⚠ File khá lớn (>1.5 MB). Kiểm tra mục 4/5 xem có file thừa nào lọt vào không.");
}
