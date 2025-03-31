import logging
import socket
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import time

# Import RouterOS API library
try:
    import routeros_api
    from routeros_api.exceptions import RouterOsApiConnectionError, RouterOsApiError
except ImportError:
    logging.error("RouterOS API library not found. Please install it with: pip install routeros-api")
    # Define minimal classes for type hints to work
    class RouterOsApiConnectionError(Exception): pass
    class RouterOsApiError(Exception): pass
    routeros_api = None

from models import (
    Device, SystemResources, Interface, IPAddress, 
    ArpEntry, DHCPLease, FirewallRule, WirelessClient,
    CapsmanRegistration, LogEntry, Alert, DataStore
)
import config

logger = logging.getLogger(__name__)

class MikrotikAPI:
    def __init__(self):
        self.connections: Dict[str, Any] = {}
        
    def connect(self, device: Device) -> Tuple[bool, Optional[str]]:
        """Connect to a Mikrotik device"""
        if device.id in self.connections:
            # Already connected
            return True, None
        
        # Get global settings or use device-specific settings
        global_use_ssl = config.load_config().get('use_ssl', False)
        connection_timeout = config.load_config().get('connection_timeout', 10)
        max_retries = config.load_config().get('connection_retries', 2)
        retry_delay = config.load_config().get('retry_delay', 1)
        
        # Device-specific SSL setting takes precedence over global
        use_ssl = device.use_ssl if hasattr(device, 'use_ssl') else global_use_ssl
        
        retry_count = 0
        last_error = None
        
        while retry_count <= max_retries:
            try:
                # Add socket timeout to prevent hanging on unreachable hosts
                socket.setdefaulttimeout(connection_timeout)
                
                logger.info(f"Connecting to {device.name} ({device.host}) on port {device.port}" + 
                            f" with SSL {'enabled' if use_ssl else 'disabled'}")
                
                connection = routeros_api.RouterOsApiPool(
                    host=device.host,
                    port=device.port,
                    username=device.username,
                    password=device.password,
                    plaintext_login=not use_ssl,
                    use_ssl=use_ssl
                )
                
                # Try to get the API connection
                api = connection.get_api()
                
                # If successful, store the connection
                self.connections[device.id] = {
                    'connection': connection,
                    'api': api
                }
                device.last_connected = datetime.now()
                device.error_message = None
                DataStore.devices[device.id] = device
                
                # Log successful connection
                logger.info(f"Successfully connected to {device.name} ({device.host})")
                
                return True, None
                
            except RouterOsApiConnectionError as e:
                last_error = f"Failed to connect to {device.host}: {str(e)}"
                logger.error(last_error)
                retry_count += 1
                
                if retry_count <= max_retries:
                    logger.info(f"Retrying connection to {device.host} ({retry_count}/{max_retries}) in {retry_delay} second(s)")
                    time.sleep(retry_delay)  # Wait before retrying
                    
            except socket.timeout:
                last_error = f"Connection to {device.host} timed out after {connection_timeout} seconds"
                logger.error(last_error)
                retry_count += 1
                
                if retry_count <= max_retries:
                    logger.info(f"Retrying connection to {device.host} ({retry_count}/{max_retries}) in {retry_delay} second(s)")
                    time.sleep(retry_delay)  # Wait before retrying
                    
            except Exception as e:
                last_error = f"Unexpected error connecting to {device.host}: {str(e)}"
                logger.error(last_error)
                retry_count += 1
                
                if retry_count <= max_retries:
                    logger.info(f"Retrying connection to {device.host} ({retry_count}/{max_retries}) in {retry_delay} second(s)")
                    time.sleep(retry_delay)  # Wait before retrying
        
        # If we got here, all retries failed
        device.error_message = last_error
        device.last_connected = None
        DataStore.devices[device.id] = device
        return False, last_error
    
    def disconnect(self, device_id: str) -> None:
        """Disconnect from a device"""
        if device_id in self.connections:
            try:
                self.connections[device_id]['connection'].disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting from device {device_id}: {e}")
            finally:
                del self.connections[device_id]
    
    def disconnect_all(self) -> None:
        """Disconnect from all devices"""
        for device_id in list(self.connections.keys()):
            self.disconnect(device_id)
    
    def get_api(self, device_id: str) -> Optional[Any]:
        """Get the API connection for a device"""
        if device_id in self.connections:
            return self.connections[device_id]['api']
        return None
    
    def collect_system_resources(self, device_id: str) -> Optional[SystemResources]:
        """Collect system resources from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resources = api.get_resource('/system/resource')
            resource_data = resources.get()[0]
            
            identity_resource = api.get_resource('/system/identity')
            identity_data = identity_resource.get()[0]
            
            system_resources = SystemResources(
                device_id=device_id,
                uptime=resource_data.get('uptime', ''),
                version=resource_data.get('version', ''),
                cpu_load=float(resource_data.get('cpu-load', 0)),
                free_memory=int(resource_data.get('free-memory', 0)),
                total_memory=int(resource_data.get('total-memory', 0)),
                free_hdd=int(resource_data.get('free-hdd-space', 0)),
                total_hdd=int(resource_data.get('total-hdd-space', 0)),
                architecture_name=resource_data.get('architecture-name', ''),
                board_name=resource_data.get('board-name', ''),
                platform=resource_data.get('platform', ''),
                timestamp=datetime.now()
            )
            
            DataStore.system_resources[device_id] = system_resources
            
            # Add to history
            if device_id not in DataStore.system_history:
                DataStore.system_history[device_id] = []
            
            history_item = {
                'timestamp': system_resources.timestamp.isoformat(),
                'cpu_load': system_resources.cpu_load,
                'free_memory': system_resources.free_memory,
                'total_memory': system_resources.total_memory,
                'memory_usage': ((system_resources.total_memory - system_resources.free_memory) / 
                                system_resources.total_memory * 100) if system_resources.total_memory > 0 else 0
            }
            
            DataStore.system_history[device_id].append(history_item)
            
            # Keep limited history points
            max_points = config.load_config().get('system_history_points', 288)
            if len(DataStore.system_history[device_id]) > max_points:
                DataStore.system_history[device_id] = DataStore.system_history[device_id][-max_points:]
            
            # Check thresholds for alerts
            self._check_resource_thresholds(device_id, system_resources)
            
            return system_resources
            
        except Exception as e:
            logger.error(f"Error collecting system resources from {device_id}: {e}")
            return None
    
    def collect_interfaces(self, device_id: str) -> Optional[List[Interface]]:
        """Collect interfaces data from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            interface_resource = api.get_resource('/interface')
            interfaces_data = interface_resource.get()
            
            # Get interface statistics
            stats_resource = api.get_resource('/interface/ethernet')
            stats_data = {item.get('.id'): item for item in stats_resource.get()}
            
            interfaces = []
            for iface_data in interfaces_data:
                name = iface_data.get('name', '')
                
                # Get previous interface data if exists
                prev_interface = next((i for i in DataStore.interfaces.get(device_id, []) if i.name == name), None)
                
                interface = Interface(
                    device_id=device_id,
                    name=name,
                    type=iface_data.get('type', ''),
                    running=iface_data.get('running', 'false') == 'true',
                    disabled=iface_data.get('disabled', 'false') == 'true',
                    rx_byte=int(iface_data.get('rx-byte', 0)),
                    tx_byte=int(iface_data.get('tx-byte', 0)),
                    rx_packet=int(iface_data.get('rx-packet', 0)),
                    tx_packet=int(iface_data.get('tx-packet', 0)),
                    rx_error=int(iface_data.get('rx-error', 0)),
                    tx_error=int(iface_data.get('tx-error', 0)),
                    rx_drop=int(iface_data.get('rx-drop', 0)),
                    tx_drop=int(iface_data.get('tx-drop', 0)),
                    last_link_down_time=iface_data.get('last-link-down-time', ''),
                    last_link_up_time=iface_data.get('last-link-up-time', ''),
                    actual_mtu=int(iface_data.get('actual-mtu', 0)),
                    mac_address=iface_data.get('mac-address', ''),
                    timestamp=datetime.now()
                )
                
                # Calculate speed (bytes per second)
                if prev_interface:
                    time_diff = (interface.timestamp - prev_interface.timestamp).total_seconds()
                    if time_diff > 0:
                        interface.prev_rx_byte = prev_interface.rx_byte
                        interface.prev_tx_byte = prev_interface.tx_byte
                        # Calculate speed in bytes per second
                        rx_diff = interface.rx_byte - prev_interface.rx_byte
                        tx_diff = interface.tx_byte - prev_interface.tx_byte
                        interface.rx_speed = rx_diff / time_diff if rx_diff >= 0 else 0
                        interface.tx_speed = tx_diff / time_diff if tx_diff >= 0 else 0
                
                interfaces.append(interface)
                
                # Add to interface history for charts
                if device_id not in DataStore.interface_history:
                    DataStore.interface_history[device_id] = {}
                
                if interface.name not in DataStore.interface_history[device_id]:
                    DataStore.interface_history[device_id][interface.name] = []
                
                # Add current data point to history
                history_item = {
                    'timestamp': interface.timestamp.isoformat(),
                    'rx_byte': interface.rx_byte,
                    'tx_byte': interface.tx_byte,
                    'rx_speed': interface.rx_speed,
                    'tx_speed': interface.tx_speed
                }
                
                DataStore.interface_history[device_id][interface.name].append(history_item)
                
                # Keep limited history points
                max_points = config.load_config().get('interface_history_points', 288)
                if len(DataStore.interface_history[device_id][interface.name]) > max_points:
                    DataStore.interface_history[device_id][interface.name] = DataStore.interface_history[device_id][interface.name][-max_points:]
            
            DataStore.interfaces[device_id] = interfaces
            
            # Check for alerts
            self._check_interface_alerts(device_id, interfaces)
            
            return interfaces
            
        except Exception as e:
            logger.error(f"Error collecting interfaces from {device_id}: {e}")
            return None
    
    def collect_ip_addresses(self, device_id: str) -> Optional[List[IPAddress]]:
        """Collect IP addresses from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/ip/address')
            addresses_data = resource.get()
            
            addresses = []
            for addr_data in addresses_data:
                address = IPAddress(
                    device_id=device_id,
                    address=addr_data.get('address', ''),
                    network=addr_data.get('network', ''),
                    interface=addr_data.get('interface', ''),
                    dynamic=addr_data.get('dynamic', 'false') == 'true',
                    disabled=addr_data.get('disabled', 'false') == 'true',
                    comment=addr_data.get('comment', ''),
                    timestamp=datetime.now()
                )
                addresses.append(address)
            
            DataStore.ip_addresses[device_id] = addresses
            return addresses
            
        except Exception as e:
            logger.error(f"Error collecting IP addresses from {device_id}: {e}")
            return None
    
    def collect_arp(self, device_id: str) -> Optional[List[ArpEntry]]:
        """Collect ARP entries from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/ip/arp')
            arp_data = resource.get()
            
            entries = []
            for entry_data in arp_data:
                entry = ArpEntry(
                    device_id=device_id,
                    address=entry_data.get('address', ''),
                    mac_address=entry_data.get('mac-address', ''),
                    interface=entry_data.get('interface', ''),
                    dynamic=entry_data.get('dynamic', 'false') == 'true',
                    complete=entry_data.get('complete', 'false') == 'true',
                    timestamp=datetime.now()
                )
                entries.append(entry)
            
            DataStore.arp_entries[device_id] = entries
            return entries
            
        except Exception as e:
            logger.error(f"Error collecting ARP entries from {device_id}: {e}")
            return None
    
    def collect_dhcp_leases(self, device_id: str) -> Optional[List[DHCPLease]]:
        """Collect DHCP leases from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/ip/dhcp-server/lease')
            lease_data = resource.get()
            
            leases = []
            for lease in lease_data:
                dhcp_lease = DHCPLease(
                    device_id=device_id,
                    address=lease.get('address', ''),
                    mac_address=lease.get('mac-address', ''),
                    client_id=lease.get('client-id', ''),
                    hostname=lease.get('host-name', ''),
                    status=lease.get('status', ''),
                    expires_after=lease.get('expires-after', ''),
                    timestamp=datetime.now()
                )
                leases.append(dhcp_lease)
            
            DataStore.dhcp_leases[device_id] = leases
            return leases
            
        except Exception as e:
            logger.error(f"Error collecting DHCP leases from {device_id}: {e}")
            return None
    
    def collect_firewall_rules(self, device_id: str) -> Optional[List[FirewallRule]]:
        """Collect firewall rules from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/ip/firewall/filter')
            rules_data = resource.get()
            
            rules = []
            for rule_data in rules_data:
                rule = FirewallRule(
                    device_id=device_id,
                    chain=rule_data.get('chain', ''),
                    action=rule_data.get('action', ''),
                    disabled=rule_data.get('disabled', 'false') == 'true',
                    comment=rule_data.get('comment', ''),
                    bytes=int(rule_data.get('bytes', 0)),
                    packets=int(rule_data.get('packets', 0)),
                    timestamp=datetime.now()
                )
                rules.append(rule)
            
            DataStore.firewall_rules[device_id] = rules
            return rules
            
        except Exception as e:
            logger.error(f"Error collecting firewall rules from {device_id}: {e}")
            return None
    
    def collect_wireless_clients(self, device_id: str) -> Optional[List[WirelessClient]]:
        """Collect wireless clients from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/interface/wireless/registration-table')
            clients_data = resource.get()
            
            clients = []
            for client_data in clients_data:
                client = WirelessClient(
                    device_id=device_id,
                    interface=client_data.get('interface', ''),
                    mac_address=client_data.get('mac-address', ''),
                    signal_strength=int(client_data.get('signal-strength', 0)),
                    tx_rate=int(client_data.get('tx-rate', 0)),
                    rx_rate=int(client_data.get('rx-rate', 0)),
                    tx_bytes=int(client_data.get('tx-bytes', 0)),
                    rx_bytes=int(client_data.get('rx-bytes', 0)),
                    uptime=client_data.get('uptime', ''),
                    timestamp=datetime.now()
                )
                clients.append(client)
            
            DataStore.wireless_clients[device_id] = clients
            return clients
            
        except Exception as e:
            logger.error(f"Error collecting wireless clients from {device_id}: {e}")
            return None
    
    def collect_capsman_registrations(self, device_id: str) -> Optional[List[CapsmanRegistration]]:
        """Collect CAPsMAN registrations from a device"""
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            # Try to get CAPsMAN registrations - this may not be available on all devices
            try:
                resource = api.get_resource('/caps-man/registration-table')
                registrations_data = resource.get()
            except RouterOsApiError:
                # CAPsMAN might not be enabled on this device
                logger.info(f"CAPsMAN not available on device {device_id}")
                DataStore.capsman_registrations[device_id] = []
                return []
            
            registrations = []
            for reg_data in registrations_data:
                registration = CapsmanRegistration(
                    device_id=device_id,
                    interface=reg_data.get('interface', ''),
                    radio_name=reg_data.get('radio-name', ''),
                    mac_address=reg_data.get('mac-address', ''),
                    remote_ap_mac=reg_data.get('remote-cap-mac', ''),
                    signal_strength=int(reg_data.get('signal-strength', 0)),
                    tx_rate=int(reg_data.get('tx-rate', 0)),
                    rx_rate=int(reg_data.get('rx-rate', 0)),
                    tx_bytes=int(reg_data.get('tx-bytes', 0)),
                    rx_bytes=int(reg_data.get('rx-bytes', 0)),
                    uptime=reg_data.get('uptime', ''),
                    ssid=reg_data.get('ssid', ''),
                    channel=reg_data.get('channel', ''),
                    comment=reg_data.get('comment', ''),
                    status=reg_data.get('status', ''),
                    timestamp=datetime.now()
                )
                registrations.append(registration)
            
            DataStore.capsman_registrations[device_id] = registrations
            return registrations
            
        except Exception as e:
            logger.error(f"Error collecting CAPsMAN registrations from {device_id}: {e}")
            return None
    
    def collect_logs(self, device_id: str, limit: int = 100) -> Optional[List[LogEntry]]:
        """Collect logs from a device"""
        api = self.get_api(device_id)
        if not api:
            logger.error(f"Cannot collect logs: No API connection for device {device_id}")
            return None
        
        try:
            resource = api.get_resource('/log')
            # Get the latest logs
            # Use string value for limit to avoid 'int' object has no attribute 'encode' error
            log_data = resource.get(limit=str(limit))
            
            logs = []
            for log in log_data:
                # Convert all values to string to ensure type safety
                time_val = str(log.get('time', '')) if log.get('time') is not None else ''
                topics_val = str(log.get('topics', '')) if log.get('topics') is not None else ''
                message_val = str(log.get('message', '')) if log.get('message') is not None else ''
                
                log_entry = LogEntry(
                    device_id=device_id,
                    time=time_val,
                    topics=topics_val,
                    message=message_val,
                    timestamp=datetime.now()
                )
                logs.append(log_entry)
            
            DataStore.logs[device_id] = logs
            return logs
            
        except RouterOsApiError as e:
            logger.error(f"RouterOS API error collecting logs from {device_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error collecting logs from {device_id}: {e}")
            return None
    
    def collect_all_data(self, device_id: str) -> Dict[str, bool]:
        """Collect all data from a device"""
        device = DataStore.devices.get(device_id)
        if not device or not device.enabled:
            return {
                "success": False,
                "error": "Device not found or disabled"
            }
        
        # Try to connect if not already connected
        if device_id not in self.connections:
            success, error_message = self.connect(device)
            if not success:
                return {
                    "success": False,
                    "error": error_message or "Failed to connect"
                }
        
        results = {
            "system": self.collect_system_resources(device_id) is not None,
            "interfaces": self.collect_interfaces(device_id) is not None,
            "ip_addresses": self.collect_ip_addresses(device_id) is not None,
            "arp": self.collect_arp(device_id) is not None,
            "dhcp": self.collect_dhcp_leases(device_id) is not None,
            "firewall": self.collect_firewall_rules(device_id) is not None,
            "wireless": self.collect_wireless_clients(device_id) is not None,
            "capsman": self.collect_capsman_registrations(device_id) is not None,
            "logs": self.collect_logs(device_id) is not None
        }
        
        return {
            "success": all(results.values()),
            "results": results
        }
    
    def _check_resource_thresholds(self, device_id: str, resources: SystemResources) -> None:
        """Check system resources against thresholds and generate alerts"""
        thresholds = config.get_thresholds()
        device = DataStore.devices.get(device_id)
        if not device:
            return
        
        # Check CPU load
        if resources.cpu_load > thresholds.get('cpu_load', 80):
            self._add_alert(
                device_id=device_id,
                alert_type='cpu_load',
                message=f"High CPU load on {device.name}: {resources.cpu_load}%",
                severity='warning'
            )
        
        # Check memory usage
        if resources.total_memory > 0:
            memory_usage = (resources.total_memory - resources.free_memory) / resources.total_memory * 100
            if memory_usage > thresholds.get('memory_usage', 80):
                self._add_alert(
                    device_id=device_id,
                    alert_type='memory_usage',
                    message=f"High memory usage on {device.name}: {memory_usage:.2f}%",
                    severity='warning'
                )
        
        # Check disk usage
        if resources.total_hdd > 0:
            disk_usage = (resources.total_hdd - resources.free_hdd) / resources.total_hdd * 100
            if disk_usage > thresholds.get('disk_usage', 80):
                self._add_alert(
                    device_id=device_id,
                    alert_type='disk_usage',
                    message=f"High disk usage on {device.name}: {disk_usage:.2f}%",
                    severity='warning'
                )
    
    def _check_interface_alerts(self, device_id: str, interfaces: List[Interface]) -> None:
        """Check interfaces for issues and generate alerts"""
        device = DataStore.devices.get(device_id)
        if not device:
            return
        
        for interface in interfaces:
            # Check if interface is down (not running and not disabled)
            if not interface.running and not interface.disabled and interface.type != 'bridge':
                self._add_alert(
                    device_id=device_id,
                    alert_type='interface_down',
                    message=f"Interface {interface.name} on {device.name} is down",
                    severity='error'
                )
            
            # Check for interface errors
            if interface.rx_error > 0 or interface.tx_error > 0:
                self._add_alert(
                    device_id=device_id,
                    alert_type='interface_errors',
                    message=f"Interface {interface.name} on {device.name} has errors (RX: {interface.rx_error}, TX: {interface.tx_error})",
                    severity='warning'
                )
            
            # Check for interface drops
            if interface.rx_drop > 0 or interface.tx_drop > 0:
                self._add_alert(
                    device_id=device_id,
                    alert_type='interface_drops',
                    message=f"Interface {interface.name} on {device.name} has packet drops (RX: {interface.rx_drop}, TX: {interface.tx_drop})",
                    severity='info'
                )
    
    def _add_alert(self, device_id: str, alert_type: str, message: str, severity: str) -> None:
        """Add an alert to the alerts list"""
        # Check if similar alert already exists
        for alert in DataStore.alerts:
            if (alert.device_id == device_id and 
                alert.type == alert_type and 
                alert.active and not alert.resolved):
                # Alert already exists
                return
        
        # Add new alert
        alert = Alert(
            device_id=device_id,
            type=alert_type,
            message=message,
            severity=severity
        )
        DataStore.alerts.append(alert)
        
        # Log the alert
        logger.warning(f"Alert: {message}")

# Initialize the Mikrotik API
mikrotik_api = MikrotikAPI()
