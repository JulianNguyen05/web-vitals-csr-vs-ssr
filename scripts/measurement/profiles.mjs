// Cấu hình mạng + thiết bị cho các kịch bản đo. Sửa ở đây là áp dụng cho cả Lighthouse lẫn Playwright.
//
// Giá trị mạng lấy theo hằng số throttling "devtools" của Lighthouse
// (lighthouse-core/config/constants.js): requestLatencyMs = RTT × 3.75, throughput × 0.9.
//   3g   = mobileRegular3G   (RTT 300 ms, 700 Kbps)
//   4g   = mobileSlow4G      (RTT 150 ms, 1.6 Mbps)  — mặc định "Slow 4G" của Lighthouse mobile
//   wifi = desktopDense4G    (RTT 40 ms, 10 Mbps)    — mặc định của Lighthouse desktop
// Nếu đề tài quy định thông số khác (ví dụ theo dịch vụ thuê ngoài), sửa trực tiếp các số dưới đây
// và ghi lại trong báo cáo.

export const NETWORK_PROFILES = {
  "3g": { requestLatencyMs: 1125, downloadThroughputKbps: 630, uploadThroughputKbps: 630 },
  "4g": { requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
  wifi: { requestLatencyMs: 150, downloadThroughputKbps: 9216, uploadThroughputKbps: 9216 },
};

// Thiết bị: CPU slowdown theo thiết bị (không theo mạng), màn hình giống Lighthouse.
export const DEVICES = {
  mobile: {
    cpuSlowdownMultiplier: 4,
    screen: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    userAgent:
      "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  },
  desktop: {
    cpuSlowdownMultiplier: 1,
    screen: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  },
};

// Các trang được đo. {product} được thay bằng --product (mặc định prod-101, có ở cả 3 ngưỡng).
export const PAGES = {
  list: { path: "/", interaction: "list" },
  detail: { path: "/products/{product}", interaction: "detail" },
  cart: { path: "/cart", interaction: "cart", seedCart: true },
};
