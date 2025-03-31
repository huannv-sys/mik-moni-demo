from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from models import DataStore, Site, Device
import config
import uuid
import threading
import discovery
import realtime_discovery
import logging

logger = logging.getLogger(__name__)
views = Blueprint('views', __name__)

@views.route('/')
def index():
    """Render dashboard page"""
    devices = list(DataStore.devices.values())
    return render_template('dashboard.html', 
                           page='dashboard', 
                           devices=devices,
                           active_device=request.args.get('device', ''))

@views.route('/system')
def system():
    """Render system information page"""
    devices = list(DataStore.devices.values())
    device_id = request.args.get('device', '')
    if device_id and device_id in DataStore.devices:
        active_device = DataStore.devices[device_id]
    else:
        active_device = devices[0] if devices else None
    
    return render_template('system.html', 
                           page='system', 
                           devices=devices,
                           active_device=active_device.id if active_device else '')

@views.route('/interfaces')
def interfaces():
    """Render interfaces page"""
    devices = list(DataStore.devices.values())
    device_id = request.args.get('device', '')
    if device_id and device_id in DataStore.devices:
        active_device = DataStore.devices[device_id]
    else:
        active_device = devices[0] if devices else None
    
    return render_template('interfaces.html', 
                           page='interfaces', 
                           devices=devices,
                           active_device=active_device.id if active_device else '')

@views.route('/ip')
def ip():
    """Render IP addresses page"""
    devices = list(DataStore.devices.values())
    device_id = request.args.get('device', '')
    if device_id and device_id in DataStore.devices:
        active_device = DataStore.devices[device_id]
    else:
        active_device = devices[0] if devices else None
    
    return render_template('ip.html', 
                           page='ip', 
                           devices=devices,
                           active_device=active_device.id if active_device else '')

@views.route('/services')
def services():
    """Render services page"""
    devices = list(DataStore.devices.values())
    device_id = request.args.get('device', '')
    if device_id and device_id in DataStore.devices:
        active_device = DataStore.devices[device_id]
    else:
        active_device = devices[0] if devices else None
    
    return render_template('services.html', 
                           page='services', 
                           devices=devices,
                           active_device=active_device.id if active_device else '')

@views.route('/logs')
def logs():
    """Render logs page"""
    devices = list(DataStore.devices.values())
    device_id = request.args.get('device', '')
    if device_id and device_id in DataStore.devices:
        active_device = DataStore.devices[device_id]
    else:
        active_device = devices[0] if devices else None
    
    return render_template('logs.html', 
                           page='logs', 
                           devices=devices,
                           active_device=active_device.id if active_device else '')

@views.route('/alerts')
def alerts():
    """Render alerts page"""
    devices = list(DataStore.devices.values())
    return render_template('alerts.html', 
                           page='alerts', 
                           devices=devices,
                           active_device=request.args.get('device', ''))

@views.route('/sites', methods=['GET', 'POST'])
def sites():
    """Render and handle sites page"""
    if request.method == 'POST':
        if 'add_site' in request.form:
            # Add or update site
            site = {
                'id': request.form.get('id') or str(uuid.uuid4()),
                'name': request.form.get('name'),
                'description': request.form.get('description', ''),
                'location': request.form.get('location', ''),
                'contact': request.form.get('contact', ''),
                'enabled': request.form.get('enabled') == 'on'
            }
            
            # Lưu vào config
            config.add_site(site)
            
            # Cập nhật lại DataStore để thấy ngay lập tức
            site_obj = Site(
                id=site['id'],
                name=site['name'],
                description=site['description'],
                location=site['location'],
                contact=site['contact'],
                enabled=site['enabled']
            )
            DataStore.sites[site['id']] = site_obj
            
            flash('Site đã được lưu thành công', 'success')
            return redirect(url_for('views.sites'))
        
        elif 'remove_site' in request.form:
            # Remove site
            site_id = request.form.get('site_id')
            if site_id:
                config.remove_site(site_id)
                # Cập nhật DataStore
                if site_id in DataStore.sites:
                    del DataStore.sites[site_id]
                flash('Site đã được xóa thành công', 'success')
            
            return redirect(url_for('views.sites'))
    
    # GET request - Đọc trực tiếp từ config để đảm bảo thông tin cập nhật
    sites_data = config.get_sites()
    sites_list = []
    
    # Cập nhật DataStore từ config
    DataStore.sites = {}
    for site_data in sites_data:
        site = Site(
            id=site_data.get('id', ''),
            name=site_data.get('name', ''),
            description=site_data.get('description', ''),
            location=site_data.get('location', ''),
            contact=site_data.get('contact', ''),
            enabled=site_data.get('enabled', True)
        )
        DataStore.sites[site.id] = site
        sites_list.append(site)
    
    # Group devices by site
    devices_by_site = {}
    for device in DataStore.devices.values():
        if device.site_id not in devices_by_site:
            devices_by_site[device.site_id] = []
        if device and hasattr(device, 'id'):  # Kiểm tra device hợp lệ
            devices_by_site[device.site_id].append(device)
    
    return render_template('sites.html', 
                          page='sites', 
                          sites=sites_list,
                          devices_by_site=devices_by_site)

