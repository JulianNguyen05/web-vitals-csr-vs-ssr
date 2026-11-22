# @repo/measurement: đo Web Vitals và kiểm thử nghiệm thu

Một bộ script dùng chung cho cả 2 phiên bản, chỉ khác tham số URL (SAD mục 5.1).

## Cài đặt (1 lần)

```powershell
pnpm install
pnpm --filter @repo/measurement run browsers    # tải Chromium cho Playwright
```

## 1. Kiểm thử nghiệm thu: `smoke.mjs`

```powershell
pnpm test --csr https://csr.<domain> --ssr https://ssr.<domain>
```

Kiểm tra từng tiêu chí trong SRS mục "Tiêu chí nghiệm thu" ở cả 2 bản:
- **UC01–UC04:** danh mục hiển thị đủ sản phẩm của ngưỡng, lọc ngành, chi tiết, thêm giỏ, cộng dồn, sửa số lượng, xoá.
- **Thông báo và 404:** "Chưa có sản phẩm nào", trang 404.
- **Giỏ hàng:** không gọi API.
- **Đo lường:** đủ 5 chỉ số web-vitals.
- **Hạ tầng:** mở thẳng URL `/cart` không lỗi.
- **Đồng nhất:** HTML `<main>` của CSR và SSR **giống hệt** ở trang danh mục, chi tiết, 404.

`--block-images` để chạy nhanh. `--headed` để xem trình duyệt.

## 2. Đo 6 chỉ số: `run.mjs`

```powershell
pnpm measure --csr https://csr.<domain> --ssr https://ssr.<domain> --dataset 2000 --runs 5
```

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--dataset` | `?` | Chỉ để ghi nhãn kết quả, **phải khớp DATASET đã deploy** |
| `--runs` | `5` | Số lượt lặp cho mỗi tổ hợp (profile × trang × kiến trúc) |
| `--profiles` | `3g,4g,wifi` | Kịch bản mạng, định nghĩa trong `profiles.mjs` |
| `--pages` | `list,detail,cart` | Trang đo: `/`, `/products/<product>`, `/cart` (có giỏ mẫu 1 sản phẩm) |
| `--device` | `mobile` | `mobile` (CPU ×4, 412×823) hoặc `desktop` (CPU ×1, 1350×940) |
| `--product` | `prod-101` | Sản phẩm dùng cho trang chi tiết và giỏ mẫu (có ở cả 3 ngưỡng) |
| `--warmup` | `1` | Số lần gọi thử trước mỗi profile, tránh đo nhầm cold start serverless |
| `--save-lhr` | tắt | Lưu báo cáo Lighthouse JSON đầy đủ từng lượt |
| `--skip-lighthouse` / `--skip-inp` | tắt | Bỏ 1 trong 2 phần đo |

### Mỗi lượt đo làm gì

Mỗi lượt chạy trên **trình duyệt mới** (hồ sơ trống, không cache):

| Phần | Công cụ | Chỉ số |
|---|---|---|
| A | Lighthouse navigation, throttling `devtools` | LCP, FCP, **TBT**, CLS, **TTFB** (`server-response-time`), Speed Index, điểm Performance |
| B | Playwright + thư viện `web-vitals` nhúng trong app | **INP** (bấm "Thêm vào giỏ" hoặc "+" 3 lần), kèm LCP/FCP/CLS/TTFB thực đo (cột `wv_*`) |

Lighthouse navigation **không đo được INP** vì INP cần thao tác người dùng, nên phải có phần B.
Thứ tự CSR/SSR được đảo luân phiên mỗi lượt.

### Kết quả

`results/<thời-điểm>_ds<dataset>_<device>/`
- `results.csv`: từng lượt đo, dùng cho kiểm định thống kê
- `summary.csv`: trung vị theo (profile, trang, kiến trúc)
- `meta.json`: tham số chạy, URL, kết quả kiểm tra trước khi đo

Đơn vị: mili-giây cho LCP/FCP/TBT/TTFB/INP/SI, không đơn vị cho CLS.

### Quy trình đề xuất cho 1 ngưỡng dữ liệu

1. Đặt `DATASET` giống nhau ở 2 project Vercel → Redeploy cả 2.
2. `pnpm test --csr ... --ssr ...` → phải đạt 100%.
3. `pnpm measure --csr ... --ssr ... --dataset <n> --runs 5` (mobile), rồi thêm `--device desktop`.
4. Lặp lại cho 20 / 500 / 2000.

Nên chạy từ cùng 1 máy, cùng mạng, không chạy việc nặng khác song song. Ghi lại cấu hình máy vào báo cáo.

## Kịch bản mạng (`profiles.mjs`)

| Profile | Latency/request | Down | Up | Nguồn |
|---|---|---|---|---|
| `3g` | 1125 ms | 630 Kbps | 630 Kbps | Lighthouse `mobileRegular3G` |
| `4g` | 562.5 ms | 1474.56 Kbps | 675 Kbps | Lighthouse `mobileSlow4G` |
| `wifi` | 150 ms | 9216 Kbps | 9216 Kbps | Lighthouse `desktopDense4G` |

Nếu đề tài hoặc dịch vụ đo thuê ngoài quy định thông số khác, sửa trong `profiles.mjs` và ghi lại trong báo cáo.
