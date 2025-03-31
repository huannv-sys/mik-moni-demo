huannv@huannv:~/MikrotikMonitor$ ls
app.py        generated-icon.png      main.py         README.md     static
config.json   install.sh              mikrotik.py     replit.nix    templates
config.py     mac_vendor.py           models.py       routes        uv.lock
discovery.py  mac_vendors_cache.json  pyproject.toml  scheduler.py
huannv@huannv:~/MikrotikMonitor$ sudo chmod +x install.sh
[sudo] password for huannv:
huannv@huannv:~/MikrotikMonitor$ sudo ./install.sh
===== Bắt đầu cài đặt Ứng dụng Giám sát MikroTik =====

1. Cập nhật hệ thống...
Hit:1 http://vn.archive.ubuntu.com/ubuntu noble InRelease
Get:2 http://vn.archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]
Hit:3 https://download.docker.com/linux/ubuntu noble InRelease
Hit:4 https://deb.nodesource.com/node_20.x nodistro InRelease
Get:5 http://vn.archive.ubuntu.com/ubuntu noble-backports InRelease [126 kB]
Hit:6 https://packages.wazuh.com/4.x/apt stable InRelease
Get:7 http://download.zerotier.com/debian/noble noble InRelease [20.5 kB]
Get:8 http://vn.archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [960 kB]
Get:9 http://vn.archive.ubuntu.com/ubuntu noble-updates/main amd64 Components [151 kB]
Get:10 http://vn.archive.ubuntu.com/ubuntu noble-updates/restricted amd64 Components [212 B]
Get:11 http://vn.archive.ubuntu.com/ubuntu noble-updates/universe amd64 Packages [1,044 kB]
Get:12 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Get:13 http://vn.archive.ubuntu.com/ubuntu noble-updates/universe amd64 Components [365 kB]
Get:14 http://vn.archive.ubuntu.com/ubuntu noble-updates/multiverse amd64 Components [940 B]
Get:15 http://vn.archive.ubuntu.com/ubuntu noble-backports/main amd64 Components [7,060 B]
Get:16 http://vn.archive.ubuntu.com/ubuntu noble-backports/restricted amd64 Components [216 B]
Get:17 http://vn.archive.ubuntu.com/ubuntu noble-backports/universe amd64 Components [15.7 kB]
Get:18 http://vn.archive.ubuntu.com/ubuntu noble-backports/multiverse amd64 Components [212 B]
Get:19 http://security.ubuntu.com/ubuntu noble-security/main amd64 Packages [713 kB]
Get:20 http://security.ubuntu.com/ubuntu noble-security/main Translation-en [137 kB]
Get:21 http://security.ubuntu.com/ubuntu noble-security/main amd64 Components [9,008 B]
Get:22 http://security.ubuntu.com/ubuntu noble-security/restricted amd64 Components [212 B]
Get:23 http://security.ubuntu.com/ubuntu noble-security/universe amd64 Packages [824 kB]
Get:24 http://security.ubuntu.com/ubuntu noble-security/universe Translation-en [179 kB]
Get:25 http://security.ubuntu.com/ubuntu noble-security/universe amd64 Components [51.9 kB]
Get:26 http://security.ubuntu.com/ubuntu noble-security/multiverse amd64 Components [212 B]
Fetched 4,857 kB in 4s (1,230 kB/s)
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
9 packages can be upgraded. Run 'apt list --upgradable' to see them.
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
Calculating upgrade... Done
The following package was automatically installed and is no longer required:
  libsigsegv2
Use 'sudo apt autoremove' to remove it.
Get more security updates through Ubuntu Pro with 'esm-apps' enabled:
  libzvbi-common libcjson1 libavdevice60 ffmpeg libpostproc57 libavcodec60
  libzvbi0t64 libavutil58 libswscale7 libswresample4 libavformat60
  libavfilter9
Learn more about Ubuntu Pro at https://ubuntu.com/pro
The following upgrades have been deferred due to phasing:
  ubuntu-drivers-common
