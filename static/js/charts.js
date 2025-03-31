/**
 * Charts utility functions for Mikrotik monitoring dashboard
 */

// Create a gauge chart
function createGaugeChart(elementId, value, maxValue, label, options = {}) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    const chartValue = Math.min(value, maxValue);
    const percentage = (chartValue / maxValue) * 100;
    
    // Determine color based on percentage
    let color = 'rgba(40, 167, 69, 0.8)'; // green
    if (percentage > 90) {
        color = 'rgba(220, 53, 69, 0.8)'; // red
    } else if (percentage > 70) {
        color = 'rgba(255, 193, 7, 0.8)'; // yellow
    }
    
    // Default options
    const defaultOptions = {
        cutout: '70%',
        rotation: -90,
        circumference: 180,
        showLabel: true,
        labelSize: '1.5rem',
        showValue: true,
        valueFormat: null,
        valueSize: '1rem'
    };
    
    // Merge with provided options
    const chartOptions = {...defaultOptions, ...options};
    
    // Check if a chart already exists on this canvas
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create gauge chart
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Value', 'Remaining'],
            datasets: [{
                data: [chartValue, maxValue - chartValue],
                backgroundColor: [color, 'rgba(200, 200, 200, 0.2)'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: chartOptions.cutout,
            rotation: chartOptions.rotation,
            circumference: chartOptions.circumference,
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
        },
        plugins: [{
            id: 'gaugeText',
            afterDraw: (chart) => {
                const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
                ctx.save();
                
                // Draw label
                if (chartOptions.showLabel) {
                    ctx.font = `${chartOptions.labelSize} sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#aaaaaa';
                    ctx.fillText(label, width / 2, bottom - 10);
                }
                
                // Draw value
                if (chartOptions.showValue) {
                    let displayValue = value;
                    if (chartOptions.valueFormat) {
                        displayValue = chartOptions.valueFormat(value);
                    }
                    
                    ctx.font = `${chartOptions.valueSize} sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(displayValue, width / 2, bottom - 40);
                }
                
                ctx.restore();
            }
        }]
    });
    
    return chart;
}

// Create a line chart for time series data
function createTimeSeriesChart(elementId, data, options = {}) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Default options
    const defaultOptions = {
        type: 'line',
        height: '300px',
        responsive: true,
        maintainAspectRatio: false,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        timeUnit: 'minute',
        timeFormat: 'HH:mm',
        tooltipFormat: 'MMM d, HH:mm:ss',
        yAxisBeginAtZero: true,
        showLegend: true,
        legendPosition: 'top',
        datasets: []
    };
    
    // Merge with provided options
    const chartOptions = {...defaultOptions, ...options};
    
    // Apply height directly to canvas container
    if (chartOptions.height) {
        ctx.parentNode.style.height = chartOptions.height;
    }
    
    // Check if a chart already exists on this canvas
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create chart configuration
    const config = {
        type: chartOptions.type,
        data: {
            labels: data.labels || [],
            datasets: chartOptions.datasets.map((dataset, index) => {
                // Default colors if not provided
                const defaultColors = [
                    { borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)' },
                    { borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)' },
                    { borderColor: 'rgba(75, 192, 192, 1)', backgroundColor: 'rgba(75, 192, 192, 0.2)' },
                    { borderColor: 'rgba(255, 206, 86, 1)', backgroundColor: 'rgba(255, 206, 86, 0.2)' },
                    { borderColor: 'rgba(153, 102, 255, 1)', backgroundColor: 'rgba(153, 102, 255, 0.2)' }
                ];
                
                const colorIndex = index % defaultColors.length;
                
                return {
                    label: dataset.label || `Dataset ${index + 1}`,
                    data: dataset.data || [],
                    borderColor: dataset.borderColor || defaultColors[colorIndex].borderColor,
                    backgroundColor: dataset.backgroundColor || defaultColors[colorIndex].backgroundColor,
                    fill: dataset.fill !== undefined ? dataset.fill : chartOptions.fill,
                    tension: dataset.tension !== undefined ? dataset.tension : chartOptions.tension,
                    pointRadius: dataset.pointRadius !== undefined ? dataset.pointRadius : chartOptions.pointRadius,
                    borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : chartOptions.borderWidth,
                    yAxisID: dataset.yAxisID
                };
            })
        },
        options: {
            responsive: chartOptions.responsive,
            maintainAspectRatio: chartOptions.maintainAspectRatio,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: chartOptions.timeUnit,
                        displayFormats: {
                            [chartOptions.timeUnit]: chartOptions.timeFormat
                        },
                        tooltipFormat: chartOptions.tooltipFormat
                    },
                    title: {
                        display: !!chartOptions.xAxisTitle,
                        text: chartOptions.xAxisTitle || ''
                    },
                    grid: chartOptions.xAxisGrid
                },
                y: {
                    beginAtZero: chartOptions.yAxisBeginAtZero,
                    title: {
                        display: !!chartOptions.yAxisTitle,
                        text: chartOptions.yAxisTitle || ''
                    },
                    grid: chartOptions.yAxisGrid
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: chartOptions.showLegend,
                    position: chartOptions.legendPosition
                },
                tooltip: chartOptions.tooltip
            }
        }
    };
    
    // Add secondary Y axis if needed
    if (chartOptions.secondaryYAxis) {
        config.options.scales.y1 = {
            type: 'linear',
            position: 'right',
            beginAtZero: chartOptions.secondaryYAxis.beginAtZero !== undefined 
                ? chartOptions.secondaryYAxis.beginAtZero 
                : chartOptions.yAxisBeginAtZero,
            title: {
                display: !!chartOptions.secondaryYAxis.title,
                text: chartOptions.secondaryYAxis.title || ''
            },
            grid: {
                drawOnChartArea: false
            }
        };
    }
    
    // Create chart
    const chart = new Chart(ctx, config);
    
    return chart;
}

