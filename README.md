# web-vitals-csr-vs-ssr

Ứng dụng mẫu mô phỏng giao dịch thương mại điện tử **T&Q Mart**, triển khai song song 2 phiên bản độc lập để đo và so sánh **Core Web Vitals**:

- `app-csr` — Client-Side Rendering, React.js 18 + Vite + React Router v7
- `app-ssr` — Server-Side Rendering, Next.js 14 (App Router)

Nguyên tắc cốt lõi: **kiến trúc kết xuất là biến số khác biệt duy nhất** giữa 2 phiên bản. Mọi thành phần khác (giao diện, luồng nghiệp vụ, dữ liệu, mức tối ưu code) phải đồng nhất tuyệt đối để đảm bảo tính hợp lệ của thực nghiệm đo lường.

## Cấu trúc monorepo

```
apps/
  app-csr/      React SPA (Vite), static hosting
  app-ssr/      Next.js App Router, force-dynamic mọi route
packages/
  config/       ESLint, Prettier, Tailwind config dùng chung
  types/        Product, Category, CartItem (TypeScript)
  data/         JSON mock 3 ngưỡng: 20 / 500 / 2000 sản phẩm
  cart-store/   Zustand + persist — logic giỏ hàng viết 1 lần
  ui/           Component thuần (Button, ProductCard, CartDrawer...)
```

## Yêu cầu môi trường

- Node.js ≥ 18
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)

## Cài đặt

```powershell
pnpm install
```

Chạy ở thư mục gốc — pnpm sẽ tự link tất cả package trong `packages/` vào 2 app qua `workspace:*`.

## Chạy ứng dụng

**CSR (React + Vite)** — cổng cố định `5180`:

```powershell
cd apps/app-csr
pnpm dev
```
→ http://localhost:5180

**SSR (Next.js)** — cổng cố định `3001`:

```powershell
cd apps/app-ssr
pnpm dev
```
→ http://localhost:3001

Có thể chạy song song 2 terminal để đối chiếu trực tiếp giữa 2 phiên bản.

## Regenerate dữ liệu mock

```powershell
cd packages/data
pnpm generate
```

Ghi đè `products-20.json`, `products-500.json`, `products-2000.json`, `categories.json`. Ảnh sản phẩm hiện dùng `picsum.photos` (seed theo ID, cố định giữa các lần load) — **cần thay bằng ảnh thật trên Cloudflare R2 trước khi đo Web Vitals chính thức**, vì độ trễ mạng của dịch vụ ngoài sẽ lẫn vào kết quả đo LCP.

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
- [ ] Đã mở song song `localhost:5180` và `localhost:3001`, đối chiếu bằng mắt: layout, spacing, ảnh, giá tiền phải giống hệt nhau
- [ ] Kiểm tra Console ở `app-ssr` không có warning "Hydration failed" sau khi đổi

### Vì sao các quy tắc này tồn tại

Toàn bộ ràng buộc trên đến từ nguyên tắc kiểm soát biến số của SAD/SRS: nếu 2 phiên bản lệch nhau ở bất kỳ điểm nào ngoài tầng kết xuất (CSR vs SSR), sự khác biệt về Web Vitals đo được sẽ không còn phản ánh đúng bản chất kiến trúc — làm sai lệch toàn bộ kết luận nghiên cứu.