The following packages will be upgraded:
  gir1.2-javascriptcoregtk-4.1 gir1.2-javascriptcoregtk-6.0 gir1.2-webkit-6.0
  gir1.2-webkit2-4.1 libjavascriptcoregtk-4.1-0 libjavascriptcoregtk-6.0-1
  libwebkit2gtk-4.1-0 libwebkitgtk-6.0-4
8 upgraded, 0 newly installed, 0 to remove and 1 not upgraded.
8 standard LTS security updates
Need to get 71.4 MB of archives.
After this operation, 20.0 MB of additional disk space will be used.
Get:1 http://security.ubuntu.com/ubuntu noble-security/main amd64 gir1.2-webkit2-4.1 amd64 2.48.0-0ubuntu0.24.04.1 [105 kB]
Get:2 http://security.ubuntu.com/ubuntu noble-security/main amd64 gir1.2-javascriptcoregtk-4.1 amd64 2.48.0-0ubuntu0.24.04.1 [38.4 kB]
Get:3 http://security.ubuntu.com/ubuntu noble-security/main amd64 libwebkit2gtk-4.1-0 amd64 2.48.0-0ubuntu0.24.04.1 [26.8 MB]
Get:4 http://security.ubuntu.com/ubuntu noble-security/main amd64 libjavascriptcoregtk-4.1-0 amd64 2.48.0-0ubuntu0.24.04.1 [8,944 kB]
Get:5 http://security.ubuntu.com/ubuntu noble-security/main amd64 gir1.2-webkit-6.0 amd64 2.48.0-0ubuntu0.24.04.1 [68.0 kB]
Get:6 http://security.ubuntu.com/ubuntu noble-security/main amd64 gir1.2-javascriptcoregtk-6.0 amd64 2.48.0-0ubuntu0.24.04.1 [38.3 kB]
Get:7 http://security.ubuntu.com/ubuntu noble-security/main amd64 libwebkitgtk-6.0-4 amd64 2.48.0-0ubuntu0.24.04.1 [26.5 MB]
Get:8 http://security.ubuntu.com/ubuntu noble-security/main amd64 libjavascriptcoregtk-6.0-1 amd64 2.48.0-0ubuntu0.24.04.1 [8,946 kB]
Fetched 71.4 MB in 13s (5,499 kB/s)
(Reading database ... 277615 files and directories currently installed.)
Preparing to unpack .../0-gir1.2-webkit2-4.1_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking gir1.2-webkit2-4.1:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../1-gir1.2-javascriptcoregtk-4.1_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking gir1.2-javascriptcoregtk-4.1:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../2-libwebkit2gtk-4.1-0_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking libwebkit2gtk-4.1-0:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../3-libjavascriptcoregtk-4.1-0_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking libjavascriptcoregtk-4.1-0:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../4-gir1.2-webkit-6.0_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking gir1.2-webkit-6.0:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../5-gir1.2-javascriptcoregtk-6.0_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking gir1.2-javascriptcoregtk-6.0:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../6-libwebkitgtk-6.0-4_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking libwebkitgtk-6.0-4:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Preparing to unpack .../7-libjavascriptcoregtk-6.0-1_2.48.0-0ubuntu0.24.04.1_amd64.deb ...
Unpacking libjavascriptcoregtk-6.0-1:amd64 (2.48.0-0ubuntu0.24.04.1) over (2.46.6-0ubuntu0.24.04.1) ...
Setting up libjavascriptcoregtk-4.1-0:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up libjavascriptcoregtk-6.0-1:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up libwebkit2gtk-4.1-0:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up libwebkitgtk-6.0-4:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up gir1.2-javascriptcoregtk-6.0:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up gir1.2-javascriptcoregtk-4.1:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up gir1.2-webkit-6.0:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Setting up gir1.2-webkit2-4.1:amd64 (2.48.0-0ubuntu0.24.04.1) ...
Processing triggers for libc-bin (2.39-0ubuntu8.4) ...
2. Cài đặt các gói cần thiết...
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
python3 is already the newest version (3.12.3-0ubuntu2).
python3-pip is already the newest version (24.0+dfsg-1ubuntu1.1).
python3-venv is already the newest version (3.12.3-0ubuntu2).
git is already the newest version (1:2.43.0-1ubuntu7.2).
supervisor is already the newest version (4.2.5-1ubuntu0.1).
nginx is already the newest version (1.24.0-2ubuntu7.1).
The following package was automatically installed and is no longer required:
  libsigsegv2
