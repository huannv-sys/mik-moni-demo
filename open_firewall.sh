#!/bin/bash

# Kiểm tra quyền sudo
if [ "$EUID" -ne 0 ]; then
   echo "Hãy chạy script này với quyền sudo."
   echo "Hãy chạy: sudo $0"
   exit 1
fi

echo "===== Cấu hình tường lửa cho ứng dụng MikroTik Monitor ====="

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

# Tùy chọn: Mở cổng 443 (HTTPS) nếu cần
echo "Bạn có muốn mở cổng 443 (HTTPS) không? (y/n)"
read answer
if [ "$answer" != "${answer#[Yy]}" ]; then
    echo "Mở cổng 443 (HTTPS)..."
    ufw allow 443/tcp
fi

# Tùy chọn: Mở cổng 5001 để truy cập trực tiếp
echo "Bạn có muốn mở cổng 5001 để truy cập trực tiếp Gunicorn không? (y/n)"
read answer
if [ "$answer" != "${answer#[Yy]}" ]; then
    echo "Mở cổng 5001..."
    ufw allow 5001/tcp
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
if [ "$answer" != "${answer#[Yy]}" ]; then
    echo "  - HTTPS (cổng 443)"
fi
echo ""
echo "Bạn có thể truy cập ứng dụng từ trình duyệt web qua: http://[địa-chỉ-IP-server]"
echo ""