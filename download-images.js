import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic path configuration
const BASE_DIR = __dirname;
const JSON_DIR = path.join(BASE_DIR, 'packages', 'data', 'json');
const RAW_ASSETS_DIR = path.join(BASE_DIR, 'packages', 'data', 'assets', 'raw');

const JSON_FILES = [
  'products-20.json',
  'products-500.json',
  'products-2000.json'
];

const CATEGORIES_FILE = 'categories.json';
const CONCURRENCY_LIMIT = 15;
const MAX_RETRIES = 3;

/**
 * Utility to limit parallel execution of async tasks
 */
async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

/**
 * Extract exact filename from URL in JSON
 */
function getFilenameFromUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    return path.basename(pathname);
  } catch (err) {
    return urlStr.split('/').pop().split('?')[0];
  }
}

/**
 * Download single file with retry mechanism
 */
async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (stat.size > 0) {
      return { status: 'skipped' };
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
      return { status: 'downloaded' };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { status: 'failed', error: err.message };
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  console.log('====================================================');
  console.log('  TOOL TẢI ÁNH TỰ ĐỘNG THEO DẠNG CATEGORY');
  console.log('====================================================\n');

  // 1. Read categories.json to create categoryId -> slug mapping
  const categoryMap = {}; // categoryId -> slug
  const categoriesPath = path.join(JSON_DIR, CATEGORIES_FILE);

  if (fs.existsSync(categoriesPath)) {
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
    categoriesData.forEach(cat => {
      categoryMap[cat.id] = cat.slug;
    });
    console.log(`✓ Đã đọc categories.json (${Object.keys(categoryMap).length} danh mục).`);
  } else {
    console.warn(`! Không tìm thấy categories.json tại: ${categoriesPath}`);
  }

  // 2. Scan JSON files and collect image tasks
  // Task key: `${categorySlug}/${filename}`
  const tasksMap = new Map();

  for (const jsonFileName of JSON_FILES) {
    const filePath = path.join(JSON_DIR, jsonFileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`! Không tìm thấy file: ${jsonFileName}`);
      continue;
    }

    const products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const prod of products) {
      // Determine category slug
      let categorySlug = categoryMap[prod.categoryId];

      if (!categorySlug && prod.thumbUrl) {
        const match = prod.thumbUrl.match(/\/(thumb|detail|gallery)\/([^/]+)\//);
        if (match && match[2]) {
          categorySlug = match[2];
        }
      }

      if (!categorySlug) {
        categorySlug = 'uncategorized';
      }

      // Collect image URLs: Only 1 main image (thumbUrl or fallback detailUrl) + all gallery images
      const urlsToDownload = [];
      
      const mainImageUrl = prod.thumbUrl || prod.detailUrl;
      if (mainImageUrl) {
        urlsToDownload.push(mainImageUrl);
      }

      if (Array.isArray(prod.gallery)) {
        prod.gallery.forEach(gUrl => {
          if (gUrl) urlsToDownload.push(gUrl);
        });
      }

      for (const url of urlsToDownload) {
        const filename = getFilenameFromUrl(url);
        const taskKey = `${categorySlug}/${filename}`;
        
        if (!tasksMap.has(taskKey)) {
          tasksMap.set(taskKey, {
            url,
            categorySlug,
            filename
          });
        }
      }
    }
    console.log(`✓ Quét xong ${jsonFileName}: tìm thấy ${products.length} sản phẩm.`);
  }

  const allTasks = Array.from(tasksMap.values());
  console.log(`\nTổng số ảnh duy nhất cần tải (1 thumbUrl/detailUrl + gallery): ${allTasks.length} ảnh.\n`);

  if (allTasks.length === 0) {
    console.log('Không có ảnh nào để tải. Kết thúc.');
    return;
  }

  // 3. Ensure target directory structure exists
  if (!fs.existsSync(RAW_ASSETS_DIR)) {
    fs.mkdirSync(RAW_ASSETS_DIR, { recursive: true });
  }

  const categoryFolders = new Set(allTasks.map(t => t.categorySlug));
  for (const catSlug of categoryFolders) {
    const catDir = path.join(RAW_ASSETS_DIR, catSlug);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
  }

  console.log(`✓ Đã khởi tạo ${categoryFolders.size} thư mục category trong packages/data/assets/raw.\n`);
  console.log(`Bắt đầu tải ảnh (Giới hạn song song: ${CONCURRENCY_LIMIT})...\n`);

  let completed = 0;
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const startTime = Date.now();

  await asyncPool(CONCURRENCY_LIMIT, allTasks, async (task) => {
    const destDir = path.join(RAW_ASSETS_DIR, task.categorySlug);
    const destPath = path.join(destDir, task.filename);

    const res = await downloadFile(task.url, destPath);
    completed++;

    if (res.status === 'downloaded') {
      downloadedCount++;
    } else if (res.status === 'skipped') {
      skippedCount++;
    } else if (res.status === 'failed') {
      failedCount++;
      console.error(`❌ [Lỗi] Tải thất bại (${task.categorySlug}/${task.filename}): ${res.error}`);
    }

    if (completed % 100 === 0 || completed === allTasks.length) {
      const percent = ((completed / allTasks.length) * 100).toFixed(1);
      console.log(` Tiến độ: ${completed}/${allTasks.length} (${percent}%) | Mới tải: ${downloadedCount} | Đã có sẵn: ${skippedCount} | Thất bại: ${failedCount}`);
    }
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n====================================================');
  console.log(`  HOÀN THÀNH TẢI ÁNH TRONG ${durationSec} GIÂY!`);
  console.log(`  - Mới tải về: ${downloadedCount}`);
  console.log(`  - Đã bỏ qua (đã có từ trước): ${skippedCount}`);
  console.log(`  - Lỗi: ${failedCount}`);
  console.log(`  - Thư mục chứa ảnh: packages/data/assets/raw/`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Lỗi khi chạy tool:', err);
  process.exit(1);
});
