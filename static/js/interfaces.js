/**
 * Interfaces page functionality
 */

// Initialize interfaces page
function initInterfacesPage() {
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
        loadInterfacesData(deviceId);
    } else if (deviceSelect && deviceSelect.value) {
        loadInterfacesData(deviceSelect.value);
    }
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value;
            refreshData(deviceId, loadInterfacesData);
        });
    }
}

// Load interfaces data
function loadInterfacesData(deviceId) {
    if (!deviceId) return;
    
    loadInterfacesList(deviceId);
    loadInterfacesCharts(deviceId);
}

// Load interfaces list
function loadInterfacesList(deviceId) {
    const interfacesCard = document.getElementById('interfacesListCard');
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
            
            if (interfaces.length === 0) {
                interfacesCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Network Interfaces</h5>
                        ${createEmptyState('No interfaces found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Sort interfaces by name
            interfaces.sort((a, b) => a.name.localeCompare(b.name));
            
            // Create DataTable
            interfacesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Network Interfaces</h5>
                    <div class="table-responsive">
                        <table id="interfacesTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>MAC Address</th>
                                    <th>RX Speed</th>
                                    <th>TX Speed</th>
                                    <th>MTU</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${interfaces.map(iface => `
                                    <tr>
                                        <td>${iface.name}</td>
                                        <td>${iface.type}</td>
                                        <td>
                                            ${iface.running ? 
                                                '<span class="badge bg-success">UP</span>' : 
                                                (iface.disabled ? 
                                                    '<span class="badge bg-secondary">DISABLED</span>' : 
                                                    '<span class="badge bg-danger">DOWN</span>')}
                                        </td>
                                        <td>${formatMacAddress(iface.mac_address)}</td>
                                        <td>${formatSpeed(iface.rx_speed)}</td>
                                        <td>${formatSpeed(iface.tx_speed)}</td>
                                        <td>${iface.actual_mtu}</td>
                                        <td>
                                            <button type="button" class="btn btn-sm btn-primary interface-details-btn" 
                                                    data-interface-name="${iface.name}">
                                                <i class="bi bi-info-circle"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#interfacesTable').DataTable({
                responsive: true,
                order: [[0, 'asc']],
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ interfaces",
                    info: "Showing _START_ to _END_ of _TOTAL_ interfaces"
                }
            });
            
            // Setup interface detail buttons
            const detailButtons = document.querySelectorAll('.interface-details-btn');
            detailButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const interfaceName = this.getAttribute('data-interface-name');
                    const interfaceData = interfaces.find(i => i.name === interfaceName);
                    if (interfaceData) {
                        showInterfaceDetails(interfaceData);
                    }
                });
            });
        })
        .catch(error => {
            interfacesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Network Interfaces</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load interfaces data'}
                    </div>
                </div>
            `;
        });
}

// Show interface details in modal
function showInterfaceDetails(interfaceData) {
    // Create or get modal
    let detailsModal = document.getElementById('interfaceDetailsModal');
    
    if (!detailsModal) {
        // Create modal if it doesn't exist
        detailsModal = document.createElement('div');
        detailsModal.className = 'modal fade';
        detailsModal.id = 'interfaceDetailsModal';
        detailsModal.tabIndex = '-1';
        detailsModal.setAttribute('aria-labelledby', 'interfaceDetailsModalLabel');
        detailsModal.setAttribute('aria-hidden', 'true');
        
        document.body.appendChild(detailsModal);
    }
    
    // Calculate uptime information
    let lastDownTime = 'N/A';
    let lastUpTime = 'N/A';
    
    if (interfaceData.last_link_down_time) {
        lastDownTime = formatDateTime(interfaceData.last_link_down_time);
    }
    
    if (interfaceData.last_link_up_time) {
        lastUpTime = formatDateTime(interfaceData.last_link_up_time);
    }
    
    // Format the data for display
    detailsModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="interfaceDetailsModalLabel">
                        Interface: ${interfaceData.name}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="border-bottom pb-2 mb-3">General Information</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <tbody>
                                        <tr>
                                            <th>Name</th>
                                            <td>${interfaceData.name}</td>
                                        </tr>
                                        <tr>
                                            <th>Type</th>
                                            <td>${interfaceData.type}</td>
                                        </tr>
                                        <tr>
                                            <th>Status</th>
                                            <td>
                                                ${interfaceData.running ? 
                                                    '<span class="badge bg-success">UP</span>' : 
                                                    (interfaceData.disabled ? 
                                                        '<span class="badge bg-secondary">DISABLED</span>' : 
                                                        '<span class="badge bg-danger">DOWN</span>')}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th>MAC Address</th>
                                            <td>${formatMacAddress(interfaceData.mac_address)}</td>
                                        </tr>
                                        <tr>
                                            <th>MTU</th>
                                            <td>${interfaceData.actual_mtu}</td>
                                        </tr>
                                        <tr>
                                            <th>Last Link Down</th>
                                            <td>${lastDownTime}</td>
                                        </tr>
                                        <tr>
                                            <th>Last Link Up</th>
                                            <td>${lastUpTime}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="border-bottom pb-2 mb-3">Traffic Statistics</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <tbody>
                                        <tr>
                                            <th>Current RX Speed</th>
                                            <td>${formatSpeed(interfaceData.rx_speed)}</td>
                                        </tr>
                                        <tr>
                                            <th>Current TX Speed</th>
                                            <td>${formatSpeed(interfaceData.tx_speed)}</td>
                                        </tr>
                                        <tr>
                                            <th>RX Bytes</th>
                                            <td>${formatBytes(interfaceData.rx_byte)}</td>
                                        </tr>
                                        <tr>
                                            <th>TX Bytes</th>
                                            <td>${formatBytes(interfaceData.tx_byte)}</td>
                                        </tr>
                                        <tr>
                                            <th>RX Packets</th>
                                            <td>${interfaceData.rx_packet.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <th>TX Packets</th>
                                            <td>${interfaceData.tx_packet.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <th>RX Errors</th>
                                            <td>${interfaceData.rx_error.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <th>TX Errors</th>
                                            <td>${interfaceData.tx_error.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <th>RX Drops</th>
                                            <td>${interfaceData.rx_drop.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <th>TX Drops</th>
                                            <td>${interfaceData.tx_drop.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-12">
                            <h6 class="border-bottom pb-2 mb-3">Traffic History</h6>
                            <div class="chart-container" style="position: relative; height:250px;">
                                <canvas id="interfaceDetailChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Show the modal
    const modal = new bootstrap.Modal(detailsModal);
    modal.show();
    
    // Load interface traffic history
    loadInterfaceDetailChart(interfaceData.device_id, interfaceData.name);
}

// Load interface traffic history for detail modal
function loadInterfaceDetailChart(deviceId, interfaceName) {
    fetch(`/api/interfaces/history/${deviceId}/${interfaceName}`)
        .then(response => {
            if (!response.ok) {
                return { history: [] };
            }
            return response.json();
        })
        .then(data => {
            const history = data.history || [];
            if (history.length > 0) {
                createInterfaceDetailChart(history);
            } else {
                const chartContainer = document.querySelector('#interfaceDetailChart').parentNode;
                chartContainer.innerHTML = `
                    <div class="text-center text-muted py-4">
                        No historical data available for this interface yet
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error(`Error loading traffic history for ${interfaceName}:`, error);
            const chartContainer = document.querySelector('#interfaceDetailChart').parentNode;
            chartContainer.innerHTML = `
                <div class="alert alert-warning">
                    Error loading traffic history data
                </div>
            `;
        });
}

// Create interface traffic history chart for detail modal
function createInterfaceDetailChart(history) {
    const ctx = document.getElementById('interfaceDetailChart');
    if (!ctx) return;
    
    // Extract data
    const timestamps = history.map(item => new Date(item.timestamp));
    const rxData = history.map(item => item.rx_speed / 1024 / 8); // Convert to Kbps
    const txData = history.map(item => item.tx_speed / 1024 / 8); // Convert to Kbps
    
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
                    pointRadius: 1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Upload (Kbps)',
                    data: txData,
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
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
                    title: {
                        display: true,
                        text: 'Speed (Kbps)'
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

// Load interfaces charts overview
function loadInterfacesCharts(deviceId) {
    const chartsCard = document.getElementById('interfacesChartsCard');
    if (!chartsCard) return;
    
    chartsCard.innerHTML = '';
    chartsCard.appendChild(createSpinner());
    
    fetch(`/api/interfaces/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Interfaces data not available');
            }
            return response.json();
        })
        .then(data => {
            const interfaces = data.interfaces;
            
            if (interfaces.length === 0) {
                chartsCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Interface Traffic</h5>
                        ${createEmptyState('No interfaces found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Filter active interfaces (running and not disabled)
            const activeInterfaces = interfaces.filter(iface => 
                iface.running && !iface.disabled);
            
            if (activeInterfaces.length === 0) {
                chartsCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Interface Traffic</h5>
                        ${createEmptyState('No active interfaces found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Sort interfaces by traffic (rx_speed + tx_speed)
            activeInterfaces.sort((a, b) => 
                (b.rx_speed + b.tx_speed) - (a.rx_speed + a.tx_speed));
            
            // Get top 6 interfaces by traffic
            const topInterfaces = activeInterfaces.slice(0, 6);
            
            // Create chart containers
            chartsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Interface Traffic</h5>
                    <div class="row" id="trafficChartsContainer">
                    </div>
                </div>
            `;
            
            const chartsContainer = document.getElementById('trafficChartsContainer');
            
            // Create chart for each interface
            topInterfaces.forEach(iface => {
                const chartCol = document.createElement('div');
                chartCol.className = 'col-md-6 col-lg-4 mb-4';
                chartCol.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-subtitle text-muted mb-2">${iface.name}</h6>
                            <div class="chart-container" style="position: relative; height:200px;">
                                <canvas id="trafficChart_${iface.name.replace(/[^a-zA-Z0-9]/g, '_')}"></canvas>
                            </div>
                            <div class="d-flex justify-content-between mt-2">
                                <small class="text-success">RX: ${formatSpeed(iface.rx_speed)}</small>
                                <small class="text-primary">TX: ${formatSpeed(iface.tx_speed)}</small>
                            </div>
                        </div>
                    </div>
                `;
                chartsContainer.appendChild(chartCol);
                
                // Load interface history and create chart
                loadInterfaceTrafficChart(deviceId, iface.name);
            });
        })
        .catch(error => {
            chartsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Interface Traffic</h5>
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
    const rxData = history.map(item => item.rx_speed / 1024 / 8); // Convert to Kbps
    const txData = history.map(item => item.tx_speed / 1024 / 8); // Convert to Kbps
    
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

// Load page data
function loadPageData(deviceId) {
    if (!deviceId) return;
    loadInterfacesData(deviceId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initInterfacesPage);
