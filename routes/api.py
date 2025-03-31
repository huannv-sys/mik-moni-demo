from flask import Blueprint, jsonify, request
from models import DataStore
from mikrotik import mikrotik_api
from typing import Dict, Any, List
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
api = Blueprint('api', __name__)

@api.route('/devices', methods=['GET'])
def get_devices():
    """Get all devices"""
    devices = list(DataStore.devices.values())
    return jsonify({
        'devices': [
            {
                'id': device.id,
                'name': device.name,
                'host': device.host,
                'port': device.port,
                'enabled': device.enabled,
                'last_connected': device.last_connected.isoformat() if device.last_connected else None,
                'error': device.error_message
            }
            for device in devices
        ]
    })

@api.route('/system/<device_id>', methods=['GET'])
def get_system(device_id):
    """Get system resources for a device"""
    if device_id not in DataStore.system_resources:
        return jsonify({'error': 'System resources not available for this device'}), 404
    
    resources = DataStore.system_resources[device_id]
    
    return jsonify({
        'resources': {
            'device_id': resources.device_id,
            'uptime': resources.uptime,
            'version': resources.version,
            'cpu_load': resources.cpu_load,
            'free_memory': resources.free_memory,
            'total_memory': resources.total_memory,
            'free_hdd': resources.free_hdd,
            'total_hdd': resources.total_hdd,
            'architecture_name': resources.architecture_name,
            'board_name': resources.board_name,
            'platform': resources.platform,
            'timestamp': resources.timestamp.isoformat() if resources.timestamp else None
        }
    })

@api.route('/system/history/<device_id>', methods=['GET'])
def get_system_history(device_id):
    """Get system resource history for a device"""
    if device_id not in DataStore.system_history:
        return jsonify({'error': 'System history not available for this device'}), 404
    
    return jsonify({
        'history': DataStore.system_history[device_id]
    })

@api.route('/interfaces/<device_id>', methods=['GET'])
def get_interfaces(device_id):
    """Get interfaces for a device"""
    if device_id not in DataStore.interfaces:
        return jsonify({'error': 'Interfaces not available for this device'}), 404
    
    interfaces = DataStore.interfaces[device_id]
    
    return jsonify({
        'interfaces': [
            {
                'name': interface.name,
                'type': interface.type,
                'running': interface.running,
                'disabled': interface.disabled,
                'rx_byte': interface.rx_byte,
                'tx_byte': interface.tx_byte,
                'rx_packet': interface.rx_packet,
                'tx_packet': interface.tx_packet,
                'rx_error': interface.rx_error,
                'tx_error': interface.tx_error,
                'rx_drop': interface.rx_drop,
                'tx_drop': interface.tx_drop,
                'rx_speed': interface.rx_speed,
                'tx_speed': interface.tx_speed,
                'last_link_down_time': interface.last_link_down_time,
                'last_link_up_time': interface.last_link_up_time,
                'actual_mtu': interface.actual_mtu,
                'mac_address': interface.mac_address,
                'timestamp': interface.timestamp.isoformat() if interface.timestamp else None
            }
            for interface in interfaces
        ]
    })

@api.route('/interfaces/history/<device_id>/<interface_name>', methods=['GET'])
def get_interface_history(device_id, interface_name):
    """Get interface history for a specific interface"""
    if (device_id not in DataStore.interface_history or 
        interface_name not in DataStore.interface_history[device_id]):
        return jsonify({'error': 'Interface history not available'}), 404
    
    return jsonify({
        'history': DataStore.interface_history[device_id][interface_name]
    })

@api.route('/ip/<device_id>', methods=['GET'])
def get_ip_addresses(device_id):
    """Get IP addresses for a device"""
    if device_id not in DataStore.ip_addresses:
        return jsonify({'error': 'IP addresses not available for this device'}), 404
    
    addresses = DataStore.ip_addresses[device_id]
    
    return jsonify({
        'addresses': [
            {
                'address': addr.address,
                'network': addr.network,
                'interface': addr.interface,
                'dynamic': addr.dynamic,
                'disabled': addr.disabled,
                'comment': addr.comment,
                'timestamp': addr.timestamp.isoformat() if addr.timestamp else None
            }
            for addr in addresses
        ]
    })

@api.route('/arp/<device_id>', methods=['GET'])
def get_arp_entries(device_id):
    """Get ARP entries for a device"""
    if device_id not in DataStore.arp_entries:
        return jsonify({'error': 'ARP entries not available for this device'}), 404
    
    entries = DataStore.arp_entries[device_id]
    
    return jsonify({
        'entries': [
            {
                'address': entry.address,
                'mac_address': entry.mac_address,
                'interface': entry.interface,
                'dynamic': entry.dynamic,
                'complete': entry.complete,
                'timestamp': entry.timestamp.isoformat() if entry.timestamp else None
            }
            for entry in entries
        ]
    })