@views.route('/sites/<site_id>', methods=['GET', 'POST'])
def site_devices(site_id):
    """Render and handle site devices page"""
    if site_id not in DataStore.sites:
        flash('Site không tồn tại', 'danger')
        return redirect(url_for('views.sites'))
    
    site = DataStore.sites[site_id]
    
    if request.method == 'POST':
        if 'add_device' in request.form:
            # Add or update device
            device = {
                'id': request.form.get('id') or str(uuid.uuid4()),
                'name': request.form.get('name'),
                'host': request.form.get('host'),
                'site_id': site_id,
                'port': int(request.form.get('port', 8728)),
                'username': request.form.get('username', 'admin'),
                'password': request.form.get('password', ''),
                'enabled': request.form.get('enabled') == 'on',
                'use_ssl': request.form.get('use_ssl') == 'on',
                'location': request.form.get('location', ''),
                'comment': request.form.get('comment', '')
            }
            
            # Nếu đang chỉnh sửa thiết bị và không nhập mật khẩu mới
            if request.form.get('id') and not request.form.get('password'):
                # Giữ lại mật khẩu cũ
                old_device = next((d for d in config.get_devices() if d['id'] == request.form.get('id')), None)
                if old_device and 'password' in old_device:
                    device['password'] = old_device['password']
            
            config.add_device(device)
            flash('Thiết bị đã được lưu thành công', 'success')
            
            # Refresh the scheduler to apply changes
            from scheduler import schedule_device_collection
            schedule_device_collection()
            
            return redirect(url_for('views.site_devices', site_id=site_id))
        
        elif 'remove_device' in request.form:
            # Remove device
            device_id = request.form.get('device_id')
            if device_id:
                config.remove_device(device_id)
                flash('Thiết bị đã được xóa thành công', 'success')
                
                # Refresh the scheduler to apply changes
                from scheduler import schedule_device_collection
                schedule_device_collection()
            
            return redirect(url_for('views.site_devices', site_id=site_id))
    
    # Đọc danh sách thiết bị từ config để đồng bộ với thay đổi gần nhất
    devices_data = config.get_devices_by_site(site_id)
    devices = []
    
    # Cập nhật DataStore và tạo danh sách thiết bị
    for device_data in devices_data:
        device_id = device_data.get('id', '')
        
        # Kiểm tra nếu thiết bị đã có trong DataStore thì dùng lại thông tin hiện có
        if device_id in DataStore.devices:
            device = DataStore.devices[device_id]
        else:
            # Nếu chưa có, tạo đối tượng Device mới
            device = Device(
                id=device_id,
                name=device_data.get('name', ''),
                host=device_data.get('host', ''),
                site_id=site_id,
                port=device_data.get('port', 8728),
                username=device_data.get('username', 'admin'),
                password=device_data.get('password', ''),
                enabled=device_data.get('enabled', True),
                use_ssl=device_data.get('use_ssl', False),
                location=device_data.get('location', ''),
                comment=device_data.get('comment', ''),
                auto_detected=device_data.get('auto_detected', False)
            )
            DataStore.devices[device_id] = device
        
        devices.append(device)
    
    # Tính số thiết bị đang online và offline
    online_count = sum(1 for device in devices if device and hasattr(device, 'last_connected') and device.last_connected is not None)
    offline_count = len(devices) - online_count
    
    # Đếm số cảnh báo của thiết bị trong site này
    device_ids = [d.id for d in devices if d and hasattr(d, 'id')]
    alerts_count = sum(1 for alert in DataStore.alerts if alert.device_id in device_ids and alert.active)
    
    return render_template('site_devices.html',
                          page='sites',
                          site=site,
                          devices=devices,
                          online_count=online_count,
                          offline_count=offline_count,
                          alerts_count=alerts_count)

