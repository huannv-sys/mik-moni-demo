/**
 * Alerts page functionality
 */

// Initialize alerts page
function initAlertsPage() {
    const deviceSelect = document.getElementById('deviceSelect');
    if (deviceSelect) {
        deviceSelect.addEventListener('change', function() {
            updateActiveDevice(this.value);
        });
    }
    
    // Get device from URL parameter or use first device
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get('device');
    
    // If deviceId is provided, load alerts for that device
    // Otherwise, load all alerts
    loadAlerts(deviceId);
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value || '';
            refreshData(deviceId, loadAlerts);
        });
    }
    
    // Setup filter buttons
    setupFilterButtons();
}

// Load alerts
function loadAlerts(deviceId) {
    const alertsCard = document.getElementById('alertsCard');
    if (!alertsCard) return;
    
    alertsCard.innerHTML = '';
    alertsCard.appendChild(createSpinner());
    
    let url = '/api/alerts';
    if (deviceId) {
        url += `?device_id=${deviceId}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const alerts = data.alerts;
            
            // Create alerts card content
            alertsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Alerts</h5>
                    
                    <div class="alert-filters mb-3">
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary active" data-filter="all">All</button>
                            <button type="button" class="btn btn-outline-secondary" data-filter="active">Active</button>
                            <button type="button" class="btn btn-outline-secondary" data-filter="resolved">Resolved</button>
                        </div>
                        
                        <div class="btn-group ms-2" role="group">
                            <button type="button" class="btn btn-outline-secondary" data-severity="all">All Severity</button>
                            <button type="button" class="btn btn-outline-danger" data-severity="critical">Critical</button>
                            <button type="button" class="btn btn-outline-warning" data-severity="warning">Warning</button>
                            <button type="button" class="btn btn-outline-info" data-severity="info">Info</button>
                        </div>
                        
                        <button type="button" class="btn btn-primary ms-2" id="resolveAllBtn">
                            <i class="bi bi-check-all"></i> Resolve All Active
                        </button>
                    </div>
                    
                    <div id="alertsContainer">
                    </div>
                </div>
            `;
            
            const alertsContainer = document.getElementById('alertsContainer');
            
            if (alerts.length === 0) {
                alertsContainer.innerHTML = createEmptyState('No alerts found').outerHTML;
                return;
            }
            
            // Sort alerts: active first, then by creation date (newest first)
            alerts.sort((a, b) => {
                if (a.active !== b.active) {
                    return a.active ? -1 : 1;
                }
                return new Date(b.created) - new Date(a.created);
            });
            
            // Create alerts list
            const alertsList = document.createElement('div');
            alertsList.className = 'alerts-list';
            
            alerts.forEach((alert, index) => {
                const severityClass = getSeverityClass(alert.severity);
                const statusClass = alert.active ? 'active' : 'resolved';
                
                const alertElement = document.createElement('div');
                alertElement.className = `alert-item ${severityClass} ${statusClass}`;
                alertElement.setAttribute('data-status', alert.active ? 'active' : 'resolved');
                alertElement.setAttribute('data-severity', alert.severity);
                
                alertElement.innerHTML = `
                    <div class="alert-header">
                        <div class="alert-severity ${severityClass}">
                            ${getAlertIcon(alert.severity)} ${alert.severity.toUpperCase()}
                        </div>
                        <div class="alert-time">
                            ${formatDateTime(alert.created)}
                        </div>
                    </div>
                    <div class="alert-message">
                        ${alert.message}
                    </div>
                    <div class="alert-footer">
                        <div class="alert-device">
                            Device: ${getDeviceName(alert.device_id)}
                        </div>
                        <div class="alert-actions">
                            ${alert.active ? 
                                `<button class="btn btn-sm btn-outline-${severityClass} resolve-alert-btn" 
                                    data-alert-id="${index}">
                                    <i class="bi bi-check-lg"></i> Resolve
                                </button>` : 
                                `<span class="badge bg-secondary">
                                    <i class="bi bi-check-circle"></i> Resolved ${alert.resolved_time ? formatDateTime(alert.resolved_time) : ''}
                                </span>`
                            }
                        </div>
                    </div>
                `;
                
                alertsList.appendChild(alertElement);
            });
            
            alertsContainer.appendChild(alertsList);
            
            // Add event listeners to resolve buttons
            const resolveButtons = document.querySelectorAll('.resolve-alert-btn');
            resolveButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const alertId = this.getAttribute('data-alert-id');
                    resolveAlert(alertId);
                });
            });
            
            // Add event listener to resolve all button
            const resolveAllBtn = document.getElementById('resolveAllBtn');
            if (resolveAllBtn) {
                resolveAllBtn.addEventListener('click', function() {
                    const activeAlertIds = [];
                    alerts.forEach((alert, index) => {
                        if (alert.active) {
                            activeAlertIds.push(index);
                        }
                    });
                    
                    if (activeAlertIds.length === 0) {
                        showToast('No active alerts to resolve', 'info');
                        return;
                    }
                    
                    if (confirm(`Are you sure you want to resolve all ${activeAlertIds.length} active alerts?`)) {
                        resolveMultipleAlerts(activeAlertIds);
                    }
                });
            }
            
            // Setup filter buttons
            setupFilterButtons();
        })
        .catch(error => {
            alertsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Alerts</h5>
                    <div class="alert alert-warning">
                        Failed to load alerts: ${error.message}
                    </div>
                </div>
            `;
        });
}

// Get device name from its ID
function getDeviceName(deviceId) {
    const deviceSelect = document.getElementById('deviceSelect');
    if (!deviceSelect) return deviceId;
    
    const option = Array.from(deviceSelect.options).find(opt => opt.value === deviceId);
    return option ? option.text : deviceId;
}

// Get severity class for styling
function getSeverityClass(severity) {
    switch (severity.toLowerCase()) {
        case 'critical':
            return 'danger';
        case 'error':
            return 'danger';
        case 'warning':
            return 'warning';
        case 'info':
            return 'info';
        default:
            return 'secondary';
    }
}

// Get icon for alert severity
function getAlertIcon(severity) {
    switch (severity.toLowerCase()) {
        case 'critical':
            return '<i class="bi bi-exclamation-triangle-fill"></i>';
        case 'error':
            return '<i class="bi bi-exclamation-octagon-fill"></i>';
        case 'warning':
            return '<i class="bi bi-exclamation-circle-fill"></i>';
        case 'info':
            return '<i class="bi bi-info-circle-fill"></i>';
        default:
            return '<i class="bi bi-chat-square-text-fill"></i>';
    }
}

// Resolve an alert
function resolveAlert(alertId) {
    fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Alert resolved successfully', 'success');
            
            // Refresh alerts
            const deviceSelect = document.getElementById('deviceSelect');
            const deviceId = deviceSelect ? deviceSelect.value : '';
            loadAlerts(deviceId);
        } else {
            showToast(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        showToast(`Error: ${error.message}`, 'danger');
    });
}

// Resolve multiple alerts
function resolveMultipleAlerts(alertIds) {
    // Create a counter for successful resolutions
    let successCount = 0;
    let totalCount = alertIds.length;
    let errorMessages = [];
    
    // Show progress toast
    showToast(`Resolving ${totalCount} alerts...`, 'info');
    
    // Create promises for each alert resolution
    const promises = alertIds.map(alertId => {
        return fetch(`/api/alerts/${alertId}/resolve`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                successCount++;
            } else {
                errorMessages.push(`Alert #${alertId}: ${data.error}`);
            }
        })
        .catch(error => {
            errorMessages.push(`Alert #${alertId}: ${error.message}`);
        });
    });
    
    // When all are complete
    Promise.all(promises)
        .then(() => {
            if (successCount === totalCount) {
                showToast(`Successfully resolved all ${totalCount} alerts`, 'success');
            } else {
                showToast(`Resolved ${successCount} of ${totalCount} alerts`, 'warning');
                console.error('Errors resolving alerts:', errorMessages);
            }
            
            // Refresh alerts
            const deviceSelect = document.getElementById('deviceSelect');
            const deviceId = deviceSelect ? deviceSelect.value : '';
            loadAlerts(deviceId);
        });
}

