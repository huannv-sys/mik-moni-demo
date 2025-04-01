import os
import json
from pathlib import Path
from typing import Dict, Any, List

# Default configuration
DEFAULT_CONFIG = {
    "sites": [
        {
            "id": "default",
            "name": "Site mặc định",
            "description": "Site mặc định tự động tạo",
            "location": "",
            "contact": "",
            "enabled": True
        }
    ],
    "devices": [
        {
            "id": "default",
            "name": "My Mikrotik",
            "host": "192.168.88.1",
            "site_id": "default",
            "port": 8728,
            "username": "admin",
            "password": "",
            "enabled": True
        }
    ],
    "refresh_interval": 60,  # seconds
    "interface_history_points": 288,  # 24 hours with 5-minute intervals
    "system_history_points": 288,  # 24 hours with 5-minute intervals
    "thresholds": {
        "cpu_load": 80,  # percentage
        "memory_usage": 80,  # percentage
        "disk_usage": 80,  # percentage
        "interface_usage": 80  # percentage
    },
    # Connection settings
    "use_ssl": False,  # Whether to use SSL for API connections
    "connection_timeout": 10,  # Timeout in seconds for connection attempts
    "connection_retries": 2,  # Number of retries for failed connections
    "retry_delay": 1  # Delay in seconds between connection retries
}

CONFIG_FILE = 'config.json'

def load_config() -> Dict[str, Any]:
    """Load configuration from file or create with defaults"""
    config = DEFAULT_CONFIG.copy()
    
    if Path(CONFIG_FILE).exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                file_config = json.load(f)
                config.update(file_config)
        except Exception as e:
            print(f"Error loading config: {e}")
    else:
        save_config(config)
    
    return config

def save_config(config: Dict[str, Any]) -> None:
    """Save configuration to file"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")

def get_sites() -> List[Dict[str, Any]]:
    """Lấy danh sách các site đã cấu hình"""
    return load_config().get('sites', [])

def get_devices() -> List[Dict[str, Any]]:
    """Lấy danh sách các thiết bị đã cấu hình"""
    return load_config().get('devices', [])

def get_devices_by_site(site_id: str) -> List[Dict[str, Any]]:
    """Lấy danh sách thiết bị theo site"""
    return [d for d in get_devices() if d.get('site_id') == site_id]

def add_site(site: Dict[str, Any]) -> None:
    """Thêm hoặc cập nhật một site"""
    config = load_config()
    # Tạo ID nếu chưa có
    if 'id' not in site:
        import uuid
        site['id'] = str(uuid.uuid4())
    
    # Kiểm tra xem site đã tồn tại chưa
    for i, s in enumerate(config.get('sites', [])):
        if s['id'] == site['id']:
            # Cập nhật site hiện có
            config['sites'][i] = site
            save_config(config)
            return
    
    # Thêm site mới
    if 'sites' not in config:
        config['sites'] = []
    config['sites'].append(site)
    save_config(config)

def remove_site(site_id: str) -> None:
    """Xóa một site và tất cả thiết bị liên quan"""
    config = load_config()
    
    # Xóa site
    config['sites'] = [s for s in config.get('sites', []) if s['id'] != site_id]
    
    # Xóa các thiết bị trong site này
    config['devices'] = [d for d in config.get('devices', []) if d.get('site_id') != site_id]
    
    save_config(config)

def add_device(device: Dict[str, Any]) -> None:
    """Thêm hoặc cập nhật một thiết bị"""
    config = load_config()
    # Tạo ID nếu chưa có
    if 'id' not in device:
        import uuid
        device['id'] = str(uuid.uuid4())
    
    # Gắn vào site mặc định nếu không có site_id
    if 'site_id' not in device or not device['site_id']:
        if len(config.get('sites', [])) > 0:
            device['site_id'] = config['sites'][0]['id']
        else:
            # Tạo site mặc định nếu không có site nào
            default_site = {
                'id': 'default',
                'name': 'Site mặc định',
                'description': 'Site mặc định tự động tạo',
                'enabled': True
            }
            add_site(default_site)
            device['site_id'] = 'default'
    
    # Thiết lập các giá trị mặc định cho thiết bị được tự động phát hiện
    if 'auto_detected' in device and device['auto_detected']:
        import datetime
        # Đảm bảo có thời gian phát hiện đầu tiên
        if 'first_seen' not in device or not device['first_seen']:
            device['first_seen'] = datetime.datetime.now().isoformat()
    
    # Kiểm tra xem thiết bị đã tồn tại chưa
    for i, d in enumerate(config.get('devices', [])):
        if d['id'] == device['id']:
            # Cập nhật thiết bị hiện có
            config['devices'][i] = device
            save_config(config)
            return
    
    # Thêm thiết bị mới
    if 'devices' not in config:
        config['devices'] = []
    config['devices'].append(device)
    save_config(config)

def remove_device(device_id: str) -> None:
    """Xóa một thiết bị và làm sạch dữ liệu liên quan"""
    from models import DataStore
    
    # Xóa device khỏi cấu hình
    config = load_config()
    config['devices'] = [d for d in config.get('devices', []) if d['id'] != device_id]
    save_config(config)
    
    # Làm sạch dữ liệu thiết bị trong DataStore
    if device_id in DataStore.devices:
        del DataStore.devices[device_id]
    
    # Xóa dữ liệu thống kê hệ thống
    if device_id in DataStore.system_resources:
        del DataStore.system_resources[device_id]
    
    # Xóa lịch sử hệ thống
    if device_id in DataStore.system_history:
        del DataStore.system_history[device_id]
    
    # Xóa giao diện và lịch sử giao diện
    if device_id in DataStore.interfaces:
        del DataStore.interfaces[device_id]
    if device_id in DataStore.interface_history:
        del DataStore.interface_history[device_id]
    
    # Xóa các dữ liệu khác
    if device_id in DataStore.ip_addresses:
        del DataStore.ip_addresses[device_id]
    if device_id in DataStore.arp_entries:
        del DataStore.arp_entries[device_id]
    if device_id in DataStore.dhcp_leases:
        del DataStore.dhcp_leases[device_id]
    if device_id in DataStore.firewall_rules:
        del DataStore.firewall_rules[device_id]
    if device_id in DataStore.wireless_clients:
        del DataStore.wireless_clients[device_id]
    if device_id in DataStore.capsman_registrations:
        del DataStore.capsman_registrations[device_id]
    if device_id in DataStore.logs:
        del DataStore.logs[device_id]
    
    # Lọc các cảnh báo liên quan đến thiết bị
    DataStore.alerts = [a for a in DataStore.alerts if a.device_id != device_id]

def get_refresh_interval() -> int:
    """Get the data refresh interval in seconds"""
    return load_config().get('refresh_interval', 60)

def get_thresholds() -> Dict[str, int]:
    """Get the alert thresholds configuration"""
    return load_config().get('thresholds', DEFAULT_CONFIG['thresholds'])
