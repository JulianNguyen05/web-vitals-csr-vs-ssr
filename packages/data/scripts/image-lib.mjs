// packages/data/scripts/image-lib.mjs
// Đường dẫn + tiện ích dùng chung cho scrape-images / filter-images / reset-images.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SCRIPTS_DIR = here;
export const DATA_DIR = path.resolve(here, '..');
export const JSON_FILE = path.join(DATA_DIR, 'json', 'products-2000.json');
export const RAW_DIR = path.join(DATA_DIR, 'assets', 'raw');
export const PROCESSED_DIR = path.join(DATA_DIR, 'assets', 'processed');
export const REJECTED_DIR = path.join(DATA_DIR, 'assets', 'rejected'); // ảnh bị loại (có thể xem lại)
export const CACHE_DIR = path.join(here, '.cache');

export const CACHE = {
  pools: path.join(CACHE_DIR, 'pixabay-pools-v2.json'), // query -> danh sách ảnh thô từ Pixabay
  meta: path.join(CACHE_DIR, 'images-meta.json'), // "<cat>/<base>.jpg" -> { query, id, url, tags, slug, cat }
  rejected: path.join(CACHE_DIR, 'rejected-ids.json'), // id Pixabay đã bị loại, không chọn lại
  checked: path.join(CACHE_DIR, 'checked.json'), // kết quả filter-images (để chạy lại không phải quét lại)
  unmapped: path.join(CACHE_DIR, 'unmapped-tags.json'),
  failed: path.join(CACHE_DIR, 'scrape-failed.json'),
  report: path.join(CACHE_DIR, 'filter-report.csv'),
};

// Các file cache cũ của phiên bản trước, reset-images cũng xoá
export const LEGACY_CACHE = ['pixabay-pools.json', 'downloaded.json'].map((f) => path.join(CACHE_DIR, f));

export async function loadJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function saveJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export function makeArgs(argv = process.argv.slice(2)) {
  return {
    flag: (name) => argv.includes(`--${name}`),
    opt: (name) => {
      const i = argv.indexOf(`--${name}`);
      return i >= 0 ? argv[i + 1] : undefined;
    },
  };
}

// Bỏ dấu tiếng Việt + hạ chữ thường: "Đồng hồ" -> "dong ho"
export const norm = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
