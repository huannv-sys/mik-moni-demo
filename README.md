<<<<<<< HEAD
# Hệ thống Giám sát MikroTik

Hệ thống giám sát thiết bị MikroTik sử dụng RouterOS API để thu thập và hiển thị dữ liệu từ các thiết bị mạng MikroTik.

## Tính năng

- Giám sát tài nguyên hệ thống (CPU, RAM, HDD)
- Theo dõi giao diện mạng và lưu lượng
- Quản lý địa chỉ IP và ARP
- Giám sát dịch vụ DHCP và quy tắc tường lửa
- Theo dõi khách hàng không dây
- Giám sát CAPsMAN (Quản lý Access Point tập trung)
- Thu thập và phân tích nhật ký hệ thống
- Cảnh báo khi phát hiện vấn đề
- Lịch sử dữ liệu và biểu đồ

## Yêu cầu hệ thống

- Python 3.8 hoặc mới hơn
- Thiết bị MikroTik chạy RouterOS v6.x hoặc mới hơn
- Kết nối mạng đến thiết bị MikroTik

## Cài đặt trên Ubuntu

### Cách 1: Sử dụng script cài đặt tự động

1. Tải file `install.sh`
2. Cấp quyền thực thi: `chmod +x install.sh`
3. Chạy script với quyền root: `sudo ./install.sh`

### Cách 2: Cài đặt thủ công

1. Cập nhật hệ thống
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Cài đặt các gói cần thiết
   ```bash
   sudo apt install -y python3 python3-pip python3-venv git nginx supervisor
   ```

3. Tạo thư mục cho ứng dụng
   ```bash
   sudo mkdir -p /opt/mikrotik-monitor
   ```

4. Tải mã nguồn
   ```bash
   git clone https://github.com/yourusername/mikrotik-monitor.git /tmp/mikrotik-monitor
   sudo cp -r /tmp/mikrotik-monitor/* /opt/mikrotik-monitor/
   ```

5. Tạo môi trường ảo Python
   ```bash
   cd /opt/mikrotik-monitor
   sudo python3 -m venv venv
   sudo source venv/bin/activate
   sudo pip install -r requirements.txt
   ```

6. Cấu hình Supervisor
   ```bash
   sudo nano /etc/supervisor/conf.d/mikrotik-monitor.conf
   ```
   
   Nội dung:
   ```
   [program:mikrotik-monitor]
   directory=/opt/mikrotik-monitor
   command=/opt/mikrotik-monitor/venv/bin/gunicorn -b 0.0.0.0:5000 main:app
   autostart=true
   autorestart=true
   stderr_logfile=/var/log/mikrotik-monitor.err.log
   stdout_logfile=/var/log/mikrotik-monitor.out.log
   ```

7. Cấu hình Nginx
   ```bash
   sudo nano /etc/nginx/sites-available/mikrotik-monitor
   ```
   
   Nội dung:
   ```
   server {
       listen 80;
       server_name _;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

8. Kích hoạt cấu hình
   ```bash
   sudo ln -s /etc/nginx/sites-available/mikrotik-monitor /etc/nginx/sites-enabled/
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo service nginx restart
   ```

## Cấu hình

Sau khi cài đặt, bạn cần cấu hình các thiết bị MikroTik trong tệp cấu hình:

1. Mở tệp cấu hình:
   ```bash
   sudo nano /opt/mikrotik-monitor/config.json
   ```

2. Thêm thiết bị MikroTik của bạn:
   ```json
   {
     "devices": [
       {
         "id": "unique-id-1",
         "name": "Router-1",
         "host": "192.168.1.1",
         "port": 8728,
         "username": "admin",
         "password": "your-password",
         "enabled": true,
         "use_ssl": false
       }
     ],
     "refresh_interval": 60,
     "thresholds": {
       "cpu_load": 80,
       "memory_usage": 80,
       "disk_usage": 80
     }
   }
   ```

3. Khởi động lại dịch vụ:
   ```bash
   sudo supervisorctl restart mikrotik-monitor
   ```

## Truy cập hệ thống

Sau khi cài đặt và cấu hình, bạn có thể truy cập hệ thống giám sát qua trình duyệt:

```
http://your-server-ip
```

## Xử lý sự cố

- Kiểm tra trạng thái dịch vụ:
  ```bash
  sudo supervisorctl status mikrotik-monitor
  ```

- Xem nhật ký:
  ```bash
  sudo tail -f /var/log/mikrotik-monitor.out.log
  ```

- Kiểm tra kết nối tới thiết bị MikroTik:
  ```bash
  telnet your-router-ip 8728
  ```

## Bảo mật

- Luôn sử dụng mật khẩu mạnh cho thiết bị MikroTik
- Cân nhắc sử dụng SSL khi kết nối đến thiết bị
- Hạn chế truy cập vào giao diện quản trị
- Đặt tường lửa để giới hạn truy cập

## Cập nhật

Để cập nhật hệ thống lên phiên bản mới nhất:

```bash
cd /opt/mikrotik-monitor
sudo git pull
sudo source venv/bin/activate
sudo pip install -r requirements.txt
sudo supervisorctl restart mikrotik-monitor
```

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT.
=======
# MIK-MONITOR-ang-ph-t-tri-n
>>>>>>> 9b7d38a09a50225a1fc9fa98076e7b3c68426456