# Hàm chạy quét mạng không đồng bộ
def run_discovery_scan(network_ranges, username, password, site_id, port, timeout):
    """Thực hiện quét mạng không đồng bộ và lưu kết quả vào session"""
    try:
        # Chạy quét mạng
        result = discovery.run_discovery(
            network_ranges=network_ranges,
            username=username,
            password=password,
            site_id=site_id,
            port=port,
            timeout=timeout
        )
        
        # Đánh dấu các thiết bị mới và hiện có
        discovered_devices = []
        for device in result.get('devices', []):
            # Kiểm tra xem thiết bị này mới hay đã tồn tại
            is_new = True
            for existing_device in config.get_devices():
                if existing_device['host'] == device['host']:
                    is_new = False
                    break
            
            device['is_new'] = is_new
            discovered_devices.append(device)
        
        result['devices'] = discovered_devices
        
        # Lưu kết quả vào session
        session['discovery_result'] = result
        session['scan_in_progress'] = False
        
        logger.info(f"Hoàn tất quét, tìm thấy {len(discovered_devices)} thiết bị")
        
    except Exception as e:
        logger.error(f"Lỗi trong quá trình quét mạng: {str(e)}")
        session['discovery_error'] = str(e)
        session['scan_in_progress'] = False

@views.route('/discovery', methods=['GET', 'POST'])
def discovery_page():
    """Render and handle device discovery page"""
    if request.method == 'POST':
        if 'run_discovery' in request.form:
            # Parse network ranges
            network_ranges_text = request.form.get('network_ranges', '')
            network_ranges = [r.strip() for r in network_ranges_text.splitlines() if r.strip()]
            
            if not network_ranges:
                flash('Vui lòng nhập ít nhất một dải mạng để quét', 'danger')
                return redirect(url_for('views.discovery_page'))
            
            username = request.form.get('username', 'admin')
            password = request.form.get('password', '')
            site_id = request.form.get('site_id')
            port = int(request.form.get('port', 8728))
            timeout = int(request.form.get('timeout', 3))
            
            # Validate site_id
            if not site_id or site_id not in DataStore.sites:
                flash('Vui lòng chọn một site hợp lệ', 'danger')
                return redirect(url_for('views.discovery_page'))
            
            # Đánh dấu đang quét
            session['scan_in_progress'] = True
            session.pop('discovery_result', None)
            session.pop('discovery_error', None)
            
            # Chạy quét không đồng bộ trong thread riêng
            thread = threading.Thread(
                target=run_discovery_scan,
                args=(network_ranges, username, password, site_id, port, timeout)
            )
            thread.daemon = True
            thread.start()
            
            flash('Đã bắt đầu quét mạng. Quá trình này có thể mất vài phút...', 'info')
            return redirect(url_for('views.discovery_page'))
        elif 'add_to_monitoring' in request.form:
            # Thêm thiết bị được phát hiện vào danh sách giám sát
            mac_address = request.form.get('mac_address')
            site_id = request.form.get('site_id')
            
            if not mac_address or not site_id:
                flash('Thiếu thông tin MAC address hoặc Site ID', 'danger')
                return redirect(url_for('views.discovery_page'))
            
            # Thêm thiết bị vào giám sát
            device_id = realtime_discovery.add_to_monitored_devices(mac_address, site_id)
            
            if device_id:
                flash('Thiết bị đã được thêm vào danh sách giám sát', 'success')
                # Refresh the scheduler to apply changes
                from scheduler import schedule_device_collection
                schedule_device_collection()
            else:
                flash('Không thể thêm thiết bị vào danh sách giám sát', 'danger')
            
            return redirect(url_for('views.discovery_page'))
    
    # GET request hoặc sau khi POST
    sites_list = list(DataStore.sites.values())
    
    # Lấy thông tin quét từ session
    scan_in_progress = session.get('scan_in_progress', False)
    discovery_result = session.get('discovery_result')
    discovery_error = session.get('discovery_error')
    
    # Lấy danh sách thiết bị được phát hiện tự động
    discovered_devices = realtime_discovery.get_discovered_devices()
    
    # Hiển thị lỗi nếu có
    if discovery_error:
        flash(f'Xảy ra lỗi khi quét mạng: {discovery_error}', 'danger')
        session.pop('discovery_error', None)
    
    return render_template('discovery.html',
                          page='discovery',
                          sites=sites_list,
                          scan_in_progress=scan_in_progress,
                          discovery_result=discovery_result,
                          discovered_devices=discovered_devices)

