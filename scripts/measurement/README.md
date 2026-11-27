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
| `--runs` | `10` | Số lượt lặp cho mỗi tổ hợp (profile × trang × kiến trúc). Không dùng dưới 10: với 5 lượt, sau hiệu chỉnh Holm không ô nào có thể đạt ý nghĩa thống kê |
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
| A | Lighthouse navigation, throttling `devtools` | LCP, FCP, **TBT**, CLS, Speed Index, điểm Performance; `SRT` (server-response-time, chỉ để tham khảo) |
| B | Playwright + thư viện `web-vitals` nhúng trong app | **INP** (bấm "Thêm vào giỏ" hoặc "+" 3 lần), **TTFB** theo định nghĩa Web Vitals (gồm DNS, kết nối, TLS, xử lý của server), kèm LCP/FCP/CLS thực đo (cột `wv_*`) |

Lighthouse navigation **không đo được INP** vì INP cần thao tác người dùng, nên phải có phần B.
Thứ tự CSR/SSR được đảo luân phiên mỗi lượt.

### Kết quả

`results/<thời-điểm>_ds<dataset>_<device>/`
- `results.csv`: từng lượt đo, dùng cho kiểm định thống kê
- `summary.csv`: trung vị theo (profile, trang, kiến trúc)
- `meta.json`: tham số chạy, URL, kết quả kiểm tra trước khi đo

Đơn vị: mili-giây cho LCP/FCP/TBT/TTFB/INP/SI/SRT, không đơn vị cho CLS.

Hai cột kiểm soát chất lượng trong `results.csv`:
- `ready`: `1` = trang đã render/hydrate xong (có LCP trong `window.__WEB_VITALS__`) trước khi bấm nút đo INP; `0` = hết 60 s vẫn chưa sẵn sàng → **loại lượt này khi phân tích INP** (bấm trước khi hydrate xong cho INP thấp giả tạo). Console in cảnh báo `ready=0`.
- `bench`: `benchmarkIndex` của Lighthouse (sức mạnh CPU máy đo). Đợt nào có giá trị lệch quá 10% so với trung vị cả đợt thì máy đo đã bị tải nặng → chạy lại.

**Đọc TBT:** Lighthouse chỉ tính TBT sau FCP. Ở bản CSR, phần lớn việc nặng (chạy JS, dựng giao diện) xảy ra *trước* FCP nên TBT có thể thấp trong khi FCP và LCP rất chậm. Luôn đọc TBT cùng FCP và LCP.

### Quy trình đề xuất cho 1 ngưỡng dữ liệu

1. Trên VPS: sửa `DATASET` trong `/etc/tqmart/deploy.env` → `deploy/deploy.sh --no-pull` (build lại cả 2 bản cùng ngưỡng).
2. `pnpm test --csr ... --ssr ...` → phải đạt 100%.
3. `pnpm measure --csr ... --ssr ... --dataset <n> --save-lhr` (mobile, 10 lượt), rồi thêm `--device desktop`.
4. Lặp lại cho 20 / 500 / 2000.

Nên chạy từ cùng 1 máy, cùng mạng, không chạy việc nặng khác song song. Ghi lại cấu hình máy vào báo cáo.

## Kịch bản mạng (`profiles.mjs`)

| Profile | Latency/request | Down | Up | Nguồn |
|---|---|---|---|---|
| `3g` | 1125 ms | 630 Kbps | 630 Kbps | Lighthouse `mobileRegular3G` |
| `4g` | 562.5 ms | 1474.56 Kbps | 675 Kbps | Lighthouse `mobileSlow4G` |
| `wifi` | 150 ms | 9216 Kbps | 9216 Kbps | Lighthouse `desktopDense4G` |

Nếu đề tài hoặc dịch vụ đo thuê ngoài quy định thông số khác, sửa trong `profiles.mjs` và ghi lại trong báo cáo.
