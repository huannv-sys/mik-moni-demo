#!/bin/bash

# Script để cập nhật chức năng logs của ứng dụng Mikrotik Monitor
# Dành cho hệ thống Ubuntu đã cài đặt ứng dụng

# Kiểm tra quyền root
if [ "$(id -u)" != "0" ]; then
   echo "Lỗi: Script này cần chạy với quyền root"
   echo "Hãy chạy: sudo $0"
   exit 1
fi

# Thiết lập biến
APP_DIR="/opt/mikrotik-monitor"
APP_USER="mikrotik"
APP_SERVICE="mikrotik-monitor"

echo "===== Bắt đầu cập nhật chức năng Logs của ứng dụng Mikrotik Monitor ====="
echo ""

# Kiểm tra thư mục ứng dụng
if [ ! -d "$APP_DIR" ]; then
    echo "Lỗi: Không tìm thấy thư mục ứng dụng $APP_DIR"
    echo "Vui lòng đảm bảo ứng dụng đã được cài đặt trước khi chạy script này."
    exit 1
fi

# Kiểm tra môi trường ảo Python
if [ ! -d "$APP_DIR/venv" ]; then
    echo "Lỗi: Không tìm thấy môi trường ảo Python trong $APP_DIR/venv"
    echo "Vui lòng đảm bảo ứng dụng đã được cài đặt đúng cách."
    exit 1
fi

# Kích hoạt môi trường ảo
echo "1. Kích hoạt môi trường ảo Python..."
cd $APP_DIR
source venv/bin/activate

# Cài đặt thư viện requests
echo "2. Cài đặt thư viện requests..."
pip install requests==2.31.0

# Kiểm tra cài đặt
if pip show requests > /dev/null; then
    echo "  => Thư viện requests đã được cài đặt thành công."
else
    echo "  => Lỗi: Không thể cài đặt thư viện requests."
    echo "     Vui lòng kiểm tra kết nối mạng và thử lại."
    exit 1
fi

# Tạo bản sao lưu tệp mikrotik.py
echo "3. Sao lưu tệp mikrotik.py..."
BACKUP_FILE="$APP_DIR/mikrotik.py.bak.$(date +%Y%m%d%H%M%S)"
cp $APP_DIR/mikrotik.py $BACKUP_FILE

echo "  => Đã tạo bản sao lưu tại $BACKUP_FILE"

# Khởi động lại dịch vụ
echo "4. Khởi động lại dịch vụ..."
systemctl restart supervisor

# Kiểm tra trạng thái
echo "5. Kiểm tra trạng thái dịch vụ..."
sleep 5
supervisorctl status $APP_SERVICE

echo ""
echo "===== Cập nhật hoàn tất ====="
echo "Chức năng Logs đã được cập nhật. Nếu vẫn gặp vấn đề, vui lòng thử những bước sau:"
echo ""
echo "1. Kiểm tra logs của ứng dụng:"
echo "   sudo tail -f /var/log/mikrotik-monitor/supervisor.err.log"
echo ""
echo "2. Khởi động lại toàn bộ dịch vụ:"
echo "   sudo supervisorctl restart $APP_SERVICE"
echo ""
echo "3. Khởi động lại Nginx:"
echo "   sudo systemctl restart nginx"
echo ""
echo "4. Nếu vẫn gặp lỗi, vui lòng khôi phục bản sao lưu:"
echo "   sudo cp $BACKUP_FILE $APP_DIR/mikrotik.py"
echo "   sudo supervisorctl restart $APP_SERVICE"