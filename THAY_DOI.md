# Danh sách thay đổi (dùng cho báo cáo / nghiệm thu)

## A. Lỗi làm lệch kết quả đo giữa CSR và SSR

| # | Vấn đề | Đã sửa |
|---|---|---|
| A1 | CSR không truyền `priority`, nên 8 ảnh đầu bị `lazy`. SSR thì `eager` | Toàn bộ trang danh mục chuyển vào `ProductListView` (packages/ui), dùng chung nên không thể lệch nữa |
| A2 | Bản SSR **không đổi ngưỡng dữ liệu** khi build lại: cache webpack `.next/cache` (Vercel cũng giữ) vẫn dùng JSON của lần build trước | `next.config.mjs` gắn `DATASET` vào version cache |
| A3 | CSR báo 404 khi mở thẳng `/products/...`, `/cart` (Lighthouse cần mở thẳng URL) | Nginx chuyển mọi đường dẫn về `index.html` (`deploy/nginx/tqmart-https.conf`) |
| A4 | SSR `/cart` bị dựng sẵn thành HTML tĩnh lúc build (trái SAD "mọi route force-dynamic") | `force-dynamic` ở `layout.tsx`; `/cart` thành Server Component |
| A5 | Thư viện `web-vitals` đã cài nhưng không được gọi; không đo được INP | `WebVitalsReporter` (packages/ui) gắn ở cả 2 app, ghi `window.__WEB_VITALS__` |
| A6 | Không có script đo tự động (SAD mục 5.1) | `scripts/measurement/run.mjs`: Lighthouse (LCP, FCP, TBT, CLS, TTFB) + Playwright (INP), 3G/4G/WiFi, mobile/desktop, xuất CSV |
| A7 | Tailwind lệch phiên bản (CSR 3.4.19, SSR 3.4.9), postcss cũng lệch | Ghim cùng phiên bản: tailwindcss 3.4.19, postcss 8.4.41, autoprefixer 10.4.20 |
| A8 | React Router v7 tự gắn `data-discover="true"` vào mọi link CSR, nên HTML khác SSR | `discover="none"` trong `RouterLink` |
| A9 | CSR không cuộn lên đầu khi chuyển trang; Next thì có | `ScrollManager` tái tạo đúng hành vi `next/link` |
| A10 | `tsc` của CSR lỗi `Cannot find module '@dataset'` (`/// <reference>` đặt sau import) | Đưa lên dòng đầu `packages/data/index.ts` |
| A11 | CSR: component gốc `App` đọc số lượng giỏ hàng, nên mỗi lần "Thêm vào giỏ" **render lại cả ứng dụng, gồm 2000 thẻ sản phẩm**. SSR chỉ cập nhật header (`nav.tsx`). INP của CSR bị chậm do cách viết code (đo thử ngưỡng 2000, 4G: CSR 1.176 ms so với SSR ~540 ms) | Tách `components/Header.tsx` riêng giống `nav.tsx` của SSR. Sau khi sửa: CSR ~456–544 ms, SSR ~472–504 ms |

## B. Bổ sung theo SRS

| # | Yêu cầu | Đã làm |
|---|---|---|
| B1 | Trang danh mục | **Hiển thị toàn bộ sản phẩm của ngưỡng, không phân trang**, để khối lượng dữ liệu hiển thị thay đổi đúng theo ngưỡng (mục 12 Thuyết minh). Phân trang đã thử rồi bỏ: với phân trang, HTML bản SSR gần như không đổi giữa ngưỡng 20 và 2000 (124 → 231 KB) trong khi JS bản CSR tăng 249 → 3.165 KB, nên che mất tác động của khối lượng dữ liệu lên SSR. **Cần bỏ yêu cầu "phân trang/tải thêm" ở UC01 trong SRS cho khớp** |
| B2 | UC01 xem theo ngành hàng | Thanh ngành hàng, URL `?category=<slug>` |
| B3 | UC01-3a "Chưa có sản phẩm nào" | Có ở cả 2 bản (luồng 5a không còn áp dụng vì không phân trang) |
| B4 | UC02-2a sản phẩm không tồn tại → 404 | `NotFoundView` dùng chung: SSR `not-found.tsx`, CSR route `*` |
| B5 | UC04 ô nhập số lượng, số nguyên ≥ 1 | Ô `input number` + nút −/+; nút − khoá ở 1; không nhận 0/âm/chữ; giới hạn 99 |
| B6 | Tiêu chí bàn giao: README hướng dẫn triển khai | README gốc, README 2 app, README data, README đo lường |

