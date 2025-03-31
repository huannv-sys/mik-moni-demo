#!/usr/bin/env python3
"""
Script để xóa các thiết bị test và làm sạch cấu hình
"""

import json
import os
from pathlib import Path
import uuid

# Đường dẫn đến file cấu hình
CONFIG_FILE = 'config.json'

def load_config():
    """Tải cấu hình từ file"""
    if not Path(CONFIG_FILE).exists():
        print(f"Không tìm thấy file cấu hình: {CONFIG_FILE}")
        return {"sites": [], "devices": []}
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
            return config
    except Exception as e:
        print(f"Lỗi khi đọc file cấu hình: {e}")
        return {"sites": [], "devices": []}

def save_config(config):
    """Lưu cấu hình xuống file"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"Đã lưu cấu hình vào {CONFIG_FILE}")
    except Exception as e:
        print(f"Lỗi khi lưu file cấu hình: {e}")

def clean_devices():
    """Xóa các thiết bị có chứa từ khóa test hoặc demo"""
    config = load_config()
    
    original_count = len(config.get("devices", []))
    devices = config.get("devices", [])
    
    # Lọc danh sách thiết bị
    kept_devices = []
    removed_devices = []
    
    for device in devices:
        name = device.get("name", "").lower()
        host = device.get("host", "").lower()
        comment = device.get("comment", "").lower()
        
        # Kiểm tra các từ khóa
        if "test" in name or "test" in host or "test" in comment or \
           "demo" in name or "demo" in host or "demo" in comment:
            removed_devices.append(device)
        else:
            kept_devices.append(device)
    
    # Cập nhật lại danh sách thiết bị
    config["devices"] = kept_devices
    
    # Lưu cấu hình
    save_config(config)
    
    print(f"Đã xóa {len(removed_devices)} thiết bị test/demo từ tổng số {original_count} thiết bị.")
    print(f"Còn lại {len(kept_devices)} thiết bị.")
    
    # In danh sách thiết bị đã xóa
    if removed_devices:
        print("\nDanh sách thiết bị đã xóa:")
        for i, device in enumerate(removed_devices, 1):
            print(f"{i}. {device.get('name')} ({device.get('host')})")

def repair_sites():
    """Sửa lỗi cấu trúc sites để đảm bảo có thể lưu site mới"""
    config = load_config()
    
    # Đảm bảo có phần sites trong cấu hình
    if "sites" not in config:
        config["sites"] = []
    
    # Kiểm tra và đảm bảo mỗi site có ID
    for site in config["sites"]:
        if "id" not in site or not site["id"]:
            site["id"] = str(uuid.uuid4())
    
    # Đảm bảo có ít nhất một site mặc định
    if not config["sites"]:
        default_site = {
            "id": "default",
            "name": "Site mặc định",
            "description": "Site mặc định tự động tạo",
            "enabled": True
        }
        config["sites"].append(default_site)
        print("Đã tạo site mặc định.")
    
    # Kiểm tra các thiết bị không có site_id
    for device in config.get("devices", []):
        if "site_id" not in device or not device["site_id"]:
            device["site_id"] = config["sites"][0]["id"]
    
    # Lưu cấu hình
    save_config(config)
    print(f"Đã sửa cấu trúc sites, hiện có {len(config['sites'])} site.")

def main():
    """Hàm chính"""
    print("===== Công cụ làm sạch và sửa lỗi cấu hình MikroTik Monitor =====\n")
    
    while True:
        print("\nLựa chọn công việc:")
        print("1. Xóa các thiết bị test/demo")
        print("2. Sửa lỗi cấu trúc sites")
        print("3. Làm cả hai")
        print("4. Thoát")
        
        choice = input("\nNhập lựa chọn của bạn (1-4): ")
        
        if choice == "1":
            clean_devices()
        elif choice == "2":
            repair_sites()
        elif choice == "3":
            clean_devices()
            repair_sites()
        elif choice == "4":
            print("Thoát chương trình.")
            break
        else:
            print("Lựa chọn không hợp lệ. Vui lòng chọn từ 1-4.")

if __name__ == "__main__":
    main()