# @repo/data — mock data theo ngành hàng

## Cấu trúc mới

```
packages/data/json/
├── categories.json                  # danh sách ngành hàng (không đổi)
├── products-20.json                 # file phẳng, GIỮ NGUYÊN — app-csr / app-ssr vẫn import y như cũ
├── products-500.json
├── products-2000.json
└── by-category/                     # ← MỚI: nguồn "sự thật" để chỉnh sửa
    ├── 20/
    │   ├── dien-tu.json
    │   ├── thoi-trang.json
    │   ├── gia-dung.json
    │   └── sach.json
    ├── 500/
    │   └── ... (4 file tương tự)
    └── 2000/
        └── ... (4 file tương tự)
```

`products-<count>.json` **không bị xoá** — hai app vẫn import đúng đường dẫn cũ,
không cần sửa gì bên `app-csr` / `app-ssr`. Điểm khác biệt là bây giờ file này
được xem là **bản build/gộp**, còn nguồn để bạn thêm/sửa/xoá sản phẩm là các file
nhỏ trong `by-category/<count>/<slug>.json`.

## Quy trình làm việc

1. Sửa trực tiếp trong file của từng ngành hàng, ví dụ
   `json/by-category/500/dien-tu.json` — chỉ chứa sản phẩm ngành Điện tử của
   ngưỡng 500.
2. Chạy lệnh gộp để build lại file phẳng cho cả 3 ngưỡng:
   ```bash
   cd packages/data
   npm run merge
   ```
   Script sẽ đọc `categories.json` để biết thứ tự + slug ngành hàng, đọc từng
   file trong `by-category/<count>/`, nối lại và ghi đè `products-<count>.json`.
3. Nếu muốn sinh lại **toàn bộ dữ liệu giả lập từ đầu** (random mới hoàn toàn),
   vẫn dùng:
   ```bash
   npm run generate
   ```
   `generate.mjs` đã được cập nhật để tự chia đều sản phẩm cho từng ngành hàng,
   ghi ra cả `by-category/<count>/<slug>.json` lẫn `products-<count>.json` cùng lúc.

## Lưu ý khi merge

- Thứ tự sản phẩm trong `products-<count>.json` sau khi merge sẽ theo thứ tự
  **ngành hàng** (toàn bộ sản phẩm ngành 1, rồi đến ngành 2, ...), khác với thứ
  tự ngẫu nhiên trộn lẫn trước đây. Điều này **không ảnh hưởng** đến các use
  case UC01–UC04 trong SRS (không có yêu cầu về thứ tự sản phẩm cụ thể), nhưng
  nếu bạn có test nào so sánh thứ tự y hệt bản cũ thì cần lưu ý.
- `merge.mjs` sẽ cảnh báo (không dừng chạy) nếu thiếu file của 1 ngành hàng nào
  đó ở 1 ngưỡng, để bạn biết mà bổ sung.
- `categoryId` trong từng sản phẩm phải khớp với `id` trong `categories.json`
  — nếu bạn thêm ngành hàng mới, nhớ thêm cả vào `categories.json` và tạo file
  `by-category/<count>/<slug-moi>.json` tương ứng (có thể để mảng rỗng `[]`
  trước khi có dữ liệu).

## Danh mục ngành hàng (10 ngành, theo đúng SRS)

`categories.json` đã được cập nhật đủ 10 ngành hàng như trong tài liệu SRS:

| id | name | slug |
|---|---|---|
| cat-1 | Điện tử | dien-tu |
| cat-2 | Thời trang | thoi-trang |
| cat-3 | Gia dụng | gia-dung |
| cat-4 | Sách - văn phòng phẩm | sach-van-phong-pham |
| cat-5 | Thực phẩm - đồ uống | thuc-pham-do-uong |
| cat-6 | Mỹ phẩm - chăm sóc cá nhân | my-pham-cham-soc-ca-nhan |
| cat-7 | Mẹ và bé - đồ chơi trẻ em | me-va-be-do-choi-tre-em |
| cat-8 | Thể thao - dã ngoại | the-thao-da-ngoai |
| cat-9 | Nội thất - trang trí | noi-that-trang-tri |
| cat-10 | Vật nuôi - thú cưng | vat-nuoi-thu-cung |

Lưu ý:
- `cat-1`, `cat-2`, `cat-3` giữ nguyên id/slug cũ — dữ liệu sản phẩm hiện có
  của 3 ngành này **không bị ảnh hưởng**.
- `cat-4` đổi tên từ "Sách" thành "Sách - văn phòng phẩm" cho khớp SRS, đồng
  thời file dữ liệu được đổi tên từ `sach.json` → `sach-van-phong-pham.json`
  (giữ nguyên nội dung, chỉ đổi tên file theo slug mới).
- 6 ngành hàng còn lại (`cat-5` → `cat-10`) **chưa có dữ liệu** — mỗi ngưỡng
  (20/500/2000) đã có sẵn file rỗng `[]` cho từng ngành để tránh cảnh báo
  "thiếu file" khi chạy `npm run merge`. Bạn tự thêm sản phẩm thật vào các
  file này, hoặc chạy `npm run generate` để faker sinh dữ liệu ngẫu nhiên chia
  đều cho cả 10 ngành.

