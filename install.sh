#!/bin/bash

# Script cài đặt ứng dụng giám sát MikroTik
# Dành cho hệ thống Ubuntu
# Phiên bản dành cho ICTECH.VN

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
PYTHON_VERSION="3.8"
SOURCE_DIR="$(pwd)"

echo "===== Bắt đầu cài đặt Ứng dụng Giám sát MikroTik ====="
echo ""

# Cập nhật hệ thống
echo "1. Cập nhật hệ thống..."
apt update && apt upgrade -y

# Cài đặt các gói cần thiết
echo "2. Cài đặt các gói cần thiết..."
apt install -y python3 python3-pip python3-venv supervisor nginx wget unzip libpq-dev python3-dev

# Tạo người dùng hệ thống
echo "3. Tạo người dùng hệ thống cho ứng dụng..."
if id "$APP_USER" &>/dev/null; then
    echo "Người dùng $APP_USER đã tồn tại"
else
    useradd -m -r -s /bin/bash $APP_USER
    echo "Đã tạo người dùng $APP_USER"
fi

# Tạo thư mục ứng dụng
echo "4. Chuẩn bị thư mục ứng dụng..."
if [ -d "$APP_DIR" ]; then
    echo "Thư mục $APP_DIR đã tồn tại. Bạn có muốn xóa và cài đặt lại không? (y/n)"
    read answer
    if [ "$answer" != "${answer#[Yy]}" ]; then
        rm -rf $APP_DIR
    else
        echo "Đã hủy cài đặt."
        exit 1
    fi
fi

# Tạo thư mục ứng dụng
mkdir -p $APP_DIR

# Sao chép hoặc tải mã nguồn vào thư mục ứng dụng
echo "5. Cài đặt mã nguồn ứng dụng..."

