import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Danh sách file đọc toàn bộ (Direct files)
const directFiles = [
  'packages/types/index.ts',
  'packages/types/package.json',
  'packages/types/tsconfig.json',
  'packages/data/package.json',
  'packages/data/json/categories.json',
  'packages/ui/src/CartPageView.tsx',
  'packages/ui/src/SiteHeader.tsx',
  'packages/ui/src/CartDrawer.tsx',
  'packages/ui/tsconfig.json',
  'packages/cart-store/tsconfig.json',
  'package.json',
  'pnpm-workspace.yaml'
];

// Hàm xử lý cắt mẫu dữ liệu JSON sản phẩm
function getJsonSamples(relativePath, type) {
  const fullPath = path.join(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) {
    return `// ❌ LỖI: Không tìm thấy file ${relativePath}\n`;
  }

  try {
    const rawData = fs.readFileSync(fullPath, 'utf8');
    const items = JSON.parse(rawData);

    if (!Array.isArray(items)) {
      return rawData;
    }

    if (type === 'products-20') {
      // Lấy 4 sản phẩm thuộc các category khác nhau
      const categoriesSeen = new Set();
      const samples = [];
      for (const item of items) {
        const catKey = item.category_slug || item.categorySlug || item.category || item.category_id;
        if (!categoriesSeen.has(catKey) && samples.length < 4) {
          categoriesSeen.add(catKey);
          samples.push(item);
        }
      }
      return JSON.stringify(samples.length > 0 ? samples : items.slice(0, 4), null, 2);
    }

    if (type === 'slice-2') {
      // Chỉ lấy 2 sản phẩm đầu tiên
      return JSON.stringify(items.slice(0, 2), null, 2);
    }
  } catch (err) {
    return `// ❌ LỖI PARSE JSON: ${err.message}\n`;
  }
}

const outputFile = path.join(__dirname, 'combined-types-data-ui-config.txt');
let outputContent = '# TỔNG HỢP TYPES, DATA (SAMPLE), UI & BUILD CONFIG\n\n';

// 1. Ghi các file đọc toàn bộ
directFiles.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  outputContent += `\n// ` + `=`.repeat(60) + `\n`;
  outputContent += `// 📄 FILE: ${relativePath}\n`;
  outputContent += `// ` + `=`.repeat(60) + `\n\n`;

  try {
    if (fs.existsSync(fullPath)) {
      outputContent += fs.readFileSync(fullPath, 'utf8') + '\n';
      console.log(`✅ Đã đọc: ${relativePath}`);
    } else {
      outputContent += `// ❌ LỖI: Không tìm thấy file này trong hệ thống.\n`;
      console.log(`❌ Không tìm thấy: ${relativePath}`);
    }
  } catch (err) {
    outputContent += `// ❌ LỖI ĐỌC FILE: ${err.message}\n`;
    console.error(`❌ Lỗi đọc file ${relativePath}:`, err);
  }
});

// 2. Trích xuất mẫu từ các file JSON sản phẩm lớn
const jsonSampleFiles = [
  { path: 'packages/data/json/products-20.json', type: 'products-20' },
  { path: 'packages/data/json/products-500.json', type: 'slice-2' },
  { path: 'packages/data/json/products-2000.json', type: 'slice-2' }
];

jsonSampleFiles.forEach(({ path: relativePath, type }) => {
  outputContent += `\n// ` + `=`.repeat(60) + `\n`;
  outputContent += `// 📄 FILE (MẪU DỮ LIỆU): ${relativePath}\n`;
  outputContent += `// ` + `=`.repeat(60) + `\n\n`;

  const sampleContent = getJsonSamples(relativePath, type);
  outputContent += sampleContent + '\n';
  console.log(`✅ Đã trích xuất mẫu JSON: ${relativePath}`);
});

fs.writeFileSync(outputFile, outputContent, 'utf8');
console.log(`\n🎉 Hoàn tất! Tất cả dữ liệu đã gom vào: combined-types-data-ui-config.txt`);