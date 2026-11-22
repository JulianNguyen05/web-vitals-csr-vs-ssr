# @repo/data: mock data theo ngành hàng

## Cấu trúc

```
packages/data/
├── index.ts                         # export categories, products (theo DATASET), toCartCatalog, listing
├── listing.ts                       # lọc ngành + phân trang danh mục (dùng chung CSR/SSR)
└── json/
    ├── categories.json              # 10 ngành hàng theo SRS (id cat-1 … cat-10)
    ├── products-20.json             # bản gộp, app import qua alias @dataset
    ├── products-500.json
    ├── products-2000.json
    └── by-category/<20|500|2000>/<slug>.json   # nguồn để chỉnh sửa
```

App chỉ import **1** file `products-<DATASET>.json` (alias `@dataset` trong `vite.config.ts` / `next.config.mjs`, cấu hình chung ở `packages/config/app-env.mjs`).

## Quy trình

```powershell
cd packages/data
pnpm merge       # gộp by-category → products-<n>.json
pnpm validate    # kiểm tra schema, trùng id/slug, thứ tự
pnpm sync        # (khi đổi ảnh) process-images → upload-r2 → update-urls → merge → validate
```

### Thứ tự sản phẩm sau `merge`

- `products-20.json`: nối theo thứ tự ngành trong `categories.json` (2 sản phẩm mỗi ngành).
- `products-500.json`, `products-2000.json`: **20 sản phẩm đầu trùng đúng thứ tự `products-20.json`**, phần còn lại xếp xen kẽ từng ngành.

Nhờ vậy khung nhìn đầu tiên (ảnh LCP và 8 ảnh tải ngay) giống nhau ở cả 3 ngưỡng. Khác biệt đo được giữa các ngưỡng đến từ khối lượng dữ liệu, không phải do ảnh khác nhau. `validate` sẽ cảnh báo nếu thứ tự bị lệch.

## Ngành hàng

| id | name | slug |
|---|---|---|
| cat-1 | Điện tử | dien-tu |
| cat-2 | Gia dụng | gia-dung |
| cat-3 | Mẹ và bé - đồ chơi trẻ em | me-va-be-do-choi-tre-em |
| cat-4 | Mỹ phẩm - chăm sóc cá nhân | my-pham-cham-soc-ca-nhan |
| cat-5 | Nội thất - trang trí | noi-that-trang-tri |
| cat-6 | Sách - văn phòng phẩm | sach-van-phong-pham |
| cat-7 | Thể thao - dã ngoại | the-thao-da-ngoai |
| cat-8 | Thời trang | thoi-trang |
| cat-9 | Thực phẩm - đồ uống | thuc-pham-do-uong |
| cat-10 | Vật nuôi - thú cưng | vat-nuoi-thu-cung |

Mỗi ngưỡng chia đều: 2 / 50 / 200 sản phẩm mỗi ngành.

## Ảnh sản phẩm

- Ảnh gốc lấy từ Pixabay (`scrape-images.mjs`), lọc bằng `filter-images.mjs` (ảnh loại nằm ở `assets/rejected`).
- `process-images.mjs` (sharp) sinh WebP: `thumb` 400×400, `detail` 800×800, `gallery` 800×800.
- `upload-r2.mjs` đưa lên Cloudflare R2, header `Cache-Control: public, max-age=31536000, immutable`.
- Cả 2 app dùng `<img>` thuần với `width`/`height` cố định. 8 ảnh đầu danh mục `loading="eager"`, còn lại `lazy`.
- Nguồn ảnh: Pixabay Content License, ảnh chỉ mang tính minh hoạ.

**Trước khi đo chính thức:** URL `*.r2.dev` là URL công khai dùng thử, bị Cloudflare giới hạn tốc độ. Nên gắn custom domain cho bucket (ví dụ `img.<domain>`), đặt `R2_PUBLIC_BASE` trong `.env`, rồi chạy cho từng ngưỡng:

```powershell
node scripts/update-urls.mjs 20; node scripts/update-urls.mjs 500; node scripts/update-urls.mjs 2000
pnpm merge; pnpm validate
```

## Schema sản phẩm

Xem `packages/types/index.ts`. Bắt buộc: `id, name, slug, price, categoryId, thumbUrl, detailUrl, description`. Mở rộng (optional): `brand, sku, originalPrice, discountPercent, unit, shortDescription, gallery, specifications, rating, stock, soldCount, weight, dimensions, origin, warranty, tags, createdAt`.