## B2. Hạ tầng triển khai (Công việc 2.3)

| Nội dung | Thực hiện |
|---|---|
| Máy chủ | 01 VPS Ubuntu 24.04 (2 vCPU, 4 GB RAM, 60 GB SSD) đặt tại Việt Nam, chạy **cả hai** bản: đúng "cùng một gói hạ tầng máy chủ" |
| Tên miền | Tên miền quốc tế `tqmart-lab.com`, 2 tên miền phụ trung tính: `a.` (CSR) và `b.` (SSR) |
| Nginx dùng chung | Cùng TLS, HTTP/2, gzip mức 5 cho cả hai bản. Next.js tắt nén riêng (`compress: false`). JS/CSS tĩnh của cả hai bản đều do Nginx phục vụ, cùng header cache |
| SSR | `next start` chạy qua pm2 (1 tiến trình), `proxy_buffering off` để HTML được stream |
| Bộ triển khai | `deploy/`: `setup-server.sh`, `deploy.sh`, `install-nginx.sh`, cấu hình Nginx, pm2; hướng dẫn trong `deploy/README.md` |
| Bỏ | `apps/app-csr/vercel.json` (không dùng Vercel) |

## C. Cải thiện khác

| # | Nội dung |
|---|---|
| C1 | Dữ liệu: `merge` sắp 20 sp đầu của 500/2000 trùng products-20, phần còn lại xen kẽ ngành, nên khung nhìn đầu giống nhau ở 3 ngưỡng. `validate` kiểm tra thứ tự |
| C2 | SSR `/cart` gửi danh mục rút gọn thay vì cả file JSON (~3,5 MB ở ngưỡng 2000) xuống trình duyệt |
| C3 | `SHOW_ARCH_LABEL=0` ẩn nhãn CSR/SSR cho bản khảo sát 200 người (khảo sát mù) |
| C4 | Thẻ sản phẩm: nút "Thêm vào giỏ" không còn nằm trong thẻ `<a>` (HTML hợp lệ) |
| C5 | Favicon dùng chung 1 file SVG; xoá file thừa của template; ESLint 2 app chạy được |
| C6 | `scripts/measurement/smoke.mjs`: kiểm thử nghiệm thu tự động 45 tiêu chí, gồm so HTML `<main>` CSR = SSR |
| C7 | Biến môi trường build (`DATASET`, `SHOW_ARCH_LABEL`) đọc chung từ `packages/config/app-env.mjs`, có kiểm tra giá trị hợp lệ |

## Kết quả kiểm thử tại máy phát triển

- Build OK cả 2 app với DATASET = 20, 500, 2000; SHOW_ARCH_LABEL = 0, 1.
- `smoke.mjs`: đạt 100% tiêu chí ở mọi tổ hợp trên.
- HTML `<main>` của trang danh mục, chi tiết, 404 giống hệt từng ký tự giữa CSR và SSR.
- `run.mjs` thu đủ LCP, FCP, TBT, CLS, TTFB, INP cho cả 2 bản.

## D. Quyết định phạm vi (bám sát Thuyết minh đã nộp)

- **Trang danh mục:** hiển thị toàn bộ sản phẩm của ngưỡng, không phân trang (mục 12 Thuyết minh).
- **Xem theo ngành hàng:** giữ trên giao diện để người dùng duyệt sản phẩm, nhưng **không** nằm trong phạm vi đo và **không** nằm trong kịch bản khảo sát chấm điểm.
- **Kịch bản khảo sát UX** chỉ gồm 4 thao tác đã có số liệu kỹ thuật tương ứng (khớp mục 14.2: danh mục sản phẩm, chi tiết sản phẩm, thao tác giỏ hàng):
  1. Mở trang danh mục `/` (LCP, FCP, CLS, TTFB, TBT)
  2. Mở chi tiết một sản phẩm (cùng chỉ số, trang `/products/<id>`)
  3. Bấm "Thêm vào giỏ hàng" (INP)
  4. Mở giỏ hàng, sửa số lượng hoặc xoá sản phẩm (trang `/cart`, INP)
- **Lý do:** đảm bảo phân tích tương quan Web Vitals với UX (Công việc 3.4) so sánh cùng một tập thao tác.