Use 'sudo apt autoremove' to remove it.
0 upgraded, 0 newly installed, 0 to remove and 1 not upgraded.
3. Tạo người dùng hệ thống cho ứng dụng...
Đã tạo người dùng mikrotik
4. Chuẩn bị thư mục ứng dụng...
5. Tải mã nguồn ứng dụng...
Tải mã nguồn từ GitHub...
Cloning into '/opt/mikrotik-monitor'...
Username for 'https://github.com':
huannv@huannv:~/MikrotikMonitor$ ls
app.py        generated-icon.png      main.py         README.md     static
config.json   install.sh              mikrotik.py     replit.nix    templates
config.py     mac_vendor.py           models.py       routes        uv.lock
discovery.py  mac_vendors_cache.json  pyproject.toml  scheduler.py
huannv@huannv:~/MikrotikMonitor$ sudo chmod +x install.sh
huannv@huannv:~/MikrotikMonitor$ sudo ./install.sh
===== Bắt đầu cài đặt Ứng dụng Giám sát MikroTik =====

1. Cập nhật hệ thống...
Hit:1 http://vn.archive.ubuntu.com/ubuntu noble InRelease
Hit:2 http://vn.archive.ubuntu.com/ubuntu noble-updates InRelease
Hit:3 http://vn.archive.ubuntu.com/ubuntu noble-backports InRelease
Get:4 http://download.zerotier.com/debian/noble noble InRelease [20.5 kB]
Hit:5 https://deb.nodesource.com/node_20.x nodistro InRelease
Hit:6 https://download.docker.com/linux/ubuntu noble InRelease
Hit:7 https://packages.wazuh.com/4.x/apt stable InRelease
Hit:8 http://security.ubuntu.com/ubuntu noble-security InRelease
Fetched 20.5 kB in 1s (30.7 kB/s)
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
1 package can be upgraded. Run 'apt list --upgradable' to see it.
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
Calculating upgrade... Done
The following package was automatically installed and is no longer required:
  libsigsegv2
Use 'sudo apt autoremove' to remove it.
Get more security updates through Ubuntu Pro with 'esm-apps' enabled:
  libzvbi-common libcjson1 libavdevice60 ffmpeg libpostproc57 libavcodec60
  libzvbi0t64 libavutil58 libswscale7 libswresample4 libavformat60
  libavfilter9
Learn more about Ubuntu Pro at https://ubuntu.com/pro
The following upgrades have been deferred due to phasing:
  ubuntu-drivers-common
0 upgraded, 0 newly installed, 0 to remove and 1 not upgraded.
2. Cài đặt các gói cần thiết...
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
python3 is already the newest version (3.12.3-0ubuntu2).
python3-pip is already the newest version (24.0+dfsg-1ubuntu1.1).
python3-venv is already the newest version (3.12.3-0ubuntu2).
supervisor is already the newest version (4.2.5-1ubuntu0.1).
nginx is already the newest version (1.24.0-2ubuntu7.1).
wget is already the newest version (1.21.4-1ubuntu4.1).
unzip is already the newest version (6.0-28ubuntu4.1).
unzip set to manually installed.
The following package was automatically installed and is no longer required:
  libsigsegv2
Use 'sudo apt autoremove' to remove it.
0 upgraded, 0 newly installed, 0 to remove and 1 not upgraded.
3. Tạo người dùng hệ thống cho ứng dụng...
Người dùng mikrotik đã tồn tại
4. Chuẩn bị thư mục ứng dụng...
Thư mục /opt/mikrotik-monitor đã tồn tại. Bạn có muốn xóa và cài đặt lại không? (y/n)
y
5. Cài đặt mã nguồn ứng dụng...
Sao chép mã nguồn từ thư mục hiện tại...
6. Thiết lập môi trường Python...
7. Cài đặt các phụ thuộc Python...
Requirement already satisfied: pip in ./venv/lib/python3.12/site-packages (24.0)
Collecting pip
  Downloading pip-25.0.1-py3-none-any.whl.metadata (3.7 kB)
