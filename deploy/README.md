# Triển khai lên VPS: T&Q Mart (CSR + SSR trên cùng một máy chủ)

```
                        ┌──────────────────── VPS Ubuntu 24.04 ────────────────────┐
trình duyệt ──HTTPS──▶  │  Nginx (TLS, HTTP/2, gzip — cấu hình CHUNG cho 2 bản)     │
                        │   ├─ a.tqmart-lab.com → /var/www/tqmart-csr (file tĩnh)  │
                        │   └─ b.tqmart-lab.com → 127.0.0.1:3001 (Next.js, pm2)    │
                        └──────────────────────────────────────────────────────────┘
ảnh sản phẩm ──────────▶  Cloudflare R2 (img.tqmart-lab.com) — dùng chung cho 2 bản
```

Hai bản chạy trên **cùng một máy**, qua **cùng một Nginx**, cùng chứng chỉ HTTPS, cùng mức nén. Khác biệt duy nhất là cách render. Tên miền phụ `a` và `b` được đặt trung tính để người tham gia khảo sát không đoán được kiến trúc. Bảng đối chiếu `a` = CSR, `b` = SSR chỉ ghi trong báo cáo.

| File | Việc |
|---|---|
| `setup-server.sh` | Cài máy chủ lần đầu (root) |
| `deploy.sh` | Build và chạy cả hai bản (user `deploy`), chạy lại mỗi lần cập nhật code hoặc đổi ngưỡng |
| `install-nginx.sh` | Cấu hình Nginx và xin chứng chỉ HTTPS (root) |
| `ecosystem.config.cjs` | pm2 giữ bản SSR luôn chạy |
| `nginx/` | Mẫu cấu hình Nginx |
| `deploy.env.example` | Mẫu `/etc/tqmart/deploy.env` (tên miền, DATASET, SHOW_ARCH_LABEL) |

Lệnh có `PS>` chạy trên **máy Windows của bạn** (PowerShell). Lệnh có `#` chạy trên VPS bằng **root**. Lệnh có `$` chạy trên VPS bằng **user deploy**.

---

## Bước 1: Tạo bản ghi DNS

Ở trang quản lý tên miền `tqmart-lab.com` (nút **Bản ghi**), hoặc ở Cloudflare nếu đã chuyển DNS sang đó, tạo:

| Loại | Tên | Giá trị | Ghi chú |
|---|---|---|---|
| A | `a` | `202.92.4.114` | Nếu dùng Cloudflare: **DNS only (mây xám)** |
| A | `b` | `202.92.4.114` | Nếu dùng Cloudflare: **DNS only (mây xám)** |

Kiểm tra sau vài phút:

```powershell
PS> nslookup a.tqmart-lab.com
PS> nslookup b.tqmart-lab.com
```

Cả hai phải trả về `202.92.4.114`.

## Bước 2: Đưa repo lên GitHub

```powershell
PS> cd D:\2025_2026_II\NCKH\SSR_VS_CSR\web-vitals
PS> git add -A; git commit -m "Bo trien khai VPS"; git push
```

## Bước 3: Cài máy chủ (1 lần)

Chép thư mục `deploy` lên VPS rồi đăng nhập:

```powershell
PS> scp -r deploy root@202.92.4.114:/root/
PS> ssh root@202.92.4.114
```

Trên VPS:

```bash
# passwd                                   # đổi mật khẩu root nhà cung cấp gửi
# sed -i 's/\r$//' /root/deploy/*.sh /root/deploy/*.example   # bỏ ký tự xuống dòng kiểu Windows (nếu có)
# bash /root/deploy/setup-server.sh        # khoảng 3–5 phút
# nano /etc/tqmart/deploy.env              # sửa CERT_EMAIL; kiểm tra BRANCH (main hay master)
```

## Bước 4: Lấy mã nguồn về VPS (1 lần)

```bash
# su - deploy
$ ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
$ cat ~/.ssh/id_ed25519.pub
```

Copy dòng vừa in ra. Trên GitHub, vào repo → **Settings → Deploy keys → Add deploy key**, dán vào, **không** tick "Allow write access". Sau đó:

```bash
$ git clone git@github.com:<tai-khoan>/<ten-repo>.git /srv/tqmart
```

Nếu repo để public, có thể clone bằng `https://github.com/<tai-khoan>/<ten-repo>.git` mà không cần deploy key.

## Bước 5: Build và chạy hai bản

```bash
$ bash /srv/tqmart/deploy/deploy.sh --no-pull
```

Ở ngưỡng 2000, script chạy khoảng 5–8 phút. Cuối cùng phải thấy dòng `SSR đang hiển thị: 2.000 sản phẩm`.

## Bước 6: Nginx và HTTPS

```bash
$ exit                                        # về lại root
# bash /srv/tqmart/deploy/install-nginx.sh
# env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy   # bản SSR tự chạy khi VPS khởi động lại
```

## Bước 7: Kiểm thử từ máy bạn

```powershell
PS> pnpm test --csr https://a.tqmart-lab.com --ssr https://b.tqmart-lab.com
```

Phải đạt **45/45**. Đạt rồi thì vào trang quản lý VPS **tạo 1 Snapshot**, để sau này hỏng gì cũng khôi phục được đúng cấu hình đã kiểm thử.

---

## Công việc thường gặp

**Đổi ngưỡng dữ liệu** (ví dụ sang 500):

```bash
# nano /etc/tqmart/deploy.env                  # DATASET=500
# su - deploy -c "bash /srv/tqmart/deploy/deploy.sh --no-pull"
```

Sau đó chạy lại `pnpm test` từ máy bạn trước khi đo.

**Cập nhật code** sau khi push lên GitHub:

```bash
# su - deploy -c "bash /srv/tqmart/deploy/deploy.sh"
```

**Bản dùng cho khảo sát** (ẩn nhãn CSR/SSR): sửa `SHOW_ARCH_LABEL=0` trong `/etc/tqmart/deploy.env`, rồi chạy `deploy.sh --no-pull`.

**Xem log và trạng thái:**

```bash
# su - deploy -c "pm2 status"
# su - deploy -c "pm2 logs tqmart-ssr --lines 50"
# tail -f /var/log/nginx/tqmart.access.log
```

## Lưu ý về phương pháp đo

- **Nén:** Nginx nén cho cả hai bản cùng một mức. Next.js đã tắt nén riêng (`compress: false`).
- **File JS/CSS tĩnh:** của cả hai bản đều do Nginx phục vụ trực tiếp, với cùng header cache. Bản SSR chỉ đi qua Node.js đối với phần HTML.
- **Stream:** `proxy_buffering off` giúp HTML của bản SSR được stream thẳng tới trình duyệt, không bị Nginx gom lại.
- **pm2:** chạy 1 tiến trình duy nhất, cố định trong suốt đợt đo.
- **Khởi động lại máy:** VPS không tự khởi động lại khi cập nhật bảo mật, tránh gián đoạn giữa đợt đo.
- **Ghi vào báo cáo:** cấu hình VPS (2 vCPU, 4 GB RAM, Ubuntu 24.04, Nginx 1.24, Node.js 22), vị trí máy chủ, và thời điểm đo.
