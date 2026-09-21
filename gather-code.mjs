import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Danh sách các file UI, Pages, Store, Styling cần gom để sửa giao diện giỏ hàng
const filesToGather = [
  // 1. Component UI dùng chung
  'packages/ui/src/CartDrawer.tsx',
  'packages/ui/src/Button.tsx',
  
  // 2. Trang/route hiển thị giỏ hàng
  'apps/app-csr/src/pages/CartPage.tsx',
  'apps/app-ssr/src/app/cart/page.tsx',
  
  // 3. Styling dùng chung & Config
  'packages/config/tailwind.config.js',
  'apps/app-csr/src/index.css',
  'apps/app-ssr/src/app/globals.css',
  
  // 4. Logic/state giỏ hàng và Types
  'packages/cart-store/index.ts',
  'packages/types/index.ts'
];

const outputFile = path.join(__dirname, 'combined-cart-source.txt');
let outputContent = '# TỔNG HỢP SOURCE CODE GIỎ HÀNG (UI, PAGES, STORE, STYLES)\n\n';

filesToGather.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  
  outputContent += `\n// ` + `=`.repeat(60) + `\n`;
  outputContent += `// 📄 FILE: ${relativePath}\n`;
  outputContent += `// ` + `=`.repeat(60) + `\n\n`;

  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      outputContent += content + '\n';
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

fs.writeFileSync(outputFile, outputContent, 'utf8');
console.log(`\n🎉 Hoàn tất! Code đã được gom vào file: combined-cart-source.txt`);