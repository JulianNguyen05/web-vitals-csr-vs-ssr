#!/usr/bin/env bash
# =============================================================================
# Cấu hình Nginx + chứng chỉ HTTPS cho 2 tên miền phụ. Chạy bằng root:
#     bash /srv/tqmart/deploy/install-nginx.sh
# Yêu cầu: DNS của CSR_HOST và SSR_HOST đã trỏ về IP của VPS.
# Chạy lại khi đổi tên miền hoặc sửa file trong deploy/nginx/.
# =============================================================================
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Hãy chạy bằng root"; exit 1; }
# shellcheck disable=SC1091
source /etc/tqmart/deploy.env
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

render() {
  sed -e "s#__CSR_HOST__#${CSR_HOST}#g" -e "s#__SSR_HOST__#${SSR_HOST}#g" -e "s#__APP_DIR__#${APP_DIR}#g" "$1"
}

echo "==> Kiểm tra DNS"
ip=$(curl -s4 https://ifconfig.me || true)
for h in "$CSR_HOST" "$SSR_HOST"; do
  r=$(getent ahostsv4 "$h" | awk 'NR==1{print $1}')
  echo "    $h → ${r:-(chưa có)}   (IP VPS: ${ip:-?})"
  [ -n "$r" ] || { echo "❌ $h chưa trỏ về VPS. Tạo bản ghi A rồi chờ vài phút."; exit 1; }
done

echo "==> Cấu hình cổng 80"
install -m 644 "$HERE/nginx/tqmart-common.conf" /etc/nginx/snippets/tqmart-common.conf
render "$HERE/nginx/tqmart-http.conf" > /etc/nginx/sites-available/tqmart-http.conf
ln -sf /etc/nginx/sites-available/tqmart-http.conf /etc/nginx/sites-enabled/tqmart-http.conf
nginx -t && systemctl reload nginx

if [ ! -f /etc/letsencrypt/live/tqmart/fullchain.pem ]; then
  echo "==> Xin chứng chỉ HTTPS (Let's Encrypt)"
  certbot certonly --webroot -w /var/www/certbot \
    -d "$CSR_HOST" -d "$SSR_HOST" --cert-name tqmart \
    -m "$CERT_EMAIL" --agree-tos -n \
    --deploy-hook "systemctl reload nginx"
else
  echo "==> Đã có chứng chỉ (tự gia hạn qua certbot.timer)"
fi

echo "==> Cấu hình HTTPS cho 2 bản"
render "$HERE/nginx/tqmart-https.conf" > /etc/nginx/sites-available/tqmart-https.conf
ln -sf /etc/nginx/sites-available/tqmart-https.conf /etc/nginx/sites-enabled/tqmart-https.conf
nginx -t && systemctl reload nginx

echo
echo "✔ Xong:  https://$CSR_HOST  (CSR)   https://$SSR_HOST  (SSR)"