@api.route('/dhcp/<device_id>', methods=['GET'])
def get_dhcp_leases(device_id):
    """Get DHCP leases for a device"""
    if device_id not in DataStore.dhcp_leases:
        return jsonify({'error': 'DHCP leases not available for this device'}), 404
    
    leases = DataStore.dhcp_leases[device_id]
    
    return jsonify({
        'leases': [
            {
                'address': lease.address,
                'mac_address': lease.mac_address,
                'client_id': lease.client_id,
                'hostname': lease.hostname,
                'status': lease.status,
                'expires_after': lease.expires_after,
                'timestamp': lease.timestamp.isoformat() if lease.timestamp else None
            }
            for lease in leases
        ]
    })

@api.route('/firewall/<device_id>', methods=['GET'])
def get_firewall_rules(device_id):
    """Get firewall rules for a device"""
    if device_id not in DataStore.firewall_rules:
        return jsonify({'error': 'Firewall rules not available for this device'}), 404
    
    rules = DataStore.firewall_rules[device_id]
    
    return jsonify({
        'rules': [
            {
                'chain': rule.chain,
                'action': rule.action,
                'disabled': rule.disabled,
                'comment': rule.comment,
                'bytes': rule.bytes,
                'packets': rule.packets,
                'timestamp': rule.timestamp.isoformat() if rule.timestamp else None
            }
            for rule in rules
        ]
    })

@api.route('/wireless/<device_id>', methods=['GET'])
def get_wireless_clients(device_id):
    """Get wireless clients for a device"""
    if device_id not in DataStore.wireless_clients:
        return jsonify({'error': 'Wireless clients not available for this device'}), 404
    
    clients = DataStore.wireless_clients[device_id]
    
    return jsonify({
        'clients': [
            {
                'interface': client.interface,
                'mac_address': client.mac_address,
                'signal_strength': client.signal_strength,
                'tx_rate': client.tx_rate,
                'rx_rate': client.rx_rate,
                'tx_bytes': client.tx_bytes,
                'rx_bytes': client.rx_bytes,
                'uptime': client.uptime,
                'timestamp': client.timestamp.isoformat() if client.timestamp else None
            }
            for client in clients
        ]
    })

@api.route('/logs/<device_id>', methods=['GET'])
def get_logs(device_id):
    """Get logs for a device"""
    if device_id not in DataStore.logs:
        return jsonify({'error': 'Logs not available for this device'}), 404
    
    logs = DataStore.logs[device_id]
    
    return jsonify({
        'logs': [
            {
                'time': log.time,
                'topics': log.topics,
                'message': log.message,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None
            }
            for log in logs
        ]
    })

@api.route('/capsman/<device_id>', methods=['GET'])
def get_capsman_registrations(device_id):
    """Get CAPsMAN registrations for a device"""
    if device_id not in DataStore.capsman_registrations:
        return jsonify({'error': 'CAPsMAN registrations not available for this device'}), 404
    
    registrations = DataStore.capsman_registrations[device_id]
    
    return jsonify({
        'registrations': [
            {
                'interface': reg.interface,
                'radio_name': reg.radio_name,
                'mac_address': reg.mac_address,
                'remote_ap_mac': reg.remote_ap_mac,
                'signal_strength': reg.signal_strength,
                'tx_rate': reg.tx_rate,
                'rx_rate': reg.rx_rate,
                'tx_bytes': reg.tx_bytes,
                'rx_bytes': reg.rx_bytes,
                'uptime': reg.uptime,
                'ssid': reg.ssid,
                'channel': reg.channel,
                'comment': reg.comment,
                'status': reg.status,
                'timestamp': reg.timestamp.isoformat() if reg.timestamp else None
            }
            for reg in registrations
        ]
    })

@api.route('/alerts', methods=['GET'])
def get_alerts():
    """Get all alerts"""
    device_id = request.args.get('device_id')
    
    if device_id:
        # Filter alerts for specific device
        alerts = [alert for alert in DataStore.alerts if alert.device_id == device_id]
    else:
        alerts = DataStore.alerts
    
    return jsonify({
        'alerts': [
            {
                'device_id': alert.device_id,
                'type': alert.type,
                'message': alert.message,
                'severity': alert.severity,
                'created': alert.created.isoformat() if alert.created else None,
                'active': alert.active,
                'resolved': alert.resolved,
                'resolved_time': alert.resolved_time.isoformat() if alert.resolved_time else None
            }
            for alert in alerts
        ]
    })

@api.route('/alerts/<alert_id>/resolve', methods=['POST'])
def resolve_alert(alert_id):
    """Resolve an alert"""
    try:
        alert_id = int(alert_id)
        if 0 <= alert_id < len(DataStore.alerts):
            DataStore.alerts[alert_id].active = False
            DataStore.alerts[alert_id].resolved = True
            DataStore.alerts[alert_id].resolved_time = datetime.now()
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Alert not found'}), 404
    except ValueError:
        return jsonify({'error': 'Invalid alert ID'}), 400
    except Exception as e:
        logger.error(f"Error resolving alert: {e}")
        return jsonify({'error': str(e)}), 500

@api.route('/refresh/<device_id>', methods=['POST'])
def refresh_device(device_id):
    """Manually refresh data for a device"""
    if device_id not in DataStore.devices:
        return jsonify({'error': 'Device not found'}), 404
    
    try:
        result = mikrotik_api.collect_all_data(device_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error refreshing device data: {e}")
        return jsonify({'error': str(e)}), 500
