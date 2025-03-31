#!/bin/bash

# Kiểm tra quyền sudo
if [ "$EUID" -ne 0 ]; then
   echo "Hãy chạy script này với quyền sudo."
   echo "Hãy chạy: sudo $0"
   exit 1
fi

# Thiết lập biến
APP_DIR="/opt/mikrotik-monitor"
APP_USER="mikrotik"
APP_SERVICE="mikrotik-monitor"

echo "===== Bắt đầu gỡ bỏ Ứng dụng Giám sát MikroTik ====="
echo ""

# Dừng dịch vụ
echo "1. Dừng dịch vụ..."
if systemctl is-active --quiet supervisor; then
    supervisorctl stop $APP_SERVICE
fi

# Xóa cấu hình Supervisor
echo "2. Xóa cấu hình Supervisor..."
if [ -f "/etc/supervisor/conf.d/$APP_SERVICE.conf" ]; then
    rm -f /etc/supervisor/conf.d/$APP_SERVICE.conf
    systemctl restart supervisor
fi

# Xóa cấu hình Nginx
echo "3. Xóa cấu hình Nginx..."
if [ -f "/etc/nginx/sites-available/$APP_SERVICE" ]; then
    rm -f /etc/nginx/sites-available/$APP_SERVICE
fi

if [ -L "/etc/nginx/sites-enabled/$APP_SERVICE" ]; then
    rm -f /etc/nginx/sites-enabled/$APP_SERVICE
    systemctl restart nginx
fi

# Xóa thư mục ứng dụng
echo "4. Xóa thư mục ứng dụng..."
if [ -d "$APP_DIR" ]; then
    rm -rf $APP_DIR
fi

# Xóa thư mục nhật ký
echo "5. Xóa thư mục nhật ký..."
if [ -d "/var/log/mikrotik-monitor" ]; then
    rm -rf /var/log/mikrotik-monitor
fi

# Xóa người dùng hệ thống (tùy chọn)
echo "6. Bạn có muốn xóa người dùng hệ thống $APP_USER? (y/n)"
read answer
if [ "$answer" != "${answer#[Yy]}" ]; then
    if id "$APP_USER" &>/dev/null; then
        userdel -r $APP_USER
        echo "Đã xóa người dùng $APP_USER"
    else
        echo "Người dùng $APP_USER không tồn tại"
    fi
else
    echo "Giữ lại người dùng $APP_USER"
fi

echo ""
echo "===== Gỡ bỏ hoàn tất ====="
echo "Ứng dụng giám sát MikroTik đã được gỡ bỏ hoàn toàn khỏi hệ thống."
echo "Bạn có thể cài đặt lại ứng dụng bằng script install.sh."
echo ""