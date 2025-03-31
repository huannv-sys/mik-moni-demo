from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from models import DataStore, Site, Device
import config
import uuid

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
            
            config.add_site(site)
            flash('Site đã được lưu thành công', 'success')
            return redirect(url_for('views.sites'))
        
        elif 'remove_site' in request.form:
            # Remove site
            site_id = request.form.get('site_id')
            if site_id:
                config.remove_site(site_id)
                flash('Site đã được xóa thành công', 'success')
            
            return redirect(url_for('views.sites'))
    
    # GET request
    sites_list = list(DataStore.sites.values())
    
    # Group devices by site
    devices_by_site = {}
    for device in DataStore.devices.values():
        if device.site_id not in devices_by_site:
            devices_by_site[device.site_id] = []
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
                'use_ssl': request.form.get('use_ssl') == 'on'
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
    
    # Lấy danh sách thiết bị thuộc site này
    devices = [device for device in DataStore.devices.values() if device.site_id == site_id]
    
    # Tính số thiết bị đang online và offline
    online_count = sum(1 for device in devices if device.last_connected is not None)
    offline_count = len(devices) - online_count
    
    # Đếm số cảnh báo của thiết bị trong site này
    alerts_count = sum(1 for alert in DataStore.alerts if alert.device_id in [d.id for d in devices] and alert.active)
    
    return render_template('site_devices.html',
                          page='sites',
                          site=site,
                          devices=devices,
                          online_count=online_count,
                          offline_count=offline_count,
                          alerts_count=alerts_count)

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
                'use_ssl': request.form.get('use_ssl') == 'on'
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
