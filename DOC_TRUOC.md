# Bản cập nhật: triển khai lên VPS

1. Chép phần bên trong thư mục này đè vào `web-vitals`, chọn Replace.
2. Xoá file không còn dùng (bỏ Vercel):
   ```powershell
   Remove-Item apps\app-csr\vercel.json -ErrorAction SilentlyContinue
   ```
3. Làm theo `deploy/README.md`, từ Bước 1.

Thay đổi trong code: `apps/app-ssr/next.config.mjs` tắt nén riêng của Next.js (để Nginx nén cho cả hai bản cùng một mức) và bỏ header `x-powered-by`. Không cần `pnpm install` lại.
