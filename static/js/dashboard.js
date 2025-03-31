/**
 * Dashboard page functionality
 */

// Store charts references
let cpuChart = null;
let memoryChart = null;
let diskChart = null;
let trafficCharts = {};

// Initialize dashboard
function initDashboard() {
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
        loadDashboardData(deviceId);
    } else if (deviceSelect && deviceSelect.value) {
        loadDashboardData(deviceSelect.value);
    }
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value;
            refreshData(deviceId, loadDashboardData);
        });
    }
}

// Load dashboard data
function loadDashboardData(deviceId) {
    if (!deviceId) return;
    
    // Update device status card
    loadDeviceStatus(deviceId);
    
    // Load system resources
    loadSystemResources(deviceId);
    
    // Load interfaces summary
    loadInterfacesSummary(deviceId);
    
    // Load alerts summary
    loadAlertsSummary(deviceId);
}

// Load device status
function loadDeviceStatus(deviceId) {
    const statusCard = document.getElementById('deviceStatusCard');
    if (!statusCard) return;
    
    statusCard.innerHTML = '';
    statusCard.appendChild(createSpinner());
    
    fetch('/api/devices')
        .then(response => response.json())
        .then(data => {
            const device = data.devices.find(d => d.id === deviceId);
            if (device) {
                const lastConnected = device.last_connected ? formatDateTime(device.last_connected) : 'Never';
                const statusClass = device.error ? 'text-danger' : 'text-success';
                const statusText = device.error ? 'Error' : 'Connected';
                
                statusCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Device Status</h5>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <tbody>
                                    <tr>
                                        <th>Name</th>
                                        <td>${device.name}</td>
                                    </tr>
                                    <tr>
                                        <th>Host</th>
                                        <td>${device.host}:${device.port}</td>
                                    </tr>
                                    <tr>
                                        <th>Status</th>
                                        <td class="${statusClass}">
                                            <i class="bi bi-${device.error ? 'x-circle' : 'check-circle'}"></i> 
                                            ${statusText}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Last Connected</th>
                                        <td>${lastConnected}</td>
                                    </tr>
                                    ${device.error ? `<tr>
                                        <th>Error</th>
                                        <td class="text-danger">${device.error}</td>
                                    </tr>` : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else {
                statusCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Device Status</h5>
                        <div class="alert alert-warning">Device not found</div>
                    </div>
                `;
            }
        })
        .catch(error => {
            statusCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Device Status</h5>
                    <div class="alert alert-danger">
                        Error loading device status: ${error.message}
                    </div>
                </div>
            `;
        });
}

// Load system resources
function loadSystemResources(deviceId) {
    const resourcesCard = document.getElementById('systemResourcesCard');
    if (!resourcesCard) return;
    
    resourcesCard.innerHTML = '';
    resourcesCard.appendChild(createSpinner());
    
    // Create canvas elements for charts
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'card-body';
    chartsContainer.innerHTML = `
        <h5 class="card-title">System Resources</h5>
        <div class="row">
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h6 class="card-subtitle mb-2 text-muted">CPU Load</h6>
                        <canvas id="cpuChart" width="100" height="100"></canvas>
                        <div id="cpuValue" class="mt-2 fs-5">-</div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h6 class="card-subtitle mb-2 text-muted">Memory Usage</h6>
                        <canvas id="memoryChart" width="100" height="100"></canvas>
                        <div id="memoryValue" class="mt-2 fs-5">-</div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h6 class="card-subtitle mb-2 text-muted">Disk Usage</h6>
                        <canvas id="diskChart" width="100" height="100"></canvas>
                        <div id="diskValue" class="mt-2 fs-5">-</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-subtitle mb-2 text-muted">System Information</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <tbody id="systemInfoTable">
                                    <tr><td colspan="2" class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resourcesCard.appendChild(chartsContainer);
    
    // Fetch system resources
    fetch(`/api/system/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('System resources not available');
            }
            return response.json();
        })
        .then(data => {
            const resources = data.resources;
            
            // Update system info table
            const systemInfoTable = document.getElementById('systemInfoTable');
            
            if (systemInfoTable) {
                systemInfoTable.innerHTML = `
                    <tr>
                        <th>Uptime</th>
                        <td>${formatUptime(resources.uptime)}</td>
                    </tr>
                    <tr>
                        <th>Version</th>
                        <td>${resources.version}</td>
                    </tr>
                    <tr>
                        <th>Model</th>
                        <td>${resources.board_name}</td>
                    </tr>
                    <tr>
                        <th>Architecture</th>
                        <td>${resources.architecture_name}</td>
                    </tr>
                    <tr>
                        <th>Platform</th>
                        <td>${resources.platform}</td>
                    </tr>
                `;
            }
            
            // Calculate usage percentages
            const cpuLoad = parseFloat(resources.cpu_load);
            
            let memoryUsage = 0;
            if (resources.total_memory > 0) {
                memoryUsage = ((resources.total_memory - resources.free_memory) / resources.total_memory) * 100;
            }
            
            let diskUsage = 0;
            if (resources.total_hdd > 0) {
                diskUsage = ((resources.total_hdd - resources.free_hdd) / resources.total_hdd) * 100;
            }
            
            // Update gauge charts
            updateGaugeChart('cpuChart', 'cpuValue', cpuLoad, `${cpuLoad.toFixed(1)}%`);
            updateGaugeChart('memoryChart', 'memoryValue', memoryUsage, 
                `${memoryUsage.toFixed(1)}%<br><small>${formatBytes(resources.total_memory - resources.free_memory)} / ${formatBytes(resources.total_memory)}</small>`);
            updateGaugeChart('diskChart', 'diskValue', diskUsage,
                `${diskUsage.toFixed(1)}%<br><small>${formatBytes(resources.total_hdd - resources.free_hdd)} / ${formatBytes(resources.total_hdd)}</small>`);
        })
        .catch(error => {
            resourcesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">System Resources</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load system resources'}
                    </div>
                </div>
            `;
        });
    
    // Fetch and display system history chart
    loadSystemHistory(deviceId);
}

// Load system history data
function loadSystemHistory(deviceId) {
    fetch(`/api/system/history/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                // It's ok if history is not available yet
                return { history: [] };
            }
            return response.json();
        })
        .then(data => {
            const history = data.history || [];
            if (history.length > 0) {
                // Add system history chart
                const resourcesCard = document.getElementById('systemResourcesCard');
                if (!resourcesCard) return;
                
                // Check if history chart container already exists
                let historyContainer = document.getElementById('systemHistoryContainer');
                if (!historyContainer) {
                    historyContainer = document.createElement('div');
                    historyContainer.className = 'card-body border-top';
                    historyContainer.id = 'systemHistoryContainer';
                    historyContainer.innerHTML = `
                        <h5 class="card-title">Resource History</h5>
                        <div class="chart-container" style="position: relative; height:250px;">
                            <canvas id="systemHistoryChart"></canvas>
                        </div>
                    `;
                    resourcesCard.appendChild(historyContainer);
                }
                
                // Create chart
                createSystemHistoryChart(history);
            }
        })
        .catch(error => {
            console.error('Error loading system history:', error);
        });
}