Downloading pip-25.0.1-py3-none-any.whl (1.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.8/1.8 MB 4.3 MB/s eta 0:00:00
Installing collected packages: pip
  Attempting uninstall: pip
    Found existing installation: pip 24.0
    Uninstalling pip-24.0:
      Successfully uninstalled pip-24.0
Successfully installed pip-25.0.1
ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'
Collecting apscheduler
  Downloading APScheduler-3.11.0-py3-none-any.whl.metadata (6.4 kB)
Collecting email-validator
  Using cached email_validator-2.2.0-py3-none-any.whl.metadata (25 kB)
Collecting flask
  Using cached flask-3.1.0-py3-none-any.whl.metadata (2.7 kB)
Collecting flask-sqlalchemy
  Using cached flask_sqlalchemy-3.1.1-py3-none-any.whl.metadata (3.4 kB)
Collecting gunicorn
  Using cached gunicorn-23.0.0-py3-none-any.whl.metadata (4.4 kB)
Collecting psycopg2-binary
  Using cached psycopg2_binary-2.9.10-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (4.9 kB)
Collecting routeros-api
  Downloading routeros_api-0.21.0-py2.py3-none-any.whl.metadata (10 kB)
Collecting tzlocal>=3.0 (from apscheduler)
  Downloading tzlocal-5.3.1-py3-none-any.whl.metadata (7.6 kB)
Collecting dnspython>=2.0.0 (from email-validator)
  Using cached dnspython-2.7.0-py3-none-any.whl.metadata (5.8 kB)
Collecting idna>=2.0.0 (from email-validator)
  Using cached idna-3.10-py3-none-any.whl.metadata (10 kB)
Collecting Werkzeug>=3.1 (from flask)
  Using cached werkzeug-3.1.3-py3-none-any.whl.metadata (3.7 kB)
Collecting Jinja2>=3.1.2 (from flask)
  Using cached jinja2-3.1.6-py3-none-any.whl.metadata (2.9 kB)
Collecting itsdangerous>=2.2 (from flask)
  Using cached itsdangerous-2.2.0-py3-none-any.whl.metadata (1.9 kB)
Collecting click>=8.1.3 (from flask)
  Using cached click-8.1.8-py3-none-any.whl.metadata (2.3 kB)
Collecting blinker>=1.9 (from flask)
  Using cached blinker-1.9.0-py3-none-any.whl.metadata (1.6 kB)
Collecting sqlalchemy>=2.0.16 (from flask-sqlalchemy)
  Using cached sqlalchemy-2.0.40-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (9.6 kB)
Collecting packaging (from gunicorn)
  Using cached packaging-24.2-py3-none-any.whl.metadata (3.2 kB)
Collecting MarkupSafe>=2.0 (from Jinja2>=3.1.2->flask)
  Using cached MarkupSafe-3.0.2-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (4.0 kB)
Collecting greenlet>=1 (from sqlalchemy>=2.0.16->flask-sqlalchemy)
  Using cached greenlet-3.1.1-cp312-cp312-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl.metadata (3.8 kB)
Collecting typing-extensions>=4.6.0 (from sqlalchemy>=2.0.16->flask-sqlalchemy)
  Using cached typing_extensions-4.13.0-py3-none-any.whl.metadata (3.0 kB)
Downloading APScheduler-3.11.0-py3-none-any.whl (64 kB)
Using cached email_validator-2.2.0-py3-none-any.whl (33 kB)
Using cached flask-3.1.0-py3-none-any.whl (102 kB)
Using cached flask_sqlalchemy-3.1.1-py3-none-any.whl (25 kB)
Using cached gunicorn-23.0.0-py3-none-any.whl (85 kB)
Using cached psycopg2_binary-2.9.10-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (3.0 MB)
Downloading routeros_api-0.21.0-py2.py3-none-any.whl (22 kB)
Using cached blinker-1.9.0-py3-none-any.whl (8.5 kB)
Using cached click-8.1.8-py3-none-any.whl (98 kB)
Using cached dnspython-2.7.0-py3-none-any.whl (313 kB)
Using cached idna-3.10-py3-none-any.whl (70 kB)
Using cached itsdangerous-2.2.0-py3-none-any.whl (16 kB)
Using cached jinja2-3.1.6-py3-none-any.whl (134 kB)
Using cached sqlalchemy-2.0.40-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (3.3 MB)
Downloading tzlocal-5.3.1-py3-none-any.whl (18 kB)
Using cached werkzeug-3.1.3-py3-none-any.whl (224 kB)
Using cached packaging-24.2-py3-none-any.whl (65 kB)
Using cached greenlet-3.1.1-cp312-cp312-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl (613 kB)
Using cached MarkupSafe-3.0.2-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (23 kB)
Using cached typing_extensions-4.13.0-py3-none-any.whl (45 kB)
Installing collected packages: routeros-api, tzlocal, typing-extensions, psycopg2-binary, packaging, MarkupSafe, itsdangerous, idna, greenlet, dnspython, click, blinker, Werkzeug, sqlalchemy, Jinja2, gunicorn, email-validator, apscheduler, flask, flask-sqlalchemy
Successfully installed Jinja2-3.1.6 MarkupSafe-3.0.2 Werkzeug-3.1.3 apscheduler-3.11.0 blinker-1.9.0 click-8.1.8 dnspython-2.7.0 email-validator-2.2.0 flask-3.1.0 flask-sqlalchemy-3.1.1 greenlet-3.1.1 gunicorn-23.0.0 idna-3.10 itsdangerous-2.2.0 packaging-24.2 psycopg2-binary-2.9.10 routeros-api-0.21.0 sqlalchemy-2.0.40 typing-extensions-4.13.0 tzlocal-5.3.1
8. Cấu hình quyền truy cập...
9. Tạo cấu hình Gunicorn...
10. Tạo cấu hình Supervisor...
11. Tạo cấu hình Nginx...
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
12. Khởi động dịch vụ...
Warning: The unit file, source configuration file or drop-ins of supervisor.service changed on disk. Run 'systemctl daemon-reload' to reload units.
Warning: The unit file, source configuration file or drop-ins of nginx.service changed on disk. Run 'systemctl daemon-reload' to reload units.
13. Kiểm tra trạng thái dịch vụ...
mikrotik-monitor                 RUNNING   pid 105505, uptime 0:00:05
14. Tạo tệp requirements.txt...

===== Cài đặt hoàn tất =====
Ứng dụng giám sát MikroTik đã được cài đặt tại /opt/mikrotik-monitor
Truy cập ứng dụng qua: http://your-server-ip

Một số lệnh hữu ích:
  - Kiểm tra trạng thái:   sudo supervisorctl status mikrotik-monitor
  - Khởi động dịch vụ:     sudo supervisorctl start mikrotik-monitor
  - Dừng dịch vụ:          sudo supervisorctl stop mikrotik-monitor
  - Khởi động lại dịch vụ: sudo supervisorctl restart mikrotik-monitor
  - Xem nhật ký:           sudo tail -f /var/log/mikrotik-monitor/supervisor.out.log

Lưu ý: Bạn có thể cần cấu hình tệp config.json để thêm thiết bị MikroTik của bạn
Vị trí tệp cấu hình: /opt/mikrotik-monitor/config.json
huannv@huannv:~/MikrotikMonitor$ sudo supervisorctl status mikrotik-monitor
mikrotik-monitor                 RUNNING   pid 105505, uptime 0:00:54
huannv@huannv:~/MikrotikMonitor$ sudo supervisorctl start mikrotik-monitor
mikrotik-monitor: ERROR (already started)
huannv@huannv:~/MikrotikMonitor$ sudo supervisorctl stop mikrotik-monitor
mikrotik-monitor: stopped
huannv@huannv:~/MikrotikMonitor$ sudo supervisorctl restart mikrotik-monitor
mikrotik-monitor: ERROR (not running)
mikrotik-monitor: started
huannv@huannv:~/MikrotikMonitor$
