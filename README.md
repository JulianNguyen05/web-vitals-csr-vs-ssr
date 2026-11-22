# web-vitals-csr-vs-ssr

Ứng dụng mẫu mô phỏng giao dịch thương mại điện tử **T&Q Mart**, triển khai song song 2 phiên bản độc lập để đo và so sánh **Core Web Vitals**:

- `app-csr`: Client-Side Rendering, React 18.3.1 + Vite 5 + React Router v7, static hosting
- `app-ssr`: Server-Side Rendering, Next.js 14.2 (App Router), `force-dynamic` cho mọi route

Nguyên tắc cốt lõi: **kiến trúc kết xuất là biến số khác biệt duy nhất** giữa 2 phiên bản. Giao diện, luồng nghiệp vụ, dữ liệu và mức tối ưu code phải đồng nhất tuyệt đối. Script `pnpm test` kiểm tra tự động điều này (HTML `<main>` của 2 bản phải giống hệt nhau).

## Cấu trúc monorepo

```
apps/
  app-csr/              React SPA (Vite), build ra file tĩnh
  app-ssr/              Next.js App Router, force-dynamic ở layout → mọi route render mỗi request
packages/
  config/               Tailwind, Prettier, ESLint + app-env.mjs (đọc DATASET/SHOW_ARCH_LABEL cho cả 2 app)
  types/                Product, Category, CartItem, CartProduct
  data/                 JSON mock 3 ngưỡng 20/500/2000 + listing.ts (lọc ngành, phân trang)
  cart-store/           Zustand + persist (localStorage), số lượng 1–99
  ui/                   Toàn bộ giao diện: ProductListView, ProductCard, ProductDetailView,
                        CartPageView, NotFoundView, SiteHeader, AddToCartButton, WebVitalsReporter
deploy/                 Script cài VPS, cấu hình Nginx, pm2 (xem deploy/README.md)
scripts/
  measurement/          Lighthouse + Playwright: đo 6 chỉ số (run.mjs) và kiểm thử nghiệm thu (smoke.mjs)
```

Mỗi app chỉ còn phần **khai báo route** và **cách đọc tham số** (trình duyệt hay server). Mọi markup nằm trong `packages/ui`.

## Biến môi trường khi build (dùng chung cho cả 2 app)

| Biến | Giá trị | Mặc định | Ý nghĩa |
|---|---|---|---|
| `DATASET` | `20` \| `500` \| `2000` | `2000` | Ngưỡng dữ liệu. Trang danh mục hiển thị **toàn bộ** sản phẩm của ngưỡng (không phân trang), nên khối lượng dữ liệu hiển thị thay đổi đúng theo ngưỡng |
| `SHOW_ARCH_LABEL` | `1` \| `0` | `1` | `0` = ẩn nhãn CSR/SSR trên header và tiêu đề tab (dùng cho bản khảo sát người dùng) |

Hai bản **phải build với cùng giá trị** cho 2 biến này thì mới so sánh được. `scripts/measurement/run.mjs` tự cảnh báo nếu 2 bản hiển thị khác số lượng.

## Cài đặt và chạy

```powershell
pnpm install
pnpm --filter @repo/measurement run browsers     # tải Chromium cho Playwright (1 lần)
```

Dev:

```powershell
$env:DATASET="500"; pnpm dev:csr     # http://localhost:5180
$env:DATASET="500"; pnpm dev:ssr     # http://localhost:3001
```

Chạy bản production ở máy (giống môi trường đo):

```powershell
$env:DATASET="500"; pnpm build
pnpm start:csr      # http://localhost:5180  (vite preview)
pnpm start:ssr      # http://localhost:3001  (next start)
```

## Trang và URL

| Trang | URL | Ghi chú |
|---|---|---|
| Danh mục (UC01) | `/`, `/?category=<slug>` | Trạng thái nằm trên URL nên một URL cho ra cùng danh sách ở cả 2 bản |
| Chi tiết (UC02) | `/products/<id>` | Không tồn tại → trang 404 dùng chung |
| Giỏ hàng (UC04) | `/cart` | Đọc localStorage `tqmart-cart` |

## Kiểm thử nghiệm thu (UC01–UC04 + đồng nhất HTML)

```powershell
pnpm test --csr http://localhost:5180 --ssr http://localhost:3001
pnpm test --csr https://csr.<domain> --ssr https://ssr.<domain>
```

## Đo Web Vitals

```powershell
pnpm measure --csr https://csr.<domain> --ssr https://ssr.<domain> --dataset 2000 --runs 5
```

Chi tiết tham số, kịch bản mạng và cách đọc kết quả: [scripts/measurement/README.md](scripts/measurement/README.md).

## Triển khai

Cả hai bản chạy trên **cùng một VPS** (Ubuntu 24.04, 2 vCPU, 4 GB RAM), sau **cùng một Nginx**:

