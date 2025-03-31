from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from models import DataStore
import config

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
                'enabled': request.form.get('enabled') == 'on'
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
