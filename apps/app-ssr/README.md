# app-ssr: T&Q Mart (Server-Side Rendering)

Next.js 14 App Router. `export const dynamic = "force-dynamic"` ở `layout.tsx` nên **mọi route render lại ở mỗi request** (không ISR/SSG). Dữ liệu JSON được đọc ở Server Component.

```powershell
$env:DATASET="500"; pnpm dev        # http://localhost:3001
$env:DATASET="500"; pnpm build; pnpm start
pnpm lint
```

- `src/app/page.tsx`: danh mục, đọc `searchParams` (category, limit) ở server.
- `src/app/products/[id]/page.tsx`: chi tiết; không tồn tại → `notFound()` → `not-found.tsx`.
- `src/app/cart/page.tsx`: Server Component gửi danh mục rút gọn (id, tên, giá, ảnh) cho `cart-client.tsx`.
- Client Component chỉ có: `nav.tsx` (số lượng giỏ), `cart-client.tsx`, và các component `"use client"` trong `@repo/ui` (AddToCartButton, ProductGallery, CartPageView, WebVitalsReporter).
- Không dùng `next/image` hay `next/font` (SAD: tránh lợi thế tối ưu riêng của nền tảng).
