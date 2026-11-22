#!/usr/bin/env bash
# =============================================================================
# Cài đặt VPS lần đầu (Ubuntu 24.04 sạch). Chạy bằng root:   bash setup-server.sh
# Làm: múi giờ, cập nhật, Nginx, Certbot, Node.js 22, pnpm 12.4.2, pm2, user "deploy",
#      tường lửa, swap 2 GB, thư mục web. Chạy lại nhiều lần không sao.
# =============================================================================
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Hãy chạy bằng root"; exit 1; }

PNPM_VERSION=12.4.2
NODE_MAJOR=22
DEPLOY_USER=deploy
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Múi giờ Việt Nam"
timedatectl set-timezone Asia/Ho_Chi_Minh || true

echo "==> Cập nhật hệ thống"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get -y -q upgrade
apt-get -y -q install nginx certbot git curl rsync ufw fail2ban ca-certificates gnupg

echo "==> Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || ! node -v | grep -q "^v${NODE_MAJOR}\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get -y -q install nodejs
fi
node -v

echo "==> pnpm ${PNPM_VERSION} + pm2"
npm install -g "pnpm@${PNPM_VERSION}" pm2
pnpm -v

echo "==> User ${DEPLOY_USER}"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
# Cho phép đăng nhập user deploy bằng cùng SSH key với root (nếu root đang dùng key).
if [ -f /root/.ssh/authorized_keys ]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

echo "==> Thư mục"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/tqmart /var/www/tqmart-csr
install -d -m 755 /var/www/certbot /etc/tqmart
if [ ! -f /etc/tqmart/deploy.env ]; then
  install -m 644 "$HERE/deploy.env.example" /etc/tqmart/deploy.env
  echo "   Đã tạo /etc/tqmart/deploy.env — NHỚ sửa CERT_EMAIL (và tên miền nếu khác)."
fi

echo "==> Swap 2 GB (dự phòng khi build Next.js)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Tường lửa: chỉ mở SSH, HTTP, HTTPS"
# Mở ĐÚNG cổng SSH đang dùng (nhiều nhà cung cấp không dùng cổng 22) để không tự khoá mình ngoài VPS.
SSH_PORTS=$( { echo "${SSH_CONNECTION:-}" | awk 'NF==4{print $4}';
               ss -tlnpH 2>/dev/null | awk '/sshd/{n=split($4,a,":"); print a[n]}'; } | grep -E '^[0-9]+$' | sort -u )
[ -n "$SSH_PORTS" ] || SSH_PORTS=22
for p in $SSH_PORTS; do
  echo "    mở cổng SSH $p"
  ufw allow "$p/tcp"
done
ufw allow 'Nginx Full'
ufw --force enable
ufw status | sed 's/^/    /'

echo "==> Không tự khởi động lại máy khi cập nhật bảo mật (tránh gián đoạn đợt đo)"
if [ -f /etc/apt/apt.conf.d/50unattended-upgrades ]; then
  sed -i 's#^//\?\s*Unattended-Upgrade::Automatic-Reboot .*#Unattended-Upgrade::Automatic-Reboot "false";#' /etc/apt/apt.conf.d/50unattended-upgrades
fi

echo "==> Nginx: bỏ site mặc định"
rm -f /etc/nginx/sites-enabled/default
systemctl enable --now nginx fail2ban

echo
echo "✔ Xong. Bước tiếp theo (xem deploy/README.md):"
echo "  1. nano /etc/tqmart/deploy.env      (sửa CERT_EMAIL)"
echo "  2. su - ${DEPLOY_USER}               rồi clone repo vào /srv/tqmart và chạy deploy/deploy.sh"
