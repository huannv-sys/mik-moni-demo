import logging
import socket
import random
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import time
import traceback

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
        """Disconnect from a device and update its status"""
        from models import DataStore
        
        if device_id in self.connections:
            try:
                self.connections[device_id]['connection'].disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting from device {device_id}: {e}")
            finally:
                del self.connections[device_id]
        
        # Cập nhật trạng thái thiết bị
        if device_id in DataStore.devices:
            DataStore.devices[device_id].last_connected = None
            DataStore.devices[device_id].error_message = "Thiết bị đã bị ngắt kết nối"
    
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
                        
                        # Tính toán tốc độ trong bytes/second
                        interface.rx_speed = rx_diff / time_diff if rx_diff >= 0 else 0
                        interface.tx_speed = tx_diff / time_diff if tx_diff >= 0 else 0
                        
                        # Thử lấy tốc độ thực tế từ giao diện Mikrotik nếu có
                        try:
                            # Thử lấy thông tin tốc độ từ giao diện Ethernet hoặc phần cứng
                            if iface_data.get('type') == 'ether':
                                eth_resource = api.get_resource('/interface/ethernet')
                                eth_data = eth_resource.get(name=interface.name)
                                if eth_data and len(eth_data) > 0:
                                    # Lấy tốc độ hiện tại nếu có
                                    rate = eth_data[0].get('rate', None)
                                    if rate:
                                        logger.debug(f"Retrieved actual rate for {interface.name}: {rate}")
                            
                            # Đặt biến để kiểm soát luồng
                            monitor_traffic_success = False
                            
                            # Thử lấy dữ liệu từ MikroTik API monitor-traffic (API chuyên biệt cho tốc độ thời gian thực)
                            try:
                                # Ghi log chuẩn bị sử dụng monitor-traffic API
                                logger.debug(f"Using monitor-traffic API for {interface.name}")
                                
                                # Phương pháp mới không sử dụng thông số 'interface' trực tiếp mà lọc theo tên sau khi gọi API
                                # Sử dụng monitor-traffic API - đây là API chuyên biệt của MikroTik để theo dõi lưu lượng mạng thời gian thực
                                monitor_resource = api.get_resource('/interface/monitor-traffic')
                                
                                # Thực hiện lệnh monitor-traffic không có tham số interface
                                monitor_params = {
                                    'once': 'true'
                                }
                                
                                # Thực hiện lệnh monitor-traffic
                                monitor_result = monitor_resource.call(**monitor_params)
                                
                                # Ghi log số lượng kết quả nhận được cho việc debug
                                logger.debug(f"Monitor traffic returned {len(monitor_result) if monitor_result else 0} results")
                                
                                # Tìm interface phù hợp trong kết quả
                                monitor_traffic_success = False
                                if monitor_result and len(monitor_result) > 0:
                                    # Tìm kiếm dữ liệu của interface cụ thể trong kết quả
                                    for traffic_item in monitor_result:
                                        if traffic_item.get('name') == interface.name:
                                            # Lấy tốc độ rx/tx từ kết quả
                                            rx_bits_per_second = int(traffic_item.get('rx-bits-per-second', 0))
                                            tx_bits_per_second = int(traffic_item.get('tx-bits-per-second', 0))
                                            
                                            # Chuyển đổi từ bits/second sang bytes/second (1 byte = 8 bits)
                                            interface.rx_speed = rx_bits_per_second / 8
                                            interface.tx_speed = tx_bits_per_second / 8
                                            
                                            # Ghi log để debug
                                            logger.debug(f"Retrieved real-time speed for {interface.name} using monitor-traffic API")
                                            logger.debug(f"RX: {rx_bits_per_second} bps = {interface.rx_speed} Bps, TX: {tx_bits_per_second} bps = {interface.tx_speed} Bps")
                                            
                                            # Đánh dấu là đã lấy dữ liệu thành công từ API chuyên biệt
                                            monitor_traffic_success = True
                                            break
                                    
                                    if not monitor_traffic_success:
                                        logger.debug(f"monitor-traffic API did not return data for {interface.name}, falling back to calculated speeds")
                                else:
                                    logger.debug(f"monitor-traffic API did not return valid data, falling back to calculated speeds")
                            except Exception as monitor_error:
                                # Nếu có lỗi khi sử dụng API chuyên biệt, ghi log và tiếp tục với phương pháp tính toán thông thường
                                logger.debug(f"Failed to use monitor-traffic API for {interface.name}: {monitor_error}")
                                logger.debug(f"Falling back to calculated speeds for {interface.name}")
                            
                            # Nếu API chuyên biệt không thành công, sử dụng phương pháp tính toán từ dữ liệu counter
                            if not monitor_traffic_success:
                                # Logs để gỡ lỗi
                                logger.debug(f"Using calculated speeds for {interface.name}")
                                logger.debug(f"Interface {interface.name}: RX bytes = {interface.rx_byte}, TX bytes = {interface.tx_byte}")
                                logger.debug(f"Interface {interface.name}: Previous RX bytes = {interface.prev_rx_byte}, Previous TX bytes = {interface.prev_tx_byte}")
                                
                                # Lấy khoảng thời gian refresh từ cấu hình
                                time_diff = config.get_refresh_interval()  # Lấy refresh interval từ cấu hình
                                
                                # Lấy thời gian chính xác đến mili giây
                                now = datetime.now()
                                time_diff_ms = time_diff
                                
                                # Nếu có timestamp trước đó, tính thời gian chính xác hơn
                                if hasattr(interface, 'last_calculation_time') and interface.last_calculation_time:
                                    time_diff_ms = (now - interface.last_calculation_time).total_seconds()
                                
                                # Cập nhật timestamp cho lần tính tiếp theo
                                interface.last_calculation_time = now
                                
                                # Tính tốc độ RX (bytes/second) với độ chính xác cao hơn
                                rx_diff = interface.rx_byte - interface.prev_rx_byte if interface.prev_rx_byte > 0 else 0
                                if rx_diff < 0:  # Trường hợp counter bị reset
                                    rx_diff = interface.rx_byte
                                
                                # Dùng time_diff_ms chính xác nếu có, ngược lại dùng khoảng thời gian từ cấu hình
                                actual_time_diff = time_diff_ms if time_diff_ms > 0 else time_diff
                                
                                # Tính tốc độ với nhiều thập phân hơn và làm tròn để tránh hiện tượng giá trị 0
                                if actual_time_diff > 0:
                                    interface.rx_speed = round(rx_diff / actual_time_diff, 3)
                                    
                                    # Đảm bảo giá trị nhỏ không bị làm tròn thành 0
                                    if rx_diff > 0 and interface.rx_speed < 0.001:
                                        interface.rx_speed = 0.001  # Giá trị tối thiểu để hiển thị
                                else:
                                    interface.rx_speed = 0
                                
                                # Tính tốc độ TX (bytes/second) với độ chính xác cao hơn
                                tx_diff = interface.tx_byte - interface.prev_tx_byte if interface.prev_tx_byte > 0 else 0
                                if tx_diff < 0:  # Trường hợp counter bị reset
                                    tx_diff = interface.tx_byte
                                
                                # Tính tốc độ với nhiều thập phân hơn
                                if actual_time_diff > 0:
                                    interface.tx_speed = round(tx_diff / actual_time_diff, 3)
                                    
                                    # Đảm bảo giá trị nhỏ không bị làm tròn thành 0
                                    if tx_diff > 0 and interface.tx_speed < 0.001:
                                        interface.tx_speed = 0.001  # Giá trị tối thiểu để hiển thị
                                else:
                                    interface.tx_speed = 0
                                
                                # Ghi log kết quả tính toán
                                logger.debug(f"Calculated speeds for {interface.name}: RX={interface.rx_speed} bytes/s, TX={interface.tx_speed} bytes/s")
                        except Exception as e:
                            # Nếu không lấy được tốc độ thực tế, sử dụng tốc độ tính toán
                            logger.debug(f"Failed to retrieve real-time speed for {interface.name}: {e}")
                            # Đặt tốc độ = 0 nếu có lỗi
                            interface.rx_speed = 0
                            interface.tx_speed = 0
                
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
        from mac_vendor import mac_vendor_lookup
        
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/ip/arp')
            arp_data = resource.get()
            
            entries = []
            for entry_data in arp_data:
                mac_address = entry_data.get('mac-address', '')
                # Tìm thông tin nhà sản xuất từ MAC address
                vendor = ""
                device_type = ""
                if mac_address:
                    try:
                        vendor = mac_vendor_lookup.lookup(mac_address) or ""
                        if vendor:
                            device_type = mac_vendor_lookup.get_device_type(vendor)
                    except Exception as e:
                        logger.warning(f"Error looking up vendor for MAC {mac_address}: {e}")
                
                entry = ArpEntry(
                    device_id=device_id,
                    address=entry_data.get('address', ''),
                    mac_address=mac_address,
                    interface=entry_data.get('interface', ''),
                    dynamic=entry_data.get('dynamic', 'false') == 'true',
                    complete=entry_data.get('complete', 'false') == 'true',
                    vendor=vendor,
                    device_type=device_type,
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
        from mac_vendor import mac_vendor_lookup
        
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/ip/dhcp-server/lease')
            lease_data = resource.get()
            
            leases = []
            for lease in lease_data:
                mac_address = lease.get('mac-address', '')
                # Tìm thông tin nhà sản xuất từ MAC address
                vendor = ""
                device_type = ""
                if mac_address:
                    try:
                        vendor = mac_vendor_lookup.lookup(mac_address) or ""
                        if vendor:
                            device_type = mac_vendor_lookup.get_device_type(vendor)
                    except Exception as e:
                        logger.warning(f"Error looking up vendor for MAC {mac_address}: {e}")
                
                dhcp_lease = DHCPLease(
                    device_id=device_id,
                    address=lease.get('address', ''),
                    mac_address=mac_address,
                    client_id=lease.get('client-id', ''),
                    hostname=lease.get('host-name', ''),
                    status=lease.get('status', ''),
                    expires_after=lease.get('expires-after', ''),
                    vendor=vendor,
                    device_type=device_type,
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
        from mac_vendor import mac_vendor_lookup
        
        api = self.get_api(device_id)
        if not api:
            return None
        
        try:
            resource = api.get_resource('/interface/wireless/registration-table')
            clients_data = resource.get()
            
            clients = []
            for client_data in clients_data:
                mac_address = client_data.get('mac-address', '')
                # Tìm thông tin nhà sản xuất từ MAC address
                vendor = ""
                device_type = ""
                if mac_address:
                    try:
                        vendor = mac_vendor_lookup.lookup(mac_address) or ""
                        if vendor:
                            device_type = mac_vendor_lookup.get_device_type(vendor)
                    except Exception as e:
                        logger.warning(f"Error looking up vendor for MAC {mac_address}: {e}")
                
                client = WirelessClient(
                    device_id=device_id,
                    interface=client_data.get('interface', ''),
                    mac_address=mac_address,
                    signal_strength=int(client_data.get('signal-strength', 0)),
                    tx_rate=int(client_data.get('tx-rate', 0)),
                    rx_rate=int(client_data.get('rx-rate', 0)),
                    tx_bytes=int(client_data.get('tx-bytes', 0)),
                    rx_bytes=int(client_data.get('rx-bytes', 0)),
                    uptime=client_data.get('uptime', ''),
                    vendor=vendor,
                    device_type=device_type,
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
        from mac_vendor import mac_vendor_lookup
        
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
                mac_address = reg_data.get('mac-address', '')
                remote_ap_mac = reg_data.get('remote-cap-mac', '')
                
                # Tìm thông tin nhà sản xuất từ MAC address
                vendor = ""
                device_type = ""
                if mac_address:
                    try:
                        vendor = mac_vendor_lookup.lookup(mac_address) or ""
                        if vendor:
                            device_type = mac_vendor_lookup.get_device_type(vendor)
                    except Exception as e:
                        logger.warning(f"Error looking up vendor for MAC {mac_address}: {e}")
                
                registration = CapsmanRegistration(
                    device_id=device_id,
                    interface=reg_data.get('interface', ''),
                    radio_name=reg_data.get('radio-name', ''),
                    mac_address=mac_address,
                    remote_ap_mac=remote_ap_mac,
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
                    vendor=vendor,
                    device_type=device_type,
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
        # Đảm bảo đã import và kiểm tra thư viện requests
        try:
            import requests
            requests_available = True
        except ImportError:
            logger.error("Thư viện 'requests' không được cài đặt. Vui lòng cài đặt bằng lệnh: pip install requests")
            requests_available = False
        
        api = self.get_api(device_id)
        if not api:
            logger.error(f"Cannot collect logs: No API connection for device {device_id}")
            # Tạo một mục nhật ký khẩn cấp để thông báo lỗi kết nối
            emergency_log = LogEntry(
                device_id=device_id,
                time=datetime.now().strftime("%H:%M:%S"),
                topics="error",
                message="Không thể kết nối đến thiết bị để lấy log. Vui lòng kiểm tra kết nối mạng và cấu hình thiết bị.",
                timestamp=datetime.now()
            )
            DataStore.logs[device_id] = [emergency_log]
            return [emergency_log]
        
        try:
            # Sử dụng chuỗi truy vấn Mikrotik API trực tiếp
            log_data = []
            
            # Ghi log để debug
            logger.info(f"Trying to collect logs from device {device_id}")
            
            # Phương pháp 1: Sử dụng đường dẫn '/log'
            success = False
            methods_tried = 0
            
            try:
                logger.debug(f"Method 1: Using '/log' path for device {device_id}")
                resource = api.get_resource('/log')
                log_data = resource.get(limit=str(limit))
                logger.debug(f"Method 1 success: Got {len(log_data)} logs")
                success = True
            except Exception as e:
                methods_tried += 1
                logger.debug(f"Method 1 failed: {str(e)}")
            
            # Nếu phương pháp 1 thất bại, thử phương pháp 2
            if not success:
                try:
                    logger.debug(f"Method 2: Using direct command for device {device_id}")
                    cmd = api.get_binary_resource('/').call('log/print', {'limit': str(limit)})
                    log_data = cmd
                    logger.debug(f"Method 2 success: Got {len(log_data)} logs")
                    success = True
                except Exception as e:
                    methods_tried += 1
                    logger.debug(f"Method 2 failed: {str(e)}")
            
            # Nếu phương pháp 2 thất bại, thử phương pháp 3
            if not success:
                try:
                    logger.debug(f"Method 3: Using '/system/log' path for device {device_id}")
                    resource = api.get_resource('/system/log')
                    log_data = resource.get(limit=str(limit))
                    logger.debug(f"Method 3 success: Got {len(log_data)} logs")
                    success = True
                except Exception as e:
                    methods_tried += 1
                    logger.debug(f"Method 3 failed: {str(e)}")
            
            # Nếu tất cả thất bại và requests khả dụng, thử phương pháp 4 với ping
            if not success and methods_tried >= 3:
                try:
                    logger.debug(f"Method 4: Generating ping log for device {device_id}")
                    ping_resource = api.get_resource('/ping')
                    ping_resource.call(address='8.8.8.8', count='1')
                    
                    # Thử lấy logs lần nữa
                    time.sleep(1)  # Chờ log được tạo
                    resource = api.get_resource('/log')
                    log_data = resource.get(limit='5')
                    logger.debug(f"Method 4 success: Got {len(log_data)} logs")
                    success = True
                except Exception as e:
                    logger.debug(f"Method 4 failed: {str(e)}")
            
            # Nếu tất cả phương pháp đều thất bại
            if not success:
                logger.error(f"All methods to get logs from {device_id} failed")
                # Tạo log thông báo
                error_log = LogEntry(
                    device_id=device_id,
                    time=datetime.now().strftime("%H:%M:%S"),
                    topics="error",
                    message=f"Không thể lấy log từ thiết bị. Đã thử {methods_tried} phương pháp khác nhau.",
                    timestamp=datetime.now()
                )
                DataStore.logs[device_id] = [error_log]
                return [error_log]
            
            # In thông tin log để debug
            logger.debug(f"Log data sample: {str(log_data[:2]) if log_data else 'Empty'}")
            
            # Xử lý dữ liệu logs
            logs = []
            for log_entry_data in log_data:
                try:
                    # Xử lý các trường khác nhau có thể có trong log
                    time_val = ''
                    topics_val = ''
                    message_val = ''
                    
                    # Kiểm tra các khóa có thể có
                    for key, value in log_entry_data.items():
                        if key in ['time']:
                            time_val = str(value) if value is not None else ''
                        elif key in ['topics', 'topic']:
                            topics_val = str(value) if value is not None else ''
                        elif key in ['message']:
                            message_val = str(value) if value is not None else ''
                    
                    # Nếu không tìm thấy các trường thiết yếu, thử các trường khác
                    if not time_val and 'timestamp' in log_entry_data:
                        time_val = str(log_entry_data['timestamp'])
                    
                    if not message_val:
                        # Nếu không có trường message, tạo từ toàn bộ entry
                        message_val = str(log_entry_data)
                    
                    log_entry = LogEntry(
                        device_id=device_id,
                        time=time_val,
                        topics=topics_val,
                        message=message_val,
                        timestamp=datetime.now()
                    )
                    logs.append(log_entry)
                except Exception as entry_error:
                    logger.error(f"Error processing log entry {str(log_entry_data)}: {str(entry_error)}")
                    continue
            
            # Nếu không có logs, thử bật ghi log trên thiết bị và tạo một vài sự kiện log
            if not logs:
                logger.warning(f"No logs found on device {device_id}, attempting to enable logging...")
                
                try:
                    # Thử bật logging trên thiết bị
                    log_config = api.get_resource('/system/logging')
                    
                    # Kiểm tra nếu các quy tắc logging đã tồn tại
                    existing_rules = log_config.get()
                    
                    # Tạo log rule mới nếu cần thiết
                    topics_to_check = ["info", "error", "warning", "critical"]
                    existing_topics = set()
                    
                    for rule in existing_rules:
                        if 'topics' in rule:
                            existing_topics.add(rule['topics'])
                    
                    for topic in topics_to_check:
                        if topic not in existing_topics:
                            try:
                                log_config.add(topics=topic, action="memory", disabled="no")
                                logger.info(f"Added logging rule for '{topic}' topic on device {device_id}")
                            except Exception as rule_error:
                                logger.error(f"Failed to add logging rule for '{topic}': {str(rule_error)}")
                    
                    # Tạo một sự kiện để ghi log bằng cách chạy lệnh system script
                    try:
                        # Thử tạo log bằng script
                        script_resource = api.get_resource('/system/script')
                        
                        # Kiểm tra và xóa kịch bản nếu đã tồn tại
                        existing_scripts = script_resource.get()
                        if existing_scripts:
                            for script in existing_scripts:
                                if 'name' in script and script['name'] == 'generate_log':
                                    script_id = script.get('.id')
                                    if script_id:
                                        try:
                                            script_resource.remove(id=script_id)
                                        except Exception as remove_error:
                                            logger.error(f"Error removing existing script: {str(remove_error)}")
                        
                        # Tạo kịch bản mới
                        script_resource.add(
                            name="generate_log",
                            source=":log info \"Log test message from monitoring system\";"
                        )
                        
                        # Chạy kịch bản
                        script_resource.call("run", {"number": "generate_log"})
                        
                        logger.info(f"Generated log events using script on device {device_id}")
                    except Exception as script_error:
                        logger.error(f"Failed to generate log events via script: {str(script_error)}")
                        
                        # Nếu không thành công, thử cách khác với lệnh system reboot scheduled
                        try:
                            logger.info(f"Trying alternative method to generate logs on device {device_id}")
                            
                            # Lấy thông tin hệ thống identity để tạo log
                            identity_resource = api.get_resource('/system/identity')
                            identity_resource.get()
                            
                            logger.info(f"Generated log events by getting system identity on device {device_id}")
                        except Exception as alt_error:
                            logger.error(f"Failed to generate logs with alternative method: {str(alt_error)}")
                    
                    # Chờ một chút để log được tạo
                    time.sleep(2)
                    
                    # Thử lấy log lần nữa
                    try:
                        resource = api.get_resource('/log')
                        new_log_data = resource.get(limit=str(limit))
                        
                        if new_log_data:
                            logger.info(f"Successfully retrieved {len(new_log_data)} logs after enabling logging")
                            
                            # Xử lý dữ liệu logs mới
                            for log_entry_data in new_log_data:
                                try:
                                    time_val = ''
                                    topics_val = ''
                                    message_val = ''
                                    
                                    for key, value in log_entry_data.items():
                                        if key in ['time']:
                                            time_val = str(value) if value is not None else ''
                                        elif key in ['topics', 'topic']:
                                            topics_val = str(value) if value is not None else ''
                                        elif key in ['message']:
                                            message_val = str(value) if value is not None else ''
                                    
                                    if not time_val and 'timestamp' in log_entry_data:
                                        time_val = str(log_entry_data['timestamp'])
                                    
                                    if not message_val:
                                        message_val = str(log_entry_data)
                                    
                                    log_entry = LogEntry(
                                        device_id=device_id,
                                        time=time_val,
                                        topics=topics_val,
                                        message=message_val,
                                        timestamp=datetime.now()
                                    )
                                    logs.append(log_entry)
                                except Exception as entry_error:
                                    logger.error(f"Error processing new log entry: {str(entry_error)}")
                                    continue
                        else:
                            logger.warning(f"Still no logs found after enabling logging on device {device_id}")
                    except Exception as retry_error:
                        logger.error(f"Error retrieving logs after enabling logging: {str(retry_error)}")
                
                except Exception as enable_error:
                    logger.error(f"Failed to enable logging on device {device_id}: {str(enable_error)}")
                
                # Nếu vẫn không có logs sau tất cả nỗ lực, tạo thông báo lỗi rõ ràng
                if not logs:
                    logger.warning(f"Still no logs after all attempts for {device_id}")
                    
                    # Lấy thông tin thiết bị để hiển thị thông tin phù hợp
                    device = DataStore.devices.get(device_id)
                    device_name = device.name if device else device_id
                    
                    # Tạo log thông báo lỗi
                    current_time = datetime.now()
                    current_time_str = current_time.strftime("%H:%M:%S")
                    
                    # Chỉ thêm một log duy nhất thông báo lỗi
                    logs.append(LogEntry(
                        device_id=device_id,
                        time=current_time_str,
                        topics="error",
                        message=f"Không thể lấy logs từ thiết bị {device_name}. Vui lòng kiểm tra kết nối mạng, cấu hình logging trên router và quyền truy cập API.",
                        timestamp=current_time
                    ))
            
            DataStore.logs[device_id] = logs
            return logs
            
        except Exception as e:
            logger.error(f"Error collecting logs from {device_id}: {str(e)}")
            # Ghi chi tiết lỗi để debug
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Tạo một mục log lỗi
            error_log = LogEntry(
                device_id=device_id,
                time=datetime.now().strftime("%H:%M:%S"),
                topics="error",
                message=f"Lỗi khi thu thập log: {str(e)}",
                timestamp=datetime.now()
            )
            DataStore.logs[device_id] = [error_log]
            return [error_log]
    
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
