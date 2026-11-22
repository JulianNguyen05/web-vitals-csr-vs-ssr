# Hướng dẫn cập nhật bản sửa lỗi (web-vitals)

Gói này chứa **54 file code** đã sửa/thêm mới (cộng 2 file hướng dẫn), giữ nguyên cấu trúc thư mục. **Không** chứa dữ liệu JSON, ảnh, `pnpm-lock.yaml`, `.env`.

## Bước 1: Sao lưu

```powershell
cd D:\2025_2026_II\NCKH\SSR_VS_CSR\web-vitals
git add -A; git commit -m "Truoc khi cap nhat ban sua loi"   # hoặc copy cả thư mục ra chỗ khác
```

## Bước 2: Giải nén đè

Giải nén file zip vào thư mục gốc `web-vitals`, chọn **Replace** cho tất cả file trùng tên.

## Bước 3: Xoá file cũ không còn dùng

```powershell
Remove-Item apps\app-ssr\eslint.config.mjs, apps\app-ssr\src\app\favicon.ico, apps\app-csr\public\icons.svg, apps\app-csr\src\assets\vite.svg -ErrorAction SilentlyContinue
Remove-Item apps\app-ssr\.next -Recurse -Force -ErrorAction SilentlyContinue
```

`favicon.ico` của SSR phải xoá, vì Next sẽ ưu tiên nó hơn `icon.svg` mới. Khi đó favicon hai bản lại khác nhau.

## Bước 4: Cài lại và sắp xếp lại dữ liệu

```powershell
pnpm install
pnpm --filter @repo/measurement run browsers        # tải Chromium cho script đo (1 lần)
cd packages\data
pnpm merge                                    # 20 sp đầu của 500/2000 trùng products-20
pnpm validate                                 # phải báo "trùng products-20 ✔"
cd ..\..
```

## Bước 5: Build và kiểm thử ở máy

```powershell
$env:DATASET="2000"; pnpm build
# mở 2 cửa sổ PowerShell:
pnpm start:csr          # http://localhost:5180
pnpm start:ssr          # http://localhost:3001
# cửa sổ thứ 3:
pnpm test --csr http://localhost:5180 --ssr http://localhost:3001
```

Kết quả mong đợi: `45/45 tiêu chí đạt`.

## Bước 6: Deploy

Làm theo mục "Triển khai lên Vercel" trong `README.md`. Lưu ý:
- File `apps/app-csr/vercel.json` mới là bắt buộc.
- Đặt `DATASET` / `SHOW_ARCH_LABEL` giống nhau ở cả 2 project.

Sau khi deploy:

```powershell
pnpm test --csr https://csr.<domain> --ssr https://ssr.<domain>
pnpm measure --csr https://csr.<domain> --ssr https://ssr.<domain> --dataset 2000 --runs 5
```
