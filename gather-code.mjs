import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Danh sách tất cả file Code, UI, Types, Store và Config
const codeAndConfigFiles = [
  // Shared Packages & Types
  'packages/types/index.ts',
  'packages/types/package.json',
  'packages/cart-store/index.ts',
  'packages/cart-store/package.json',
  
  // Config & Build
  'packages/config/tailwind.config.js',
  'packages/config/package.json',
  'package.json',
  'pnpm-workspace.yaml',

  // Shared UI Components
  'packages/ui/src/index.ts',
  'packages/ui/src/types.ts',
  'packages/ui/src/AddToCartButton.tsx',
  'packages/ui/src/Button.tsx',
  'packages/ui/src/ProductCard.tsx',
  'packages/ui/src/ProductDetailView.tsx',
  'packages/ui/src/CartPageView.tsx',
  'packages/ui/src/SiteHeader.tsx',
  'packages/ui/package.json',

  // CSR App (Vite + React Router)
  'apps/app-csr/package.json',
  'apps/app-csr/postcss.config.js',
  'apps/app-csr/src/index.css',
  'apps/app-csr/src/App.tsx',
  'apps/app-csr/src/components/RouterLink.tsx',
  'apps/app-csr/src/pages/ProductListPage.tsx',
  'apps/app-csr/src/pages/ProductDetailPage.tsx',
  'apps/app-csr/src/pages/CartPage.tsx',

  // SSR App (Next.js App Router)
  'apps/app-ssr/package.json',
  'apps/app-ssr/postcss.config.mjs',
  'apps/app-ssr/src/app/globals.css',
  'apps/app-ssr/src/app/layout.tsx',
  'apps/app-ssr/src/app/nav.tsx',
  'apps/app-ssr/src/app/page.tsx',
  'apps/app-ssr/src/app/products/[id]/page.tsx',
  'apps/app-ssr/src/app/cart/page.tsx'
];

// 2. Danh sách file JSON chỉ trích xuất mẫu dữ liệu gọn
const jsonSampleFiles = [
  { path: 'packages/data/json/categories.json', sliceCount: null }, // Đọc toàn bộ danh mục
  { path: 'packages/data/json/products-20.json', sliceCount: 2 }   // Chỉ lấy 2 sản phẩm đầu
];

function readJsonSample(relativePath, sliceCount) {
  const fullPath = path.join(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) {
    return `// ⚠️ KHÔNG TÌM THẤY FILE: ${relativePath}\n`;
  }

  try {
    const rawData = fs.readFileSync(fullPath, 'utf8');
    const parsed = JSON.parse(rawData);

    if (Array.isArray(parsed) && sliceCount !== null) {
      return JSON.stringify(parsed.slice(0, sliceCount), null, 2);
    }
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    return `// ❌ LỖI PARSE JSON: ${err.message}\n`;
  }
}

const outputFile = path.join(__dirname, 'combined-types-data-ui-config.txt');
let outputContent = '# TỔNG HỢP SOURCE CODE (CSR, SSR, UI, TYPES, CONFIG) & DATA SAMPLE\n\n';

// Ghi toàn bộ nội dung code và config
codeAndConfigFiles.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  outputContent += `\n// ` + `=`.repeat(70) + `\n`;
  outputContent += `// 📄 FILE: ${relativePath}\n`;
  outputContent += `// ` + `=`.repeat(70) + `\n\n`;

  try {
    if (fs.existsSync(fullPath)) {
      outputContent += fs.readFileSync(fullPath, 'utf8') + '\n';
      console.log(`✅ Đã gộp code: ${relativePath}`);
    } else {
      outputContent += `// ⚠️ KHÔNG TÌM THẤY FILE TRONG HỆ THỐNG: ${relativePath}\n`;
      console.log(`⚠️ Không tìm thấy: ${relativePath}`);
    }
  } catch (err) {
    outputContent += `// ❌ LỖI ĐỌC FILE: ${err.message}\n`;
    console.error(`❌ Lỗi đọc file ${relativePath}:`, err);
  }
});

// Ghi dữ liệu JSON mẫu (đã loại bỏ phần JSON dữ liệu dài)
jsonSampleFiles.forEach(({ path: relativePath, sliceCount }) => {
  outputContent += `\n// ` + `=`.repeat(70) + `\n`;
  outputContent += `// 📄 FILE JSON MẪU (${sliceCount ? `LẤY ${sliceCount} ITEM ĐẦU TIÊN` : 'DỮ LIỆU ĐẦY ĐỦ'}): ${relativePath}\n`;
  outputContent += `// ` + `=`.repeat(70) + `\n\n`;

  const content = readJsonSample(relativePath, sliceCount);
  outputContent += content + '\n';
  console.log(`✅ Đã gộp JSON mẫu: ${relativePath}`);
});

fs.writeFileSync(outputFile, outputContent, 'utf8');
console.log(`\n🎉 Đã xuất thành công file tổng hợp tại: combined-types-data-ui-config.txt`);