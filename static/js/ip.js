/**
 * IP page functionality
 */

// Initialize IP page
function initIPPage() {
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
        loadIPData(deviceId);
    } else if (deviceSelect && deviceSelect.value) {
        loadIPData(deviceSelect.value);
    }
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value;
            refreshData(deviceId, loadIPData);
        });
    }
}

// Load IP address data
function loadIPData(deviceId) {
    if (!deviceId) return;
    
    loadIPAddresses(deviceId);
    loadARPEntries(deviceId);
}

// Load IP addresses
function loadIPAddresses(deviceId) {
    const ipAddressesCard = document.getElementById('ipAddressesCard');
    if (!ipAddressesCard) return;
    
    ipAddressesCard.innerHTML = '';
    ipAddressesCard.appendChild(createSpinner());
    
    fetch(`/api/ip/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('IP addresses not available');
            }
            return response.json();
        })
        .then(data => {
            const addresses = data.addresses;
            
            if (addresses.length === 0) {
                ipAddressesCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">IP Addresses</h5>
                        ${createEmptyState('No IP addresses found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create DataTable
            ipAddressesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">IP Addresses</h5>
                    <div class="table-responsive">
                        <table id="ipAddressesTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Address</th>
                                    <th>Network</th>
                                    <th>Interface</th>
                                    <th>Status</th>
                                    <th>Type</th>
                                    <th>Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${addresses.map(addr => `
                                    <tr>
                                        <td>${addr.address}</td>
                                        <td>${addr.network}</td>
                                        <td>${addr.interface}</td>
                                        <td>${addr.disabled ? 
                                            '<span class="badge bg-secondary">Disabled</span>' : 
                                            '<span class="badge bg-success">Active</span>'}
                                        </td>
                                        <td>${addr.dynamic ? 
                                            '<span class="badge bg-info">Dynamic</span>' : 
                                            '<span class="badge bg-primary">Static</span>'}
                                        </td>
                                        <td>${addr.comment}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#ipAddressesTable').DataTable({
                responsive: true,
                order: [[2, 'asc'], [0, 'asc']],  // Sort by interface, then address
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ addresses",
                    info: "Showing _START_ to _END_ of _TOTAL_ addresses"
                }
            });
        })
        .catch(error => {
            ipAddressesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">IP Addresses</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load IP addresses'}
                    </div>
                </div>
            `;
        });
}

// Load ARP entries
function loadARPEntries(deviceId) {
    const arpEntriesCard = document.getElementById('arpEntriesCard');
    if (!arpEntriesCard) return;
    
    arpEntriesCard.innerHTML = '';
    arpEntriesCard.appendChild(createSpinner());
    
    fetch(`/api/arp/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('ARP entries not available');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error loading ARP entries:', error);
            arpEntriesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">ARP Table</h5>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill"></i> 
                        ARP entries not available. The device may be offline or this feature may not be supported.
                    </div>
                </div>
            `;
            throw error;
        })
        .then(data => {
            const entries = data.entries;
            
            if (entries.length === 0) {
                arpEntriesCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">ARP Table</h5>
                        ${createEmptyState('No ARP entries found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create DataTable
            arpEntriesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">ARP Table</h5>
                    <div class="table-responsive">
                        <table id="arpEntriesTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>IP Address</th>
                                    <th>MAC Address</th>
                                    <th>Interface</th>
                                    <th>Status</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${entries.map(entry => `
                                    <tr>
                                        <td>${entry.address}</td>
                                        <td>${formatMacAddress(entry.mac_address)}</td>
                                        <td>${entry.interface}</td>
                                        <td>${entry.complete ? 
                                            '<span class="badge bg-success">Complete</span>' : 
                                            '<span class="badge bg-warning">Incomplete</span>'}
                                        </td>
                                        <td>${entry.dynamic ? 
                                            '<span class="badge bg-info">Dynamic</span>' : 
                                            '<span class="badge bg-primary">Static</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Initialize DataTable
            $('#arpEntriesTable').DataTable({
                responsive: true,
                order: [[2, 'asc'], [0, 'asc']],  // Sort by interface, then IP
                pageLength: 10,
                language: {
                    search: "Filter:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ entries"
                }
            });
        })
        .catch(error => {
            arpEntriesCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">ARP Table</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load ARP entries'}
                    </div>
                </div>
            `;
        });
}

// Load page data
function loadPageData(deviceId) {
    if (!deviceId) return;
    loadIPData(deviceId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initIPPage);