// Create a bar chart
function createBarChart(elementId, data, options = {}) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Default options
    const defaultOptions = {
        height: '300px',
        responsive: true,
        maintainAspectRatio: false,
        horizontal: false,
        stacked: false,
        yAxisBeginAtZero: true,
        showLegend: true,
        legendPosition: 'top',
        datasets: []
    };
    
    // Merge with provided options
    const chartOptions = {...defaultOptions, ...options};
    
    // Apply height directly to canvas container
    if (chartOptions.height) {
        ctx.parentNode.style.height = chartOptions.height;
    }
    
    // Check if a chart already exists on this canvas
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create chart configuration
    const config = {
        type: chartOptions.horizontal ? 'horizontalBar' : 'bar',
        data: {
            labels: data.labels || [],
            datasets: chartOptions.datasets.map((dataset, index) => {
                // Default colors if not provided
                const defaultColors = [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ];
                
                const colorIndex = index % defaultColors.length;
                
                return {
                    label: dataset.label || `Dataset ${index + 1}`,
                    data: dataset.data || [],
                    backgroundColor: dataset.backgroundColor || defaultColors[colorIndex],
                    borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 1
                };
            })
        },
        options: {
            responsive: chartOptions.responsive,
            maintainAspectRatio: chartOptions.maintainAspectRatio,
            scales: {
                x: {
                    stacked: chartOptions.stacked,
                    title: {
                        display: !!chartOptions.xAxisTitle,
                        text: chartOptions.xAxisTitle || ''
                    }
                },
                y: {
                    stacked: chartOptions.stacked,
                    beginAtZero: chartOptions.yAxisBeginAtZero,
                    title: {
                        display: !!chartOptions.yAxisTitle,
                        text: chartOptions.yAxisTitle || ''
                    }
                }
            },
            plugins: {
                legend: {
                    display: chartOptions.showLegend,
                    position: chartOptions.legendPosition
                },
                tooltip: chartOptions.tooltip
            }
        }
    };
    
    // Create chart
    const chart = new Chart(ctx, config);
    
    return chart;
}