- `https://a.tqmart-lab.com`: bản CSR, file tĩnh do Nginx phục vụ
- `https://b.tqmart-lab.com`: bản SSR, Next.js chạy bằng pm2 phía sau Nginx

TLS, HTTP/2 và mức nén gzip giống hệt nhau ở hai bản. Hướng dẫn từng bước: [deploy/README.md](deploy/README.md).

Đổi ngưỡng dữ liệu trên VPS: sửa `DATASET` trong `/etc/tqmart/deploy.env`, chạy `deploy/deploy.sh --no-pull`, rồi `pnpm test` lại trước khi đo.

## Dữ liệu mock

```powershell
cd packages/data
pnpm merge       # gộp json/by-category/<n>/*.json → products-<n>.json (20 sp đầu của 500/2000 trùng products-20)
pnpm validate    # kiểm tra schema + thứ tự
```

Xem thêm [packages/data/README.md](packages/data/README.md).

---

## Quy tắc khi nâng cấp giao diện / tính năng

### Nguyên tắc chốt

> Nếu đổi **cách một thứ trông ra sao hoặc hoạt động ra sao** → sửa trong `packages/`.
> Nếu chỉ đổi **cách một route được khai báo/gọi ra** → sửa ở `apps/`, và phải làm y hệt ở cả `app-csr` lẫn `app-ssr`.

### Việc luôn làm ở `packages/` (viết 1 lần, cả 2 app tự nhận)

| Loại thay đổi | Package |
|---|---|
| Component giao diện (mới hoặc sửa) | `packages/ui` |
| Logic giỏ hàng, tính toán, state dùng chung | `packages/cart-store` |
| Màu sắc, spacing, breakpoint, font | `packages/config/tailwind.config.js` |
| Logic lọc/phân trang danh mục | `packages/data/listing.ts` |
| Biến môi trường build | `packages/config/app-env.mjs` |
| Định nghĩa kiểu dữ liệu mới | `packages/types` |

**Không** viết component hoặc logic nghiệp vụ riêng lẻ trong `apps/app-csr` hoặc `apps/app-ssr`. Nếu 2 app cần cùng một hành vi, hành vi đó thuộc về `packages/`.

### Việc bắt buộc phải đụng ở `apps/` (không tránh được)

- **Khai báo route mới** — mỗi app dùng cơ chế routing khác nhau:
  - `app-csr`: thêm `<Route>` trong `src/App.tsx` (React Router)
  - `app-ssr`: thêm thư mục + `page.tsx` trong `src/app/` (file-based routing)

  Thêm 1 trang mới nghĩa là phải tạo route ở **cả 2 nơi**, nhưng nội dung bên trong chỉ gọi component từ `packages/ui` — không viết lại logic.

- **Server/Client Component split (chỉ ở `app-ssr`)** — Next.js Server Component không truyền được callback (hàm) xuống props. Component nào cần tương tác (`onClick`, đọc `localStorage`, dùng `useCartStore`) phải tách thành Client Component riêng (`"use client"`) trong `apps/app-ssr`, giữ Server Component chỉ để đọc dữ liệu tĩnh. Component UI thật bên trong vẫn import từ `packages/ui`.

### Checklist trước khi coi một thay đổi UI/tính năng là "xong"

- [ ] Sửa ở `packages/`, không sửa trùng lặp ở từng `apps/`
- [ ] Nếu thêm route mới: đã tạo ở cả `app-csr` và `app-ssr`, path giống hệt nhau (vd. `/products/:id` ↔ `/products/[id]`)
- [ ] Ảnh mới (nếu có) dùng đúng 2 kích thước chuẩn: thumb 400×400, detail 800×800, định dạng WebP, khai báo cứng `width`/`height`, `loading="lazy"` cho ảnh ngoài khung nhìn đầu — tránh lệch chỉ số CLS
- [ ] Không dùng `next/image` hay thư viện tối ưu ảnh runtime — chỉ `<img>` thuần ở cả 2 bên, tránh lệch lợi thế LCP
- [ ] Không gọi API mạng để lấy dữ liệu sản phẩm — chỉ import JSON tĩnh từ `packages/data`
- [ ] Giỏ hàng chỉ lưu `localStorage` qua `packages/cart-store` — không thêm API call lưu giỏ hàng về server
- [ ] Đã chạy `pnpm test --csr http://localhost:5180 --ssr http://localhost:3001` và đạt toàn bộ tiêu chí (bao gồm HTML `<main>` giống hệt)
- [ ] Kiểm tra Console ở `app-ssr` không có warning "Hydration failed" sau khi đổi

### Vì sao các quy tắc này tồn tại

Toàn bộ ràng buộc trên đến từ nguyên tắc kiểm soát biến số của SAD/SRS: nếu 2 phiên bản lệch nhau ở bất kỳ điểm nào ngoài tầng kết xuất (CSR vs SSR), sự khác biệt về Web Vitals đo được sẽ không còn phản ánh đúng bản chất kiến trúc — làm sai lệch toàn bộ kết luận nghiên cứu.
