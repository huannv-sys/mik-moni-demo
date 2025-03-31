/**
 * Utility functions for the Mikrotik monitoring dashboard
 */

// Format bytes to human-readable string
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format speed to human-readable string
function formatSpeed(bytesPerSecond, decimals = 2) {
    if (bytesPerSecond === 0) return '0 bps';
    
    // Convert bytes to bits
    const bitsPerSecond = bytesPerSecond * 8;
    
    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
    
    const i = Math.floor(Math.log(bitsPerSecond) / Math.log(k));
    
    return parseFloat((bitsPerSecond / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format uptime to human-readable string
function formatUptime(uptimeString) {
    if (!uptimeString) return '';
    
    // Parse RouterOS uptime format (e.g., "1w2d3h4m5s")
    let weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0;
    
    const weekMatch = uptimeString.match(/(\d+)w/);
    if (weekMatch) weeks = parseInt(weekMatch[1]);
    
    const dayMatch = uptimeString.match(/(\d+)d/);
    if (dayMatch) days = parseInt(dayMatch[1]);
    
    const hourMatch = uptimeString.match(/(\d+)h/);
    if (hourMatch) hours = parseInt(hourMatch[1]);
    
    const minuteMatch = uptimeString.match(/(\d+)m/);
    if (minuteMatch) minutes = parseInt(minuteMatch[1]);
    
    const secondMatch = uptimeString.match(/(\d+)s/);
    if (secondMatch) seconds = parseInt(secondMatch[1]);
    
    let result = '';
    if (weeks > 0) result += `${weeks} week${weeks > 1 ? 's' : ''} `;
    if (days > 0) result += `${days} day${days > 1 ? 's' : ''} `;
    if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
    if (minutes > 0) result += `${minutes} minute${minutes > 1 ? 's' : ''} `;
    if (seconds > 0) result += `${seconds} second${seconds > 1 ? 's' : ''} `;
    
    return result.trim();
}

// Format date/time
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    return date.toLocaleString();
}

// Format MAC address with colons
function formatMacAddress(mac) {
    if (!mac) return '';
    
    // If already formatted, return as is
    if (mac.includes(':')) return mac;
    
    // Format as XX:XX:XX:XX:XX:XX
    return mac.match(/.{1,2}/g).join(':');
}

// Update active device selection in the sidebar
function updateActiveDevice(deviceId) {
    // Update dropdown selection
    const deviceSelect = document.getElementById('deviceSelect');
    if (deviceSelect) {
        deviceSelect.value = deviceId;
    }
    
    // Update URL parameter
    const url = new URL(window.location);
    url.searchParams.set('device', deviceId);
    window.history.pushState({}, '', url);
    
    // Update page content
    loadPageData(deviceId);
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const toastContent = document.createElement('div');
    toastContent.className = 'd-flex';
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastContent.appendChild(toastBody);
    toastContent.appendChild(closeButton);
    toast.appendChild(toastContent);
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toastContainer.removeChild(toast);
    });
}

// Refresh data with a loading indicator
function refreshData(deviceId, callback) {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.setAttribute('disabled', 'disabled');
        refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';
    }
    
    fetch(`/api/refresh/${deviceId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Data refreshed successfully', 'success');
            if (typeof callback === 'function') {
                callback(deviceId);
            }
        } else {
            showToast(`Error: ${data.error || 'Failed to refresh data'}`, 'danger');
        }
    })
    .catch(error => {
        showToast(`Error: ${error.message || 'Failed to refresh data'}`, 'danger');
    })
    .finally(() => {
        if (refreshBtn) {
            refreshBtn.removeAttribute('disabled');
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        }
    });
}

// Create a loading spinner
function createSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'd-flex justify-content-center mt-5';
    spinner.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    return spinner;
}

// Create error message
function createErrorMessage(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger mt-3';
    alert.textContent = message;
    return alert;
}

// Create empty state message
function createEmptyState(message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center my-5 py-5';
    emptyState.innerHTML = `
        <i class="bi bi-inbox fs-1 text-muted"></i>
        <p class="mt-3 text-muted">${message}</p>
    `;
    return emptyState;
}
