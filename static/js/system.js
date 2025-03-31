/**
 * System information page functionality
 */

// Initialize system page
function initSystemPage() {
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
        loadSystemData(deviceId);
    } else if (deviceSelect && deviceSelect.value) {
        loadSystemData(deviceSelect.value);
    }
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value;
            refreshData(deviceId, loadSystemData);
        });
    }
}

// Load system data
function loadSystemData(deviceId) {
    if (!deviceId) return;
    
    // Load system resources
    loadSystemResourcesData(deviceId);
    
    // Load system history
    loadSystemHistoryData(deviceId);
}

// Load system resources data
function loadSystemResourcesData(deviceId) {
    const resourcesCard = document.getElementById('systemResourcesCard');
    if (!resourcesCard) return;
    
    resourcesCard.innerHTML = '';
    resourcesCard.appendChild(createSpinner());
    
    fetch(`/api/system/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('System resources not available');
            }
            return response.json();
        })
        .then(data => {
            const resources = data.resources;
            
            // Calculate usage percentages
            const cpuLoad = parseFloat(resources.cpu_load);
            
            let memoryUsage = 0;
            let memoryUsageText = 'N/A';
            if (resources.total_memory > 0) {
                memoryUsage = ((resources.total_memory - resources.free_memory) / resources.total_memory) * 100;
                memoryUsageText = `${formatBytes(resources.total_memory - resources.free_memory)} / ${formatBytes(resources.total_memory)} (${memoryUsage.toFixed(1)}%)`;
            }
            
            let diskUsage = 0;
            let diskUsageText = 'N/A';
            if (resources.total_hdd > 0) {
                diskUsage = ((resources.total_hdd - resources.free_hdd) / resources.total_hdd) * 100;
                diskUsageText = `${formatBytes(resources.total_hdd - resources.free_hdd)} / ${formatBytes(resources.total_hdd)} (${diskUsage.toFixed(1)}%)`;
            }
            
            // Create card content
            resourcesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">System Resources</h5>
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">CPU Load</h6>
                                    <div class="progress" style="height: 24px;">
                                        <div class="progress-bar ${cpuLoad > 90 ? 'bg-danger' : (cpuLoad > 70 ? 'bg-warning' : 'bg-success')}" 
                                             role="progressbar" 
                                             style="width: ${cpuLoad}%" 
                                             aria-valuenow="${cpuLoad}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${cpuLoad.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">Memory Usage</h6>
                                    <div class="progress" style="height: 24px;">
                                        <div class="progress-bar ${memoryUsage > 90 ? 'bg-danger' : (memoryUsage > 70 ? 'bg-warning' : 'bg-success')}" 
                                             role="progressbar" 
                                             style="width: ${memoryUsage}%" 
                                             aria-valuenow="${memoryUsage}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${memoryUsage.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div class="mt-2 small text-muted">${memoryUsageText}</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h6 class="card-subtitle mb-3 text-muted">Disk Usage</h6>
                                    <div class="progress" style="height: 24px;">
                                        <div class="progress-bar ${diskUsage > 90 ? 'bg-danger' : (diskUsage > 70 ? 'bg-warning' : 'bg-success')}" 
                                             role="progressbar" 
                                             style="width: ${diskUsage}%" 
                                             aria-valuenow="${diskUsage}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${diskUsage.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div class="mt-2 small text-muted">${diskUsageText}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body border-top">
                    <h5 class="card-title">System Information</h5>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <tbody>
                                <tr>
                                    <th style="width: 30%">Router OS Version</th>
                                    <td>${resources.version}</td>
                                </tr>
                                <tr>
                                    <th>Uptime</th>
                                    <td>${formatUptime(resources.uptime)}</td>
                                </tr>
                                <tr>
                                    <th>Board Name</th>
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
                                <tr>
                                    <th>CPU Load</th>
                                    <td>${resources.cpu_load}%</td>
                                </tr>
                                <tr>
                                    <th>Memory</th>
                                    <td>${formatBytes(resources.free_memory)} free of ${formatBytes(resources.total_memory)}</td>
                                </tr>
                                <tr>
                                    <th>Storage</th>
                                    <td>${formatBytes(resources.free_hdd)} free of ${formatBytes(resources.total_hdd)}</td>
                                </tr>
                                <tr>
                                    <th>Last Updated</th>
                                    <td>${formatDateTime(resources.timestamp)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
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
}

// Load system history data for charts
function loadSystemHistoryData(deviceId) {
    const historyCard = document.getElementById('systemHistoryCard');
    if (!historyCard) return;
    
    historyCard.innerHTML = '';
    historyCard.appendChild(createSpinner());
    
    fetch(`/api/system/history/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('System history not available');
            }
            return response.json();
        })
        .then(data => {
            const history = data.history || [];
            
            if (history.length === 0) {
                historyCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Resource History</h5>
                        <div class="text-center text-muted py-5">
                            <i class="bi bi-clock-history fs-1"></i>
                            <p class="mt-3">No history data available yet. Data will be collected over time.</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Create card content with charts
            historyCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Resource History</h5>
                    <div class="row">
                        <div class="col-md-12 mb-4">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-subtitle mb-2 text-muted">CPU & Memory Usage</h6>
                                    <div class="chart-container" style="position: relative; height:300px;">
                                        <canvas id="resourceHistoryChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Create resource history chart
            createResourceHistoryChart(history);
        })
        .catch(error => {
            historyCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Resource History</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load system history'}
                    </div>
                </div>
            `;
        });
}

// Create resource history chart
function createResourceHistoryChart(history) {
    const ctx = document.getElementById('resourceHistoryChart');
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
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Memory Usage (%)',
                    data: memoryData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
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
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSystemPage);
