# app-csr: T&Q Mart (Client-Side Rendering)

React 18 + Vite 5 + React Router v7. Toàn bộ kết xuất diễn ra trong trình duyệt; dữ liệu JSON được đóng gói vào bundle lúc build.

```powershell
$env:DATASET="500"; pnpm dev        # http://localhost:5180
$env:DATASET="500"; pnpm build; pnpm preview
pnpm lint
```

- Route: `src/App.tsx` (`/`, `/products/:id`, `/cart`, `*` → 404). Giao diện lấy từ `@repo/ui`.
- Trên VPS, Nginx chuyển mọi đường dẫn về `index.html` (`try_files $uri /index.html`, xem `deploy/nginx/tqmart-https.conf`). Thiếu cấu hình này thì mở thẳng `/cart` hoặc `/products/...` sẽ báo 404.
- `src/components/ScrollManager.tsx`: cuộn lên đầu sau mỗi lần điều hướng, giống `next/link`.
- Biến môi trường build: xem README gốc (`DATASET`, `SHOW_ARCH_LABEL`).
