/**
 * Services page functionality
 */

// Initialize services page
function initServicesPage() {
    const deviceSelect = document.getElementById('deviceSelect');
    if (deviceSelect) {
        deviceSelect.addEventListener('change', function() {
            updateActiveDevice(this.value);
        });
    }
    
    // Get device from URL parameter or use first device
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get('device');
    
    if (deviceId) {
        loadServicesData(deviceId);
    } else if (deviceSelect && deviceSelect.value) {
        loadServicesData(deviceSelect.value);
    }
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value;
            refreshData(deviceId, loadServicesData);
        });
    }
}

// Load services data
function loadServicesData(deviceId) {
    if (!deviceId) return;
    
    loadDHCPLeases(deviceId);
    loadFirewallRules(deviceId);
    loadWirelessClients(deviceId);
    loadCapsmanRegistrations(deviceId);
}

// Load DHCP Leases
function loadDHCPLeases(deviceId) {
    const dhcpCard = document.getElementById('dhcpLeasesCard');
    if (!dhcpCard) return;
    
    dhcpCard.innerHTML = '';
    dhcpCard.appendChild(createSpinner());
    
    fetch(`/api/dhcp/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('DHCP leases not available');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error loading DHCP leases:', error);
            dhcpCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">DHCP Leases</h5>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill"></i> 
                        DHCP leases not available. The device may be offline or this feature may not be supported.
                    </div>
                </div>
            `;
            throw error;
        })
        .then(data => {
            const leases = data.leases;
            
            if (leases.length === 0) {
                dhcpCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">DHCP Leases</h5>
                        ${createEmptyState('No DHCP leases found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create DataTable
            dhcpCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">DHCP Leases</h5>
                    <div class="table-responsive">
                        <table id="dhcpLeasesTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>IP Address</th>
                                    <th>MAC Address</th>
                                    <th>Hostname</th>
                                    <th>Status</th>
                                    <th>Expires After</th>
                                    <th>Client ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leases.map(lease => `
                                    <tr>
                                        <td>${lease.address}</td>
                                        <td>${formatMacAddress(lease.mac_address)}</td>
                                        <td>${lease.hostname || '<em>No hostname</em>'}</td>
                                        <td>
                                            ${lease.status === 'bound' ? 
                                                '<span class="badge bg-success">Bound</span>' : 
                                                (lease.status === 'offered' ? 
                                                    '<span class="badge bg-warning">Offered</span>' : 
                                                    `<span class="badge bg-secondary">${lease.status || 'Unknown'}</span>`)}
                                        </td>
                                        <td>${lease.expires_after || 'N/A'}</td>
                                        <td>${lease.client_id || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#dhcpLeasesTable').DataTable({
                responsive: true,
                order: [[0, 'asc']],
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ leases",
                    info: "Showing _START_ to _END_ of _TOTAL_ leases"
                }
            });
        })
        .catch(error => {
            dhcpCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">DHCP Leases</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load DHCP leases'}
                    </div>
                </div>
            `;
        });
}

// Load Firewall Rules
function loadFirewallRules(deviceId) {
    const firewallCard = document.getElementById('firewallRulesCard');
    if (!firewallCard) return;
    
    firewallCard.innerHTML = '';
    firewallCard.appendChild(createSpinner());
    
    fetch(`/api/firewall/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Firewall rules not available');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error loading firewall rules:', error);
            firewallCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Firewall Rules</h5>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill"></i> 
                        Firewall rules not available. The device may be offline or this feature may not be supported.
                    </div>
                </div>
            `;
            throw error;
        })
        .then(data => {
            const rules = data.rules;
            
            if (rules.length === 0) {
                firewallCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Firewall Rules</h5>
                        ${createEmptyState('No firewall rules found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create DataTable
            firewallCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Firewall Rules</h5>
                    <div class="table-responsive">
                        <table id="firewallRulesTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Chain</th>
                                    <th>Action</th>
                                    <th>Status</th>
                                    <th>Packets</th>
                                    <th>Bytes</th>
                                    <th>Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rules.map(rule => `
                                    <tr>
                                        <td>${rule.chain}</td>
                                        <td>
                                            ${rule.action === 'drop' ? 
                                                '<span class="badge bg-danger">DROP</span>' : 
                                                (rule.action === 'accept' ? 
                                                    '<span class="badge bg-success">ACCEPT</span>' : 
                                                    `<span class="badge bg-info">${rule.action.toUpperCase()}</span>`)}
                                        </td>
                                        <td>
                                            ${rule.disabled ? 
                                                '<span class="badge bg-secondary">Disabled</span>' : 
                                                '<span class="badge bg-success">Active</span>'}
                                        </td>
                                        <td>${rule.packets.toLocaleString()}</td>
                                        <td>${formatBytes(rule.bytes)}</td>
                                        <td>${rule.comment || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#firewallRulesTable').DataTable({
                responsive: true,
                order: [[0, 'asc']],
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ rules",
                    info: "Showing _START_ to _END_ of _TOTAL_ rules"
                }
            });
        })
        .catch(error => {
            firewallCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Firewall Rules</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load firewall rules'}
                    </div>
                </div>
            `;
        });
}

// Load Wireless Clients
function loadWirelessClients(deviceId) {
    const wirelessCard = document.getElementById('wirelessClientsCard');
    if (!wirelessCard) return;
    
    wirelessCard.innerHTML = '';
    wirelessCard.appendChild(createSpinner());
    
    fetch(`/api/wireless/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Wireless clients not available');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error loading wireless clients:', error);
            wirelessCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Wireless Clients</h5>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill"></i> 
                        Wireless clients not available. The device may be offline or this feature may not be supported.
                    </div>
                </div>
            `;
            throw error;
        })
        .then(data => {
            const clients = data.clients;
            
            if (clients.length === 0) {
                wirelessCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Wireless Clients</h5>
                        ${createEmptyState('No wireless clients found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create DataTable
            wirelessCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Wireless Clients</h5>
                    <div class="table-responsive">
                        <table id="wirelessClientsTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Interface</th>
                                    <th>MAC Address</th>
                                    <th>Signal</th>
                                    <th>RX/TX Rate</th>
                                    <th>Data</th>
                                    <th>Uptime</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clients.map(client => `
                                    <tr>
                                        <td>${client.interface}</td>
                                        <td>${formatMacAddress(client.mac_address)}</td>
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <div class="signal-strength me-2" style="width: 50px;">
                                                    ${getSignalStrengthBars(client.signal_strength)}
                                                </div>
                                                <span>${client.signal_strength} dBm</span>
                                            </div>
                                        </td>
                                        <td>${client.rx_rate} / ${client.tx_rate} Mbps</td>
                                        <td>${formatBytes(client.rx_bytes)} / ${formatBytes(client.tx_bytes)}</td>
                                        <td>${formatUptime(client.uptime)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-body border-top">
                    <h5 class="card-title">Wireless Clients Overview</h5>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">Connected Clients by Interface</h6>
                                    <canvas id="wirelessInterfaceChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">Signal Strength Distribution</h6>
                                    <canvas id="signalStrengthChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#wirelessClientsTable').DataTable({
                responsive: true,
                order: [[0, 'asc']],
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ clients",
                    info: "Showing _START_ to _END_ of _TOTAL_ clients"
                }
            });
            
            // Create wireless interface chart
            createWirelessInterfaceChart(clients);
            
            // Create signal strength chart
            createSignalStrengthChart(clients);
        })
        .catch(error => {
            wirelessCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Wireless Clients</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load wireless clients'}
                    </div>
                </div>
            `;
        });
}

// Create wireless interface chart
function createWirelessInterfaceChart(clients) {
    const ctx = document.getElementById('wirelessInterfaceChart');
    if (!ctx) return;
    
    // Count clients by interface
    const interfaceCounts = {};
    clients.forEach(client => {
        if (!interfaceCounts[client.interface]) {
            interfaceCounts[client.interface] = 0;
        }
        interfaceCounts[client.interface]++;
    });
    
    // Prepare data for chart
    const interfaces = Object.keys(interfaceCounts);
    const counts = interfaces.map(iface => interfaceCounts[iface]);
    
    // Random colors for interfaces
    const backgroundColors = interfaces.map((_, index) => {
        const colors = [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
        ];
        return colors[index % colors.length];
    });
    
    // Create chart
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: interfaces,
            datasets: [{
                data: counts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} clients (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create signal strength chart
function createSignalStrengthChart(clients) {
    const ctx = document.getElementById('signalStrengthChart');
    if (!ctx) return;
    
    // Group signal strength into ranges
    const ranges = {
        'Excellent (-50 to -65 dBm)': 0,
        'Good (-65 to -75 dBm)': 0,
        'Fair (-75 to -85 dBm)': 0,
        'Poor (< -85 dBm)': 0
    };
    
    clients.forEach(client => {
        const signal = client.signal_strength;
        if (signal >= -65) {
            ranges['Excellent (-50 to -65 dBm)']++;
        } else if (signal >= -75) {
            ranges['Good (-65 to -75 dBm)']++;
        } else if (signal >= -85) {
            ranges['Fair (-75 to -85 dBm)']++;
        } else {
            ranges['Poor (< -85 dBm)']++;
        }
    });
    
    // Prepare data for chart
    const labels = Object.keys(ranges);
    const data = labels.map(label => ranges[label]);
    
    // Colors for signal strength ranges
    const backgroundColors = [
        'rgba(40, 167, 69, 0.7)',  // Excellent - green
        'rgba(23, 162, 184, 0.7)', // Good - blue
        'rgba(255, 193, 7, 0.7)',  // Fair - yellow
        'rgba(220, 53, 69, 0.7)'   // Poor - red
    ];
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Clients',
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Load CAPsMAN Registrations
function loadCapsmanRegistrations(deviceId) {
    const capsmanCard = document.getElementById('capsmanRegistrationsCard');
    if (!capsmanCard) return;
    
    capsmanCard.innerHTML = '';
    capsmanCard.appendChild(createSpinner());
    
    fetch(`/api/capsman/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('CAPsMAN registrations not available');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error loading CAPsMAN registrations:', error);
            capsmanCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">CAPsMAN Registrations</h5>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill"></i> 
                        CAPsMAN registrations not available. The device may be offline or this feature may not be supported.
                    </div>
                </div>
            `;
            throw error;
        })
        .then(data => {
            const registrations = data.registrations;
            
            if (registrations.length === 0) {
                capsmanCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">CAPsMAN Registrations</h5>
                        ${createEmptyState('No CAPsMAN registrations found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create DataTable
            capsmanCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">CAPsMAN Registrations</h5>
                    <div class="table-responsive">
                        <table id="capsmanRegistrationsTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Interface</th>
                                    <th>Radio Name</th>
                                    <th>MAC Address</th>
                                    <th>SSID</th>
                                    <th>Signal</th>
                                    <th>RX/TX Rate</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${registrations.map(reg => `
                                    <tr>
                                        <td>${reg.interface}</td>
                                        <td>${reg.radio_name}</td>
                                        <td>${formatMacAddress(reg.mac_address)}</td>
                                        <td>${reg.ssid}</td>
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <div class="signal-strength me-2" style="width: 50px;">
                                                    ${getSignalStrengthBars(reg.signal_strength)}
                                                </div>
                                                <span>${reg.signal_strength} dBm</span>
                                            </div>
                                        </td>
                                        <td>${reg.rx_rate} / ${reg.tx_rate} Mbps</td>
                                        <td>
                                            ${reg.status === 'connected' ? 
                                                '<span class="badge bg-success">Connected</span>' : 
                                                `<span class="badge bg-secondary">${reg.status || 'Unknown'}</span>`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-body border-top">
                    <h5 class="card-title">CAPsMAN Overview</h5>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">Registrations by Access Point</h6>
                                    <canvas id="capsmanRadioChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">Registrations by SSID</h6>
                                    <canvas id="capsmanSsidChart" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#capsmanRegistrationsTable').DataTable({
                responsive: true,
                order: [[0, 'asc']],
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ registrations",
                    info: "Showing _START_ to _END_ of _TOTAL_ registrations"
                }
            });
            
            // Create CAPsMAN radio chart
            createCapsmanRadioChart(registrations);
            
            // Create CAPsMAN SSID chart
            createCapsmanSsidChart(registrations);
        })
        .catch(error => {
            capsmanCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">CAPsMAN Registrations</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load CAPsMAN registrations'}
                    </div>
                </div>
            `;
        });
}

// Create CAPsMAN radio chart
function createCapsmanRadioChart(registrations) {
    const ctx = document.getElementById('capsmanRadioChart');
    if (!ctx) return;
    
    // Count registrations by radio name
    const radioCounts = {};
    registrations.forEach(reg => {
        if (!radioCounts[reg.radio_name]) {
            radioCounts[reg.radio_name] = 0;
        }
        radioCounts[reg.radio_name]++;
    });
    
    // Prepare data for chart
    const radios = Object.keys(radioCounts);
    const counts = radios.map(radio => radioCounts[radio]);
    
    // Random colors for radios
    const backgroundColors = radios.map((_, index) => {
        const colors = [
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)'
        ];
        return colors[index % colors.length];
    });
    
    // Create chart
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: radios,
            datasets: [{
                data: counts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} clients (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create CAPsMAN SSID chart
function createCapsmanSsidChart(registrations) {
    const ctx = document.getElementById('capsmanSsidChart');
    if (!ctx) return;
    
    // Count registrations by SSID
    const ssidCounts = {};
    registrations.forEach(reg => {
        if (!ssidCounts[reg.ssid]) {
            ssidCounts[reg.ssid] = 0;
        }
        ssidCounts[reg.ssid]++;
    });
    
    // Prepare data for chart
    const ssids = Object.keys(ssidCounts);
    const counts = ssids.map(ssid => ssidCounts[ssid]);
    
    // Random colors for SSIDs
    const backgroundColors = ssids.map((_, index) => {
        const colors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
        ];
        return colors[index % colors.length];
    });
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ssids,
            datasets: [{
                label: 'Clients',
                data: counts,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            return `${value} clients`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Helper function to display signal strength graphically
function getSignalStrengthBars(signalStrength) {
    // Signal strength in dBm typically ranges from -50 (excellent) to -100 (very poor)
    let numBars;
    
    if (signalStrength >= -65) {
        numBars = 4; // Excellent
    } else if (signalStrength >= -75) {
        numBars = 3; // Good
    } else if (signalStrength >= -85) {
        numBars = 2; // Fair
    } else if (signalStrength >= -95) {
        numBars = 1; // Poor
    } else {
        numBars = 0; // Very poor
    }
    
    const bars = [];
    for (let i = 0; i < 4; i++) {
        const active = i < numBars;
        bars.push(`<div class="signal-bar ${active ? 'active' : ''}" style="height: ${(i+1)*3}px;"></div>`);
    }
    
    return `<div class="signal-bars">${bars.join('')}</div>`;
}

// Load page data
function loadPageData(deviceId) {
    if (!deviceId) return;
    loadServicesData(deviceId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initServicesPage);
