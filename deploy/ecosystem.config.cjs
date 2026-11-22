// pm2: giữ bản SSR (next start) luôn chạy, tự khởi động lại khi lỗi hoặc khi VPS reboot.
// Chỉ lắng nghe 127.0.0.1:3001 — truy cập từ ngoài đi qua Nginx (HTTPS, nén, HTTP/2 giống bản CSR).
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "tqmart-ssr",
      cwd: path.resolve(__dirname, "../apps/app-ssr"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001 -H 127.0.0.1",
      exec_mode: "fork", // 1 tiến trình: cấu hình máy chủ cố định trong suốt đợt đo
      instances: 1,
      env: { NODE_ENV: "production" },
      max_memory_restart: "1500M",
      time: true,
    },
  ],
};