# Kiểm tra có tập tin zip trong thư mục hiện tại không
if ls ./*.zip >/dev/null 2>&1; then
    # Sử dụng tập tin ZIP có sẵn
    ZIP_FILE=$(ls ./*.zip | head -n 1)
    echo "Phát hiện file nén: $ZIP_FILE"
    echo "Giải nén từ file..."
    
    TEMP_DIR=$(mktemp -d)
    unzip -q "$ZIP_FILE" -d "$TEMP_DIR"
    
    # Nếu giải nén tạo ra một thư mục con duy nhất, sử dụng nội dung thư mục đó
    SUB_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [ -n "$SUB_DIR" ]; then
        cp -r "$SUB_DIR"/* $APP_DIR/
    else
        cp -r "$TEMP_DIR"/* $APP_DIR/
    fi
    
    rm -rf "$TEMP_DIR"
else
    # Sao chép từ thư mục hiện tại
    echo "Sao chép mã nguồn từ thư mục hiện tại..."
    cp -r "$SOURCE_DIR"/* $APP_DIR/
fi

# Thiết lập môi trường ảo Python
echo "6. Thiết lập môi trường Python..."
cd $APP_DIR
python3 -m venv venv
source venv/bin/activate

# Cài đặt các phụ thuộc
echo "7. Cài đặt các phụ thuộc Python..."
pip install --upgrade pip

# Sao chép hoặc tạo file requirements.txt
if [ -f "$SOURCE_DIR/project_requirements.txt" ]; then
    cp "$SOURCE_DIR/project_requirements.txt" "$APP_DIR/requirements.txt"
    echo "Sử dụng file project_requirements.txt từ thư mục nguồn"
elif [ ! -f "$APP_DIR/requirements.txt" ]; then
    echo "Tạo file requirements.txt mới..."
    cat > "$APP_DIR/requirements.txt" << EOL
apscheduler==3.10.1
email-validator==2.0.0
flask==2.3.3
flask-sqlalchemy==3.0.5
gunicorn==21.2.0
psycopg2-binary==2.9.7
routeros-api==0.17.0
requests==2.31.0
EOL
fi

# Cài đặt các gói từ requirements.txt
pip install -r "$APP_DIR/requirements.txt"

# Cấu hình quyền sở hữu
echo "8. Cấu hình quyền truy cập..."
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR

# Xóa các thiết bị demo và sử dụng cấu hình mặc định sạch
echo "8.1. Đặt lại cấu hình mặc định không có thiết bị demo..."
if [ -f "$APP_DIR/clean_devices.py" ]; then
    cd "$APP_DIR"
    python3 clean_devices.py --reset
    echo "Đã đặt lại cấu hình sử dụng clean_devices.py"
elif [ -f "$APP_DIR/default_config.json" ]; then
    cp "$APP_DIR/default_config.json" "$APP_DIR/config.json"
    echo "Đã sử dụng cấu hình mặc định sạch từ default_config.json"
else
    # Tạo cấu hình mặc định sạch
    cat > "$APP_DIR/config.json" << EOL
{
  "sites": [
    {
      "id": "default",
      "name": "ICTECH.VN",
      "description": "Site mặc định dành cho ICTECH.VN",
      "location": "",
      "contact": "",
      "enabled": true
    }
  ],
  "devices": [],
  "refresh_interval": 60,
  "interface_history_points": 288,
  "system_history_points": 288,
  "thresholds": {
    "cpu_load": 80,
    "memory_usage": 80,
    "disk_usage": 80,
    "interface_usage": 80
  },
  "use_ssl": true,
  "connection_timeout": 10,
  "connection_retries": 2,
  "retry_delay": 1
}
EOL
    echo "Đã tạo file cấu hình mặc định mới không có thiết bị demo"
fi

# Tạo tệp cấu hình Gunicorn
echo "9. Tạo cấu hình Gunicorn..."
cat > $APP_DIR/gunicorn_config.py << EOL
bind = "0.0.0.0:5001"
workers = 3
timeout = 120
accesslog = "/var/log/mikrotik-monitor/access.log"
errorlog = "/var/log/mikrotik-monitor/error.log"
loglevel = "info"
EOL

# Tạo thư mục nhật ký
mkdir -p /var/log/mikrotik-monitor
chown -R $APP_USER:$APP_USER /var/log/mikrotik-monitor

# Tạo tệp cấu hình Supervisor
echo "10. Tạo cấu hình Supervisor..."
cat > /etc/supervisor/conf.d/$APP_SERVICE.conf << EOL
[program:$APP_SERVICE]
directory=$APP_DIR
command=$APP_DIR/venv/bin/gunicorn -c gunicorn_config.py main:app
user=$APP_USER
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/mikrotik-monitor/supervisor.err.log
stdout_logfile=/var/log/mikrotik-monitor/supervisor.out.log
environment=PATH="$APP_DIR/venv/bin"
EOL

# Tạo tệp cấu hình Nginx
echo "11. Tạo cấu hình Nginx..."
cat > /etc/nginx/sites-available/$APP_SERVICE << EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /static {
        alias $APP_DIR/static;
    }
}
EOL

# Kích hoạt cấu hình Nginx
ln -sf /etc/nginx/sites-available/$APP_SERVICE /etc/nginx/sites-enabled/

# Kiểm tra cấu hình Nginx
nginx -t

# Khởi động lại dịch vụ
echo "12. Khởi động dịch vụ..."
systemctl restart supervisor
systemctl restart nginx

# Kiểm tra trạng thái
echo "13. Kiểm tra trạng thái dịch vụ..."
sleep 5
supervisorctl status $APP_SERVICE

# Cấu hình tường lửa tự động
echo "14. Cấu hình tường lửa..."
if [ -f "$APP_DIR/open_firewall.sh" ]; then
    echo "Thực thi script cấu hình tường lửa..."
    chmod +x "$APP_DIR/open_firewall.sh"
    bash "$APP_DIR/open_firewall.sh"
else
    echo "Không tìm thấy script cấu hình tường lửa. Bỏ qua bước này."
    echo "Bạn có thể chạy thủ công script later bằng cách: sudo $APP_DIR/open_firewall.sh"
fi

echo ""
echo "===== Cài đặt hoàn tất ====="
echo "Ứng dụng giám sát MikroTik đã được cài đặt tại $APP_DIR"
echo "Truy cập ứng dụng qua: http://your-server-ip"
echo ""
echo "Một số lệnh hữu ích:"
echo "  - Kiểm tra trạng thái:   sudo supervisorctl status $APP_SERVICE"
echo "  - Khởi động dịch vụ:     sudo supervisorctl start $APP_SERVICE"
echo "  - Dừng dịch vụ:          sudo supervisorctl stop $APP_SERVICE"
echo "  - Khởi động lại dịch vụ: sudo supervisorctl restart $APP_SERVICE"
echo "  - Xem nhật ký:           sudo tail -f /var/log/mikrotik-monitor/supervisor.out.log"
echo ""
echo "Lưu ý: Bạn có thể cần cấu hình tệp config.json để thêm thiết bị MikroTik của bạn"
echo "Vị trí tệp cấu hình: $APP_DIR/config.json"