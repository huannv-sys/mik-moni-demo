#!/bin/bash

# Script cấu hình tường lửa tự động cho ứng dụng MikroTik Monitor
# Phiên bản dành cho ICTECH.VN

# Kiểm tra quyền sudo
if [ "$EUID" -ne 0 ]; then
   echo "Hãy chạy script này với quyền sudo."
   echo "Hãy chạy: sudo $0"
   exit 1
fi

echo "===== Cấu hình tường lửa cho ứng dụng MikroTik Monitor ====="

# Xử lý các tham số dòng lệnh
ENABLE_HTTPS=true
ENABLE_GUNICORN=false
ENABLE_MIKROTIK_API=true

# Xử lý các đối số dòng lệnh
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-https)
      ENABLE_HTTPS=false
      shift
      ;;
    --enable-gunicorn)
      ENABLE_GUNICORN=true
      shift
      ;;
    --no-mikrotik-api)
      ENABLE_MIKROTIK_API=false
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Kiểm tra UFW đã được cài đặt chưa
if ! command -v ufw &> /dev/null; then
    echo "Cài đặt UFW (Uncomplicated Firewall)..."
    apt-get update
    apt-get install -y ufw
fi

# Kiểm tra trạng thái UFW
echo "Kiểm tra trạng thái UFW..."
ufw status

# Đảm bảo SSH được mở trước khi bật tường lửa
echo "Cho phép kết nối SSH..."
ufw allow ssh

# Mở cổng 80 (HTTP)
echo "Mở cổng 80 (HTTP)..."
ufw allow 80/tcp

# Mở cổng 443 (HTTPS) nếu cần
if [ "$ENABLE_HTTPS" = true ]; then
    echo "Mở cổng 443 (HTTPS)..."
    ufw allow 443/tcp
fi

# Mở cổng 5001 để truy cập trực tiếp Gunicorn
if [ "$ENABLE_GUNICORN" = true ]; then
    echo "Mở cổng 5001 (Gunicorn)..."
    ufw allow 5001/tcp
fi

# Mở cổng cho API MikroTik
if [ "$ENABLE_MIKROTIK_API" = true ]; then
    echo "Mở cổng 8728 và 8729 cho API MikroTik..."
    ufw allow 8728/tcp
    ufw allow 8729/tcp
fi

# Bật UFW nếu chưa được bật
if ! ufw status | grep -q "Status: active"; then
    echo "Bật UFW..."
    echo "y" | ufw enable
fi

echo "Cập nhật trạng thái tường lửa:"
ufw status

echo ""
echo "===== Cấu hình tường lửa hoàn tất ====="
echo "Các cổng đã được mở:"
echo "  - SSH (thường là cổng 22)"
echo "  - HTTP (cổng 80)"

if [ "$ENABLE_HTTPS" = true ]; then
    echo "  - HTTPS (cổng 443)"
fi

if [ "$ENABLE_GUNICORN" = true ]; then
    echo "  - Gunicorn (cổng 5001)"
fi

if [ "$ENABLE_MIKROTIK_API" = true ]; then
    echo "  - MikroTik API (cổng 8728, 8729)"
fi

echo ""
echo "Bạn có thể truy cập ứng dụng từ trình duyệt web qua: http://[địa-chỉ-IP-server]"
echo ""