## Số liệu hiện tại (sau khi thêm 10 ngành hàng)

| Ngưỡng | dien-tu | thoi-trang | gia-dung | sach-van-phong-pham | 6 ngành còn lại | Tổng |
|---|---|---|---|---|---|---|
| 20 | 3 | 4 | 10 | 3 | 0 | 20 |
| 500 | 141 | 121 | 124 | 114 | 0 | 500 |
| 2000 | 493 | 488 | 514 | 505 | 0 | 2000 |

Tổng số sản phẩm mỗi ngưỡng **không đổi** (20/500/2000) vì 6 ngành mới đang
rỗng — khi bạn nạp dữ liệu thật vào đó, cần tính lại/cắt bớt ở các ngành cũ
nếu muốn giữ đúng tổng 20/500/2000 theo quy tắc nghiệp vụ trong SRS.

## Ảnh sản phẩm — nơi lưu trữ

Hiện tại `thumbUrl` / `detailUrl` của mỗi sản phẩm trỏ tới **Lorem Picsum**
(`https://picsum.photos/seed/prod-<id>/...`) — một dịch vụ ảnh placeholder
công khai, ảnh được chọn ngẫu nhiên nhưng cố định theo seed (cùng 1 id luôn
ra cùng 1 ảnh). Đây **không phải** ảnh sản phẩm thật, chỉ là ảnh giữ chỗ có
kích thước/dung lượng thực để đo Web Vitals (LCP, CLS...) một cách trung
thực hơn so với ảnh trống.

Điểm cần lưu ý: tài liệu kiến trúc (SAD) mô tả phương án dùng **CDN ảnh tĩnh
(Cloudflare R2)** làm "nguồn ảnh sản phẩm dùng chung, độc lập với cả hai ứng
dụng". Hiện trạng code đang dùng Picsum (bên thứ ba) thay vì R2 — tức là
chưa khớp hoàn toàn với SAD. Vì ảnh được áp dụng **giống hệt** cho cả bản
CSR và SSR nên không làm lệch kết quả so sánh giữa hai kiến trúc, nhưng nếu
muốn bám sát đúng SAD (tự chủ hạ tầng, không phụ thuộc uptime/tốc độ của bên
thứ ba trong lúc đo đạc), bạn sẽ cần:
1. Tạo bucket Cloudflare R2 + bật public access hoặc gắn CDN domain.
2. Upload sẵn 1 bộ ảnh placeholder (có thể vẫn lấy từ Picsum về rồi tải lên R2
   một lần, thay vì gọi trực tiếp Picsum runtime).
3. Đổi `thumbUrl`/`detailUrl` trong `generate.mjs` từ domain Picsum sang domain
   R2/CDN của bạn.

## Schema sản phẩm mở rộng (cập nhật)

Mỗi ngành hàng hiện có **1 sản phẩm mẫu chi tiết** trong `by-category/<n>/<slug>.json`
(giống nhau ở cả 3 ngưỡng — bạn tự bổ sung thêm sản phẩm khác cho từng ngưỡng).
Các trường cũ (`id`, `name`, `slug`, `price`, `categoryId`, `thumbUrl`, `detailUrl`,
`description`) giữ nguyên như trước — **không đổi tên, không đổi kiểu dữ liệu** để
UI hiện tại (`ProductCard.tsx`, các trang hiển thị) không bị vỡ.

Các trường **mới được thêm vào** (đều optional, có thể bỏ trống khi chưa cần):

| Trường | Kiểu | Mô tả |
|---|---|---|
| `brand` | string | Thương hiệu |
| `sku` | string | Mã quản lý kho nội bộ |
| `originalPrice` | number | Giá gốc trước khi giảm |
| `discountPercent` | number | % giảm giá |
| `unit` | string | Đơn vị tính (cái, bộ, kg, chai...) |
| `shortDescription` | string | Mô tả ngắn — dùng ở trang danh mục/list |
| `gallery` | string[] | Ảnh phụ, ngoài `thumbUrl`/`detailUrl` |
| `specifications` | object | Thông số kỹ thuật dạng key-value, **tự do theo từng ngành hàng** (điện tử có CPU/RAM, thời trang có chất liệu/size...) |
| `rating` | `{ average, count }` | Điểm đánh giá trung bình + số lượt đánh giá |
| `stock` | number | Tồn kho |
| `soldCount` | number | Số lượng đã bán |
| `weight` | number | Khối lượng (gram) |
| `dimensions` | `{ length, width, height }` | Kích thước đóng gói (cm) |
| `origin` | string | Xuất xứ |
| `warranty` | string | Chính sách bảo hành/đổi trả |
| `tags` | string[] | Từ khoá gắn thẻ |
| `createdAt` | string (ISO date) | Ngày tạo sản phẩm |

`specifications` cố tình để dạng `Record<string, string>` (key-value tự do) vì mỗi
ngành hàng có bộ thông số khác nhau hoàn toàn — không ép chung 1 schema cứng.

Type TypeScript tương ứng đã cập nhật tại `packages/types/index.ts`.
