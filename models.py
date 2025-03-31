from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime

@dataclass
class Site:
    id: str
    name: str
    description: str = ''
    location: str = ''
    contact: str = ''
    enabled: bool = True

@dataclass
class Device:
    id: str
    name: str
    host: str
    site_id: str = 'default'
    port: int = 8728
    username: str = 'admin'
    password: str = ''
    enabled: bool = True
    use_ssl: bool = False
    last_connected: Optional[datetime] = None
    error_message: Optional[str] = None
    comment: str = ''
    location: str = ''
    mac_address: str = ''
    vendor: str = ''
    device_type: str = ''
    auto_detected: bool = False
    first_seen: Optional[datetime] = None

@dataclass
class SystemResources:
    device_id: str
    uptime: str = ''
    version: str = ''
    cpu_load: float = 0.0
    free_memory: int = 0
    total_memory: int = 0
    free_hdd: int = 0
    total_hdd: int = 0
    architecture_name: str = ''
    board_name: str = ''
    platform: str = ''
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class Interface:
    device_id: str
    name: str
    type: str
    running: bool
    disabled: bool
    rx_byte: int = 0
    tx_byte: int = 0
    rx_packet: int = 0
    tx_packet: int = 0
    rx_error: int = 0
    tx_error: int = 0
    rx_drop: int = 0
    tx_drop: int = 0
    last_link_down_time: str = ''
    last_link_up_time: str = ''
    actual_mtu: int = 0
    mac_address: str = ''
    timestamp: datetime = field(default_factory=datetime.now)
    prev_rx_byte: int = 0
    prev_tx_byte: int = 0
    rx_speed: float = 0.0
    tx_speed: float = 0.0

@dataclass
class IPAddress:
    device_id: str
    address: str
    network: str
    interface: str
    dynamic: bool
    disabled: bool
    comment: str = ''
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class ArpEntry:
    device_id: str
    address: str
    mac_address: str
    interface: str
    dynamic: bool
    complete: bool
    vendor: str = ''
    device_type: str = ''
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class DHCPLease:
    device_id: str
    address: str
    mac_address: str
    client_id: str = ''
    hostname: str = ''
    status: str = ''
    expires_after: str = ''
    vendor: str = ''
    device_type: str = ''
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class FirewallRule:
    device_id: str
    chain: str
    action: str
    disabled: bool
    comment: str = ''
    bytes: int = 0
    packets: int = 0
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class WirelessClient:
    device_id: str
    interface: str
    mac_address: str
    signal_strength: int = 0
    tx_rate: int = 0
    rx_rate: int = 0
    tx_bytes: int = 0
    rx_bytes: int = 0
    uptime: str = ''
    vendor: str = ''
    device_type: str = ''
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class CapsmanRegistration:
    device_id: str
    interface: str
    radio_name: str
    mac_address: str
    remote_ap_mac: str
    signal_strength: int = 0
    tx_rate: int = 0
    rx_rate: int = 0
    tx_bytes: int = 0
    rx_bytes: int = 0
    uptime: str = ''
    ssid: str = ''
    channel: str = ''
    comment: str = ''
    status: str = ''
    vendor: str = ''
    device_type: str = ''
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class LogEntry:
    device_id: str
    time: str
    topics: str
    message: str
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class Alert:
    device_id: str
    type: str
    message: str
    severity: str  # 'info', 'warning', 'error', 'critical'
    created: datetime = field(default_factory=datetime.now)
    active: bool = True
    resolved: bool = False
    resolved_time: Optional[datetime] = None

# In-memory data store
class DataStore:
    sites: Dict[str, Site] = {}
    devices: Dict[str, Device] = {}
    system_resources: Dict[str, SystemResources] = {}
    interfaces: Dict[str, List[Interface]] = {}
    ip_addresses: Dict[str, List[IPAddress]] = {}
    arp_entries: Dict[str, List[ArpEntry]] = {}
    dhcp_leases: Dict[str, List[DHCPLease]] = {}
    firewall_rules: Dict[str, List[FirewallRule]] = {}
    wireless_clients: Dict[str, List[WirelessClient]] = {}
    capsman_registrations: Dict[str, List[CapsmanRegistration]] = {}
    logs: Dict[str, List[LogEntry]] = {}
    alerts: List[Alert] = []
    
    # Interface traffic history for charts (last 24 hours with 5-minute intervals)
    interface_history: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    
    # System resource history
    system_history: Dict[str, List[Dict[str, Any]]] = {}
    
    @classmethod
    def get_devices_by_site(cls, site_id: str) -> List[Device]:
        """Lấy danh sách thiết bị theo site"""
        return [device for device in cls.devices.values() if device.site_id == site_id]
        
    @classmethod
    def get_site_name(cls, site_id: str) -> str:
        """Lấy tên site từ id"""
        if site_id in cls.sites:
            return cls.sites[site_id].name
        return "Không xác định"
