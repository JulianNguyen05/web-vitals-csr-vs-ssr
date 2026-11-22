#!/usr/bin/env bash
# =============================================================================
# Build + đưa CẢ HAI bản lên chạy. Chạy bằng user deploy:   bash /srv/tqmart/deploy/deploy.sh
# Đọc DATASET, SHOW_ARCH_LABEL từ /etc/tqmart/deploy.env → hai bản luôn cùng ngưỡng dữ liệu.
#   --no-pull   build lại bản hiện có, không git pull (dùng khi chỉ đổi DATASET)
# =============================================================================
set -euo pipefail
ENV_FILE=/etc/tqmart/deploy.env
[ -f "$ENV_FILE" ] || { echo "Thiếu $ENV_FILE — chạy setup-server.sh trước"; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"
[ "$(id -un)" != "root" ] || { echo "Chạy bằng user deploy, không dùng root"; exit 1; }

cd "$APP_DIR"
if [ "${1:-}" != "--no-pull" ]; then
  echo "==> git pull ($BRANCH)"
  git fetch --quiet origin
  git checkout --quiet "$BRANCH"
  git pull --ff-only --quiet origin "$BRANCH"
fi
echo "    commit: $(git log -1 --format='%h %s')"

echo "==> Cài thư viện (chỉ 2 app và các package chúng dùng)"
# --ignore-scripts: bỏ các script cài đặt của thư viện xử lý ảnh trong packages/data
# (onnxruntime, sharp…) — hai web không dùng tới, tránh tải thêm vài trăm MB.
pnpm install --frozen-lockfile --ignore-scripts --filter "app-csr..." --filter "app-ssr..."

export DATASET SHOW_ARCH_LABEL NODE_ENV=production
echo "==> Build CSR + SSR với DATASET=$DATASET SHOW_ARCH_LABEL=$SHOW_ARCH_LABEL"
pnpm --filter app-csr run build
pnpm --filter app-ssr run build

echo "==> Đưa bản CSR vào /var/www/tqmart-csr"
rsync -a --delete apps/app-csr/dist/ /var/www/tqmart-csr/

echo "==> Khởi động lại bản SSR (pm2)"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save --force >/dev/null

echo "==> Kiểm tra nhanh"
for i in $(seq 1 30); do
  curl -sf -o /dev/null http://127.0.0.1:3001/ && break
  sleep 1
done
ssr_count=$(curl -s http://127.0.0.1:3001/ | grep -o 'text-sm text-muted">[0-9.]*' | head -1 | grep -o '[0-9.]*$' || true)
echo "    SSR đang hiển thị: ${ssr_count:-?} sản phẩm (kỳ vọng $DATASET)"
[ "${ssr_count//./}" = "$DATASET" ] || echo "⚠️  Số sản phẩm SSR không khớp DATASET — kiểm tra lại log build."
echo
echo "✔ Đã deploy DATASET=$DATASET. Kiểm tra từ máy bạn:"
echo "  pnpm test --csr https://$CSR_HOST --ssr https://$SSR_HOST"
