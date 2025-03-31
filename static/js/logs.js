/**
 * Logs page functionality
 */

// Initialize logs page
function initLogsPage() {
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
        loadLogsData(deviceId);
    } else if (deviceSelect && deviceSelect.value) {
        loadLogsData(deviceSelect.value);
    }
    
    // Setup refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const deviceId = document.getElementById('deviceSelect').value;
            refreshData(deviceId, loadLogsData);
        });
    }
    
    // Setup filter inputs
    const topicFilter = document.getElementById('topicFilter');
    const messageFilter = document.getElementById('messageFilter');
    
    if (topicFilter) {
        topicFilter.addEventListener('input', filterLogs);
    }
    
    if (messageFilter) {
        messageFilter.addEventListener('input', filterLogs);
    }
}

// Load logs data
function loadLogsData(deviceId) {
    if (!deviceId) return;
    
    loadSystemLogs(deviceId);
    analyzeLogTopics(deviceId);
}

// Load system logs
function loadSystemLogs(deviceId) {
    const logsCard = document.getElementById('systemLogsCard');
    if (!logsCard) return;
    
    logsCard.innerHTML = '';
    logsCard.appendChild(createSpinner());
    
    fetch(`/api/logs/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('System logs not available');
            }
            return response.json();
        })
        .then(data => {
            const logs = data.logs;
            
            if (logs.length === 0) {
                logsCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">System Logs</h5>
                        ${createEmptyState('No logs found').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Create filter controls and log table
            logsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">System Logs</h5>
                    
                    <div class="row mb-3">
                        <div class="col-md-6 mb-2">
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-tag"></i></span>
                                <input type="text" class="form-control" id="topicFilter" placeholder="Filter by topic...">
                            </div>
                        </div>
                        <div class="col-md-6 mb-2">
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control" id="messageFilter" placeholder="Filter by message...">
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table id="logsTable" class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th style="width: 160px;">Time</th>
                                    <th style="width: 160px;">Topics</th>
                                    <th>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.map(log => `
                                    <tr class="log-row" data-topics="${log.topics.toLowerCase()}">
                                        <td>${log.time}</td>
                                        <td>
                                            <span class="badge log-topic-badge">${log.topics}</span>
                                        </td>
                                        <td>${log.message}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Color code topic badges
            colorCodeTopicBadges();
            
            // Setup filter inputs
            const topicFilter = document.getElementById('topicFilter');
            const messageFilter = document.getElementById('messageFilter');
            
            if (topicFilter) {
                topicFilter.addEventListener('input', filterLogs);
            }
            
            if (messageFilter) {
                messageFilter.addEventListener('input', filterLogs);
            }
        })
        .catch(error => {
            logsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">System Logs</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to load system logs'}
                    </div>
                </div>
            `;
        });
}

// Analyze log topics for visualization
function analyzeLogTopics(deviceId) {
    const topicsCard = document.getElementById('logTopicsCard');
    if (!topicsCard) return;
    
    topicsCard.innerHTML = '';
    topicsCard.appendChild(createSpinner());
    
    fetch(`/api/logs/${deviceId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('System logs not available');
            }
            return response.json();
        })
        .then(data => {
            const logs = data.logs;
            
            if (logs.length === 0) {
                topicsCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Log Topics</h5>
                        ${createEmptyState('No logs found for analysis').outerHTML}
                    </div>
                `;
                return;
            }
            
            // Count logs by topic
            const topicCounts = {};
            logs.forEach(log => {
                const topic = log.topics;
                if (!topicCounts[topic]) {
                    topicCounts[topic] = 0;
                }
                topicCounts[topic]++;
            });
            
            // Sort topics by count (descending)
            const sortedTopics = Object.keys(topicCounts).sort((a, b) => {
                return topicCounts[b] - topicCounts[a];
            });
            
            // Create charts and stats
            topicsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Log Topics</h5>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6 class="card-subtitle mb-3 text-muted">Topic Distribution</h6>
                                    <canvas id="topicsChart" height="220"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h6 class="card-subtitle mb-3 text-muted">Top Topics</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Topic</th>
                                                    <th>Count</th>
                                                    <th>Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${sortedTopics.slice(0, 5).map(topic => {
                                                    const count = topicCounts[topic];
                                                    const percentage = (count / logs.length * 100).toFixed(1);
                                                    return `
                                                        <tr>
                                                            <td>
                                                                <span class="badge log-topic-badge" data-topic="${topic}">${topic}</span>
                                                            </td>
                                                            <td>${count}</td>
                                                            <td>${percentage}%</td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="mt-3">
                                        <small class="text-muted">
                                            Total logs: ${logs.length}<br>
                                            Unique topics: ${sortedTopics.length}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Color code topic badges
            colorCodeTopicBadges();
            
            // Create topics chart
            createTopicsChart(sortedTopics, topicCounts, logs.length);
        })
        .catch(error => {
            topicsCard.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Log Topics</h5>
                    <div class="alert alert-warning">
                        ${error.message || 'Failed to analyze log topics'}
                    </div>
                </div>
            `;
        });
}

// Create topics distribution chart
function createTopicsChart(topics, topicCounts, totalLogs) {
    const ctx = document.getElementById('topicsChart');
    if (!ctx) return;
    
    // Limit to top 8 topics, group others as "Other"
    let chartTopics = topics.slice(0, 8);
    let chartData = chartTopics.map(topic => topicCounts[topic]);
    
    // Check if we need an "Other" category
    if (topics.length > 8) {
        const otherCount = topics.slice(8).reduce((sum, topic) => sum + topicCounts[topic], 0);
        chartTopics.push('Other');
        chartData.push(otherCount);
    }
    
    // Generate colors for topics
    const backgroundColors = chartTopics.map(topic => getTopicColor(topic));
    
    // Create chart
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartTopics,
            datasets: [{
                data: chartData,
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
                    labels: {
                        boxWidth: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = ((value / totalLogs) * 100).toFixed(1);
                            return `${label}: ${value} logs (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Filter logs based on input fields
function filterLogs() {
    const topicFilter = document.getElementById('topicFilter');
    const messageFilter = document.getElementById('messageFilter');
    
    const topicValue = topicFilter ? topicFilter.value.toLowerCase() : '';
    const messageValue = messageFilter ? messageFilter.value.toLowerCase() : '';
    
    const rows = document.querySelectorAll('.log-row');
    
    rows.forEach(row => {
        const topics = row.getAttribute('data-topics').toLowerCase();
        const message = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        
        const topicMatch = topics.includes(topicValue);
        const messageMatch = message.includes(messageValue);
        
        // Show row if both filters match (or if filters are empty)
        if ((topicMatch || topicValue === '') && (messageMatch || messageValue === '')) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Generate consistent color for a topic
function getTopicColor(topic) {
    // Hash the topic name to get a consistent color
    let hash = 0;
    for (let i = 0; i < topic.length; i++) {
        hash = topic.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to HSL color - use hue between 0-360
    const hue = Math.abs(hash % 360);
    
    // Choose from a set of pre-defined colors for common topics
    const topicColors = {
        'system': 'rgba(52, 152, 219, 0.7)',       // Blue
        'critical': 'rgba(231, 76, 60, 0.7)',      // Red
        'error': 'rgba(231, 76, 60, 0.7)',         // Red
        'warning': 'rgba(241, 196, 15, 0.7)',      // Yellow
        'info': 'rgba(46, 204, 113, 0.7)',         // Green
        'firewall': 'rgba(155, 89, 182, 0.7)',     // Purple
        'wireless': 'rgba(52, 152, 219, 0.7)',     // Blue
        'dhcp': 'rgba(230, 126, 34, 0.7)',         // Orange
        'interface': 'rgba(26, 188, 156, 0.7)',    // Teal
        'Other': 'rgba(149, 165, 166, 0.7)'        // Gray
    };
    
    // For exact matches with known topics, use predefined colors
    for (const knownTopic in topicColors) {
        if (topic.toLowerCase().includes(knownTopic.toLowerCase())) {
            return topicColors[knownTopic];
        }
    }
    
    // Otherwise, generate from hue
    return `hsla(${hue}, 70%, 60%, 0.7)`;
}

// Apply color coding to topic badges
function colorCodeTopicBadges() {
    const topicBadges = document.querySelectorAll('.log-topic-badge');
    
    topicBadges.forEach(badge => {
        const topic = badge.textContent;
        const color = getTopicColor(topic);
        
        // Apply background color
        badge.style.backgroundColor = color;
    });
}

// Load page data
function loadPageData(deviceId) {
    if (!deviceId) return;
    loadLogsData(deviceId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLogsPage);