@views.route('/settings', methods=['GET', 'POST'])
def settings():
    """Render and handle settings page"""
    if request.method == 'POST':
        if 'add_device' in request.form:
            # Add or update device
            device = {
                'id': request.form.get('id') or None,
                'name': request.form.get('name'),
                'host': request.form.get('host'),
                'port': int(request.form.get('port', 8728)),
                'username': request.form.get('username', 'admin'),
                'password': request.form.get('password', ''),
                'enabled': request.form.get('enabled') == 'on',
                'use_ssl': request.form.get('use_ssl') == 'on',
                'location': request.form.get('location', ''),
                'comment': request.form.get('comment', '')
            }
            
            config.add_device(device)
            flash('Device settings saved successfully', 'success')
            
            # Refresh the scheduler to apply changes
            from scheduler import schedule_device_collection
            schedule_device_collection()
            
            return redirect(url_for('views.settings'))
        
        elif 'remove_device' in request.form:
            # Remove device
            device_id = request.form.get('device_id')
            if device_id:
                config.remove_device(device_id)
                flash('Device removed successfully', 'success')
                
                # Refresh the scheduler to apply changes
                from scheduler import schedule_device_collection
                schedule_device_collection()
            
            return redirect(url_for('views.settings'))
        
        elif 'update_config' in request.form:
            # Update general configuration
            config_data = config.load_config()
            config_data['refresh_interval'] = int(request.form.get('refresh_interval', 60))
            
            # Update thresholds
            config_data['thresholds'] = {
                'cpu_load': int(request.form.get('threshold_cpu', 80)),
                'memory_usage': int(request.form.get('threshold_memory', 80)),
                'disk_usage': int(request.form.get('threshold_disk', 80)),
                'interface_usage': int(request.form.get('threshold_interface', 80))
            }
            
            # Update connection settings
            config_data['use_ssl'] = 'use_ssl' in request.form
            config_data['connection_timeout'] = int(request.form.get('connection_timeout', 10))
            config_data['connection_retries'] = int(request.form.get('connection_retries', 2))
            config_data['retry_delay'] = int(request.form.get('retry_delay', 1))
            
            config.save_config(config_data)
            flash('Configuration updated successfully', 'success')
            
            # Refresh the scheduler to apply changes
            from scheduler import schedule_device_collection
            schedule_device_collection()
            
            return redirect(url_for('views.settings'))
    
    # GET request
    devices = list(DataStore.devices.values())
    
    # Load current config
    current_config = config.load_config()
    thresholds = current_config.get('thresholds', {})
    
    return render_template('settings.html', 
                           page='settings', 
                           devices=devices,
                           active_device=request.args.get('device', ''),
                           current_config=current_config,
                           thresholds=thresholds)