// Create system history chart
function createSystemHistoryChart(history) {
    const ctx = document.getElementById('systemHistoryChart');
    if (!ctx) return;
    
    // Extract data
    const timestamps = history.map(item => new Date(item.timestamp));
    const cpuData = history.map(item => item.cpu_load);
    const memoryData = history.map(item => item.memory_usage);
    
    // Check if chart already exists
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create new chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: 'CPU Load (%)',
                    data: cpuData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    pointRadius: 1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Memory Usage (%)',
                    data: memoryData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    pointRadius: 1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        },
                        tooltipFormat: 'MMM d, HH:mm:ss'
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage (%)'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Update gauge chart
function updateGaugeChart(chartId, valueId, value, displayText) {
    const ctx = document.getElementById(chartId);
    const valueEl = document.getElementById(valueId);
    
    if (!ctx || !valueEl) return;
    
    // Set value display
    valueEl.innerHTML = displayText;
    
    // Determine color based on value
    let color = '#28a745'; // green
    if (value > 90) {
        color = '#dc3545'; // red
    } else if (value > 70) {
        color = '#fd7e14'; // orange
    } else if (value > 50) {
        color = '#ffc107'; // yellow
    }
    
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create new chart
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: [color, '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '75%',
            circumference: 180,
            rotation: 270,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

// Load interfaces summary
function loadInterfacesSummary(deviceId) {
    const interfacesCard = document.getElementById('interfacesSummaryCard');
    if (!interfacesCard) return;
    
    interfacesCard.innerHTML = '';
    interfacesCard.appendChild(createSpinner());
    
    fetch(`/api/interfaces/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Interfaces data not available');
            }
            return response.json();
        })
        .then(data => {
            const interfaces = data.interfaces;
            
            // Create card content
            interfacesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Interfaces Summary</h5>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>RX Speed</th>
                                    <th>TX Speed</th>
                                </tr>
                            </thead>
                            <tbody id="interfacesTable">
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-body border-top" id="trafficChartsContainer">
                    <h5 class="card-title">Traffic Overview</h5>
                    <div class="row" id="trafficCharts">
                    </div>
                </div>
            `;
            
            const interfacesTable = document.getElementById('interfacesTable');
            const trafficCharts = document.getElementById('trafficCharts');
            
            if (interfaces.length === 0) {
                interfacesTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No interfaces found</td>
                    </tr>
                `;
                trafficCharts.innerHTML = `
                    <div class="col-12 text-center text-muted py-5">
                        No interface data available
                    </div>
                `;
                return;
            }
            
            // Sort interfaces by name
            interfaces.sort((a, b) => a.name.localeCompare(b.name));
            
            // Display interface table rows
            interfacesTable.innerHTML = interfaces.map(iface => `
                <tr>
                    <td>${iface.name}</td>
                    <td>
                        ${iface.running ? 
                            '<span class="badge bg-success">UP</span>' : 
                            (iface.disabled ? 
                                '<span class="badge bg-secondary">DISABLED</span>' : 
                                '<span class="badge bg-danger">DOWN</span>')}
                    </td>
                    <td>${formatSpeed(iface.rx_speed)}</td>
                    <td>${formatSpeed(iface.tx_speed)}</td>
                </tr>
            `).join('');
            
            // Create traffic charts for top interfaces
            // Only show charts for ethernet and wireless interfaces
            const filteredInterfaces = interfaces.filter(iface => 
                (iface.type === 'ether' || iface.type === 'wlan') && 
                !iface.disabled && 
                iface.running);
            
            // Limit to 4 most active interfaces based on traffic
            const topInterfaces = filteredInterfaces
                .sort((a, b) => (b.rx_speed + b.tx_speed) - (a.rx_speed + a.tx_speed))
                .slice(0, 4);
            
            // Create chart containers
            topInterfaces.forEach(iface => {
                const chartCol = document.createElement('div');
                chartCol.className = 'col-md-6 mb-3';
                chartCol.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-subtitle text-muted mb-2">${iface.name}</h6>
                            <div class="chart-container" style="position: relative; height:150px;">
                                <canvas id="trafficChart_${iface.name.replace(/[^a-zA-Z0-9]/g, '_')}"></canvas>
                            </div>
                            <div class="d-flex justify-content-between mt-2">
                                <small class="text-success">RX: ${formatSpeed(iface.rx_speed)}</small>
                                <small class="text-primary">TX: ${formatSpeed(iface.tx_speed)}</small>
                            </div>
                        </div>
                    </div>
                `;
                trafficCharts.appendChild(chartCol);
                
                // Fetch interface history and create chart
                loadInterfaceTrafficChart(deviceId, iface.name);
            });
            
            // If no active interfaces found
            if (topInterfaces.length === 0) {
                trafficCharts.innerHTML = `
                    <div class="col-12 text-center text-muted py-5">
                        No active interfaces available for traffic charts
                    </div>
                `;
            }
        })
        .catch(error => {
            interfacesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Interfaces Summary</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load interfaces data'}
                    </div>
                </div>
            `;
        });
}

// Load interface traffic chart
function loadInterfaceTrafficChart(deviceId, interfaceName) {
    const chartId = `trafficChart_${interfaceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    
    fetch(`/api/interfaces/history/${deviceId}/${interfaceName}`)
        .then(response => {
            if (!response.ok) {
                // It's ok if history is not available yet
                return { history: [] };
            }
            return response.json();
        })
        .then(data => {
            const history = data.history || [];
            if (history.length > 0) {
                createInterfaceTrafficChart(ctx, history);
            } else {
                ctx.parentNode.innerHTML = `
                    <div class="text-center text-muted py-4">
                        No history data available yet
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error(`Error loading traffic history for ${interfaceName}:`, error);
            ctx.parentNode.innerHTML = `
                <div class="alert alert-warning">
                    Error loading traffic data
                </div>
            `;
        });
}

// Create interface traffic chart
function createInterfaceTrafficChart(ctx, history) {
    // Extract data
    const timestamps = history.map(item => new Date(item.timestamp));
    const rxData = history.map(item => item.rx_speed / 1024); // Convert to Kbps
    const txData = history.map(item => item.tx_speed / 1024); // Convert to Kbps
    
    // Check if chart already exists
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create new chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: 'Download (Kbps)',
                    data: rxData,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    pointRadius: 0,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Upload (Kbps)',
                    data: txData,
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    pointRadius: 0,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        },
                        tooltipFormat: 'HH:mm:ss'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 6
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: false
                    },
                    grid: {
                        borderDash: [2, 2]
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y < 1024 
                                    ? context.parsed.y.toFixed(2) + ' Kbps'
                                    : (context.parsed.y / 1024).toFixed(2) + ' Mbps';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Load alerts summary
function loadAlertsSummary(deviceId) {
    const alertsCard = document.getElementById('alertsSummaryCard');
    if (!alertsCard) return;
    
    alertsCard.innerHTML = '';
    alertsCard.appendChild(createSpinner());
    
    fetch(`/api/alerts?device_id=${deviceId}`)
        .then(response => response.json())
        .then(data => {
            const alerts = data.alerts;
            
            // Create card content
            alertsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Recent Alerts</h5>
                    <div id="alertsList"></div>
                </div>
            `;
            
            const alertsList = document.getElementById('alertsList');
            
            if (alerts.length === 0) {
                alertsList.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-check-circle fs-1"></i>
                        <p class="mt-2">No alerts</p>
                    </div>
                `;
                return;
            }
            
            // Get active alerts
            const activeAlerts = alerts.filter(alert => alert.active);
            
            // Sort alerts by creation date (newest first)
            activeAlerts.sort((a, b) => new Date(b.created) - new Date(a.created));
            
            // Only display the most recent 5 alerts
            const recentAlerts = activeAlerts.slice(0, 5);
            
            // Display alerts
            alertsList.innerHTML = recentAlerts.map((alert, index) => {
                const severityClass = {
                    'info': 'info',
                    'warning': 'warning',
                    'error': 'danger',
                    'critical': 'danger'
                }[alert.severity] || 'secondary';
                
                return `
                    <div class="alert alert-${severityClass} mb-2" role="alert">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <p class="mb-0">${alert.message}</p>
                                <small class="text-muted">${formatDateTime(alert.created)}</small>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-outline-${severityClass} resolve-alert-btn" 
                                        data-alert-id="${index}" 
                                        title="Resolve Alert">
                                    <i class="bi bi-check-lg"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Add resolve alert functionality
            const resolveButtons = document.querySelectorAll('.resolve-alert-btn');
            resolveButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const alertId = this.getAttribute('data-alert-id');
                    resolveAlert(alertId);
                });
            });
            
            // Add link to alerts page for all alerts
            if (activeAlerts.length > 5) {
                const moreAlertsLink = document.createElement('div');
                moreAlertsLink.className = 'text-center mt-2';
                moreAlertsLink.innerHTML = `
                    <a href="/alerts?device=${deviceId}" class="btn btn-sm btn-outline-secondary">
                        View All Alerts (${activeAlerts.length})
                    </a>
                `;
                alertsList.appendChild(moreAlertsLink);
            }
        })
        .catch(error => {
            alertsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Recent Alerts</h5>
                    <div class="alert alert-warning">
                        Failed to load alerts: ${error.message}
                    </div>
                </div>
            `;
        });
}

// Resolve an alert
function resolveAlert(alertId) {
    fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Alert resolved', 'success');
            
            // Refresh alerts
            const deviceId = document.getElementById('deviceSelect').value;
            loadAlertsSummary(deviceId);
        } else {
            showToast(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        showToast(`Error: ${error.message}`, 'danger');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);