// Setup filter buttons
function setupFilterButtons() {
    // Status filter buttons
    const statusFilterBtns = document.querySelectorAll('[data-filter]');
    statusFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            statusFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            
            // Apply filter
            const alerts = document.querySelectorAll('.alert-item');
            alerts.forEach(alert => {
                if (filter === 'all' || alert.getAttribute('data-status') === filter) {
                    alert.style.display = '';
                } else {
                    alert.style.display = 'none';
                }
            });
            
            // Also check severity filter
            const activeSeverityBtn = document.querySelector('[data-severity].active');
            if (activeSeverityBtn) {
                const severity = activeSeverityBtn.getAttribute('data-severity');
                if (severity !== 'all') {
                    alerts.forEach(alert => {
                        if (alert.style.display !== 'none' && alert.getAttribute('data-severity') !== severity) {
                            alert.style.display = 'none';
                        }
                    });
                }
            }
            
            checkForEmptyState();
        });
    });
    
    // Severity filter buttons
    const severityFilterBtns = document.querySelectorAll('[data-severity]');
    severityFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            severityFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const severity = this.getAttribute('data-severity');
            
            // Apply filter
            const alerts = document.querySelectorAll('.alert-item');
            alerts.forEach(alert => {
                if (severity === 'all' || alert.getAttribute('data-severity') === severity) {
                    alert.style.display = '';
                } else {
                    alert.style.display = 'none';
                }
            });
            
            // Also check status filter
            const activeStatusBtn = document.querySelector('[data-filter].active');
            if (activeStatusBtn) {
                const status = activeStatusBtn.getAttribute('data-filter');
                if (status !== 'all') {
                    alerts.forEach(alert => {
                        if (alert.style.display !== 'none' && alert.getAttribute('data-status') !== status) {
                            alert.style.display = 'none';
                        }
                    });
                }
            }
            
            checkForEmptyState();
        });
    });
}

// Check if there are any visible alerts and show empty state if needed
function checkForEmptyState() {
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    
    const alerts = document.querySelectorAll('.alert-item');
    const visibleAlerts = Array.from(alerts).filter(alert => alert.style.display !== 'none');
    
    // If no visible alerts, show empty state
    if (visibleAlerts.length === 0) {
        // Check if empty state already exists
        if (!document.querySelector('.empty-state')) {
            const emptyState = createEmptyState('No alerts match your current filters');
            alertsContainer.appendChild(emptyState);
        }
    } else {
        // Remove empty state if it exists
        const emptyState = document.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }
}

// Load page data
function loadPageData(deviceId) {
    loadAlerts(deviceId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAlertsPage);
