import os
import logging
from flask import Flask
from routes.views import views
from routes.api import api
from scheduler import start_scheduler
import config
from models import Site, Device, DataStore
import realtime_discovery

# Configure logging
FORMAT = '[%(asctime)s] %(levelname)s - %(name)s: %(message)s'
logging.basicConfig(level=logging.DEBUG, format=FORMAT, datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "mikrotik_monitoring_secret")

# Register blueprints
app.register_blueprint(views)
app.register_blueprint(api, url_prefix='/api')

# Khởi tạo dữ liệu từ cấu hình
def init_data_from_config():
    """Khởi tạo dữ liệu từ cấu hình đã lưu"""
    # Khởi tạo sites
    for site_data in config.get_sites():
        site = Site(
            id=site_data.get('id', ''),
            name=site_data.get('name', ''),
            description=site_data.get('description', ''),
            location=site_data.get('location', ''),
            contact=site_data.get('contact', ''),
            enabled=site_data.get('enabled', True)
        )
        DataStore.sites[site.id] = site
    
    # Khởi tạo devices
    for device_data in config.get_devices():
        device = Device(
            id=device_data.get('id', ''),
            name=device_data.get('name', ''),
            host=device_data.get('host', ''),
            site_id=device_data.get('site_id', 'default'),
            port=device_data.get('port', 8728),
            username=device_data.get('username', 'admin'),
            password=device_data.get('password', ''),
            enabled=device_data.get('enabled', True),
            use_ssl=device_data.get('use_ssl', False),
            comment=device_data.get('comment', ''),
            location=device_data.get('location', ''),
            mac_address=device_data.get('mac_address', ''),
            vendor=device_data.get('vendor', ''),
            device_type=device_data.get('device_type', ''),
            auto_detected=device_data.get('auto_detected', False),
            first_seen=device_data.get('first_seen', None)
        )
        DataStore.devices[device.id] = device
    
    logger.info(f"Đã khởi tạo {len(DataStore.sites)} sites và {len(DataStore.devices)} thiết bị từ cấu hình")

# Khởi tạo dữ liệu và bắt đầu lập lịch thu thập
with app.app_context():
    init_data_from_config()
    start_scheduler()
    # Bắt đầu tính năng phát hiện thiết bị thời gian thực
    realtime_discovery.start_discovery()
    logger.info("Tính năng phát hiện thiết bị thời gian thực đã được khởi động")

logger.info("Mikrotik Monitoring application khởi tạo thành công")