// Create a pie or doughnut chart
function createPieChart(elementId, data, options = {}) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Default options
    const defaultOptions = {
        type: 'pie',  // 'pie' or 'doughnut'
        height: '300px',
        responsive: true,
        maintainAspectRatio: false,
        cutout: options.type === 'doughnut' ? '50%' : 0,
        showLegend: true,
        legendPosition: 'right'
    };
    
    // Merge with provided options
    const chartOptions = {...defaultOptions, ...options};
    
    // Apply height directly to canvas container
    if (chartOptions.height) {
        ctx.parentNode.style.height = chartOptions.height;
    }
    
    // Check if a chart already exists on this canvas
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Default colors if not provided
    const defaultColors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(201, 203, 207, 0.7)',
        'rgba(220, 53, 69, 0.7)'
    ];
    
    // Use provided colors or defaults
    const backgroundColors = data.backgroundColor || defaultColors;
    
    // Create chart configuration
    const config = {
        type: chartOptions.type,
        data: {
            labels: data.labels || [],
            datasets: [{
                data: data.values || [],
                backgroundColor: backgroundColors.slice(0, data.values.length),
                borderWidth: chartOptions.borderWidth !== undefined ? chartOptions.borderWidth : 1
            }]
        },
        options: {
            responsive: chartOptions.responsive,
            maintainAspectRatio: chartOptions.maintainAspectRatio,
            cutout: chartOptions.cutout,
            plugins: {
                legend: {
                    display: chartOptions.showLegend,
                    position: chartOptions.legendPosition
                },
                tooltip: chartOptions.tooltip
            }
        }
    };
    
    // Create chart
    const chart = new Chart(ctx, config);
    
    return chart;
}

// Update an existing chart with new data
function updateChart(chartInstance, newData, newLabels) {
    if (!chartInstance) return;
    
    if (newLabels) {
        chartInstance.data.labels = newLabels;
    }
    
    if (Array.isArray(newData)) {
        // Update each dataset
        newData.forEach((data, index) => {
            if (chartInstance.data.datasets[index]) {
                chartInstance.data.datasets[index].data = data;
            }
        });
    } else {
        // Update single dataset
        if (chartInstance.data.datasets[0]) {
            chartInstance.data.datasets[0].data = newData;
        }
    }
    
    chartInstance.update();
}

// Create a traffic chart (download/upload)
function createTrafficChart(elementId, data, options = {}) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Default options
    const defaultOptions = {
        height: '250px',
        rxLabel: 'Download',
        txLabel: 'Upload',
        rxColor: 'rgba(40, 167, 69, 1)',  // Green
        txColor: 'rgba(0, 123, 255, 1)',  // Blue
        fillOpacity: 0.1,
        timeUnit: 'minute',
        timeFormat: 'HH:mm',
        tooltipFormat: 'MMM d, HH:mm:ss',
        pointRadius: 0,
        showLegend: true
    };
    
    // Merge with provided options
    const chartOptions = {...defaultOptions, ...options};
    
    // Apply height directly to canvas container
    if (chartOptions.height) {
        ctx.parentNode.style.height = chartOptions.height;
    }
    
    // Extract data
    const timestamps = data.timestamps || [];
    const rxData = data.rx || [];
    const txData = data.tx || [];
    
    // Check if a chart already exists on this canvas
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create chart configuration
    const config = {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: chartOptions.rxLabel,
                    data: rxData,
                    borderColor: chartOptions.rxColor,
                    backgroundColor: `${chartOptions.rxColor.slice(0, -1)}, ${chartOptions.fillOpacity})`,
                    pointRadius: chartOptions.pointRadius,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: chartOptions.txLabel,
                    data: txData,
                    borderColor: chartOptions.txColor,
                    backgroundColor: `${chartOptions.txColor.slice(0, -1)}, ${chartOptions.fillOpacity})`,
                    pointRadius: chartOptions.pointRadius,
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
                        unit: chartOptions.timeUnit,
                        displayFormats: {
                            [chartOptions.timeUnit]: chartOptions.timeFormat
                        },
                        tooltipFormat: chartOptions.tooltipFormat
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
                        display: !!chartOptions.yAxisTitle,
                        text: chartOptions.yAxisTitle || ''
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
                    display: chartOptions.showLegend,
                    position: 'top'
                },
                tooltip: chartOptions.tooltip
            }
        }
    };
    
    // Create chart
    const chart = new Chart(ctx, config);
    
    return chart;
}
