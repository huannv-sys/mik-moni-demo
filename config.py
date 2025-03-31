import os
import json
from pathlib import Path
from typing import Dict, Any, List

# Default configuration
DEFAULT_CONFIG = {
    "devices": [
        {
            "id": "default",
            "name": "My Mikrotik",
            "host": "192.168.88.1",
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

def get_devices() -> List[Dict[str, Any]]:
    """Get the list of configured devices"""
    return load_config().get('devices', [])

def add_device(device: Dict[str, Any]) -> None:
    """Add a new device to configuration"""
    config = load_config()
    # Generate a unique ID if not provided
    if 'id' not in device:
        import uuid
        device['id'] = str(uuid.uuid4())
    
    # Check if device with same ID already exists
    for i, d in enumerate(config['devices']):
        if d['id'] == device['id']:
            # Update existing device
            config['devices'][i] = device
            save_config(config)
            return
    
    # Add new device
    config['devices'].append(device)
    save_config(config)

def remove_device(device_id: str) -> None:
    """Remove a device from configuration"""
    config = load_config()
    config['devices'] = [d for d in config['devices'] if d['id'] != device_id]
    save_config(config)

def get_refresh_interval() -> int:
    """Get the data refresh interval in seconds"""
    return load_config().get('refresh_interval', 60)

def get_thresholds() -> Dict[str, int]:
    """Get the alert thresholds configuration"""
    return load_config().get('thresholds', DEFAULT_CONFIG['thresholds'])
