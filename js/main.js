// Wait for document object model (DOM) to load
document.addEventListener("DOMContentLoaded", async () => {
    console.log('Starting the app..')
    // Initialize map
    await initMap();
    
    // Initialize scroll detection
    initScrollDetection();
    
    // Setup controls
    setupControls();
});

// Setup interactive controls
function setupControls() {
    // Main metric toggle
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from all
            toggleBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');
            
            const metric = this.dataset.metric;
            currentMetric = metric;
            
            // Show/hide appropriate submenu
            if (metric === 'climate') {
                document.getElementById('climate-submenu').classList.remove('hidden');
                document.getElementById('productivity-submenu').classList.add('hidden');
                
                // Set default climate var
                currentClimateVar = 'temperature';
                
                // Reset submenu buttons
                document.querySelectorAll('#climate-submenu .submenu-btn').forEach(b => {
                    b.classList.remove('active');
                });
                document.querySelector('#climate-submenu .submenu-btn[data-var="temperature"]').classList.add('active');
                
            } else {
                document.getElementById('climate-submenu').classList.add('hidden');
                document.getElementById('productivity-submenu').classList.remove('hidden');
                
                // Set default productivity var
                currentProductivityVar = 'productivity';
                
                // Reset submenu buttons
                document.querySelectorAll('#productivity-submenu .submenu-btn').forEach(b => {
                    b.classList.remove('active');
                });
                document.querySelector('#productivity-submenu .submenu-btn[data-var="productivity"]').classList.add('active');
            }
            
            if (typeof updateMap === 'function') {
                updateMap();
            }
        });
    });

    // Sub-menu buttons
    const submenuBtns = document.querySelectorAll('.submenu-btn');
    submenuBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active from siblings
            const siblings = this.parentElement.querySelectorAll('.submenu-btn');
            siblings.forEach(b => b.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
            
            const varType = this.dataset.var;
            
            if (currentMetric === 'climate') {
                currentClimateVar = varType; // 'temperature', 'rainfall', 'humidity'
            } else {
                currentProductivityVar = varType; // 'productivity', 'yieldArea', 'production'
            }
            
            if (typeof updateMap === 'function') {
                updateMap();
            }
        });
    });
    
    // Close popup button
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const popup = document.getElementById('province-popup');
            if (popup) {
                popup.classList.add('hidden');
            }
        });
    }
}

// On scroll tooltip update
window.addEventListener('scroll', onScrollTooltipUpdate, {passive: true});

function onScrollTooltipUpdate(){
    if(!sticky_on_scroll) {
        hideTooltip();
        return;
    }

    // if there's no active tooltip
    if(!activeTip.visible || !activeTip.feature)
        return;

    getTooltip()
        .html(buildTooltipHTML(activeTip.feature))
        .classed('hidden', false)

    positionTooltip(activeTip.x, activeTip.y);
}

// Show province popup chart
function showProvincePopup(provinceName) {
    console.log('Show popup for:', provinceName);
    
    const popup = document.getElementById('province-popup');
    const title = document.getElementById('popup-title');

    if (title) title.textContent = `${provinceName} Climate & Rice Productivity Trends`;
    if (popup) popup.classList.remove('hidden');

    // Draw chart (next phase!)
    drawProvinceChart(provinceName);
}

// Close popup
document.querySelector('.close-btn')?.addEventListener('click', () => {
    document.getElementById('province-popup').classList.add('hidden');
});

// Chart
function drawProvinceChart(provinceName) {
    console.log('Drawing chart for:', provinceName);
    
    // Get province data
    const province = provinceData.find(p => p.name === provinceName);
    if (!province) {
        console.error('Province not found:', provinceName);
        return;
    }
    
    // Clear previous chart
    d3.select('#popup-chart').html('');
    d3.select('#correlation-info').html('');
    
    // Setup chart dimensions
    const margin = {top: 20, right: 60, bottom: 40, left: 60};
    const width = 550 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const svg = d3.select('#popup-chart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Prepare data
    const years = province.data.map(d => d.year);
    const temperatures = province.data.map(d => d.temperature);
    const productivities = province.data.map(d => d.productivity);
    
    // Calculate correlation
    const correlation = calculateCorrelation(temperatures, productivities);
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);
    
    const yScaleTemp = d3.scaleLinear()
        .domain([d3.min(temperatures) - 1, d3.max(temperatures) + 1])
        .range([height, 0]);
    
    const yScaleProd = d3.scaleLinear()
        .domain([d3.min(productivities) - 2, d3.max(productivities) + 2])
        .range([height, 0]);
    
    // Line generators
    const tempLine = d3.line()
        .x((d, i) => xScale(years[i]))
        .y(d => yScaleTemp(d))
        .curve(d3.curveMonotoneX);
    
    const prodLine = d3.line()
        .x((d, i) => xScale(years[i]))
        .y(d => yScaleProd(d))
        .curve(d3.curveMonotoneX);
    
    // Draw axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
        .style('font-size', '12px');
    
    svg.append('g')
        .call(d3.axisLeft(yScaleTemp))
        .style('font-size', '12px');
    
    svg.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(yScaleProd))
        .style('font-size', '12px');
    
    // Draw temperature line
    svg.append('path')
        .datum(temperatures)
        .attr('fill', 'none')
        .attr('stroke', '#d53e4f')
        .attr('stroke-width', 3)
        .attr('d', tempLine);
    
    // Draw productivity line
    svg.append('path')
        .datum(productivities)
        .attr('fill', 'none')
        .attr('stroke', '#3288bd')
        .attr('stroke-width', 3)
        .attr('d', prodLine);
    
    // Add dots for temperature
    svg.selectAll('.dot-temp')
        .data(temperatures)
        .join('circle')
        .attr('class', 'dot-temp')
        .attr('cx', (d, i) => xScale(years[i]))
        .attr('cy', d => yScaleTemp(d))
        .attr('r', 5)
        .attr('fill', '#d53e4f')
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 7);
            const i = temperatures.indexOf(d);
            showChartTooltip(event, {
                year: years[i],
                temp: d,
                prod: productivities[i]
            });
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            hideChartTooltip();
        });
    
    // Add dots for productivity
    svg.selectAll('.dot-prod')
        .data(productivities)
        .join('circle')
        .attr('class', 'dot-prod')
        .attr('cx', (d, i) => xScale(years[i]))
        .attr('cy', d => yScaleProd(d))
        .attr('r', 5)
        .attr('fill', '#3288bd')
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
            d3.select(this).attr('r', 7);
            const i = productivities.indexOf(d);
            showChartTooltip(event, {
                year: years[i],
                temp: temperatures[i],
                prod: d
            });
        })
        .on('mouseleave', function() {
            d3.select(this).attr('r', 5);
            hideChartTooltip();
        });
    
    // Axis labels
    svg.append('text')
        .attr('x', -height / 2)
        .attr('y', -45)
        .attr('transform', 'rotate(-90)')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#d53e4f')
        .style('font-weight', 'bold')
        .text('Temperature (°C)');
    
    svg.append('text')
        .attr('x', width + 45)
        .attr('y', height / 2)
        .attr('transform', `rotate(90, ${width + 45}, ${height / 2})`)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#3288bd')
        .style('font-weight', 'bold')
        .text('Productivity (ton/ha)');
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Year');
    
    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, 10)`);
    
    legend.append('line')
        .attr('x1', 0).attr('x2', 30)
        .attr('y1', 0).attr('y2', 0)
        .attr('stroke', '#d53e4f')
        .attr('stroke-width', 3);
    
    legend.append('text')
        .attr('x', 35).attr('y', 5)
        .style('font-size', '12px')
        .text('Temperature');
    
    legend.append('line')
        .attr('x1', 0).attr('x2', 30)
        .attr('y1', 20).attr('y2', 20)
        .attr('stroke', '#3288bd')
        .attr('stroke-width', 3);
    
    legend.append('text')
        .attr('x', 35).attr('y', 25)
        .style('font-size', '12px')
        .text('Productivity');
    
    // Display correlation info
    displayCorrelation(correlation, provinceName);
}

// Calculate Pearson correlation
function calculateCorrelation(xArray, yArray) {
    const n = xArray.length;
    const sumX = d3.sum(xArray);
    const sumY = d3.sum(yArray);
    const sumXY = d3.sum(xArray.map((x, i) => x * yArray[i]));
    const sumX2 = d3.sum(xArray.map(x => x * x));
    const sumY2 = d3.sum(yArray.map(y => y * y));
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

// Display correlation information
function displayCorrelation(r, provinceName) {
    let interpretation = '';
    let emoji = '';
    
    if (r < -0.7) {
        interpretation = 'Strong negative correlation';
    } else if (r < -0.4) {
        interpretation = 'Moderate negative correlation';
    } else if (r < -0.1) {
        interpretation = 'Weak negative correlation';
    } else if (r < 0.1) {
        interpretation = 'No clear correlation';
    } else if (r < 0.4) {
        interpretation = 'Weak positive correlation';
    } else if (r < 0.7) {
        interpretation = 'Moderate positive correlation';
    } else {
        interpretation = 'Strong positive correlation';
    }
    
    const message = r < 0 
        ? 'Higher temperature correlates with lower rice productivity'
        : 'Higher temperature correlates with higher rice productivity';
    
    d3.select('#correlation-info').html(`
        <div style="background: #f0f4ff; padding: 1rem; border-radius: 6px; border-left: 4px solid #667eea;">
            <h4 style="margin: 0 0 0.5rem 0; color: #667eea;">Correlation Analysis</h4>
            <p style="margin: 0.5rem 0;">
                <strong>Pearson's r:</strong> ${r.toFixed(3)}
            </p>
            <p style="margin: 0.5rem 0;">
                ${emoji} <strong>${interpretation}</strong>
            </p>
            <p style="margin: 0.5rem 0; font-style: italic; color: #555;">
                ${message} in ${provinceName}.
            </p>
        </div>
    `);
}

// Chart tooltip helper
function showChartTooltip(event, data) {
    d3.select('#tooltip')
        .html(`
            <strong>Year ${data.year}</strong><br/>
            Temperature: ${data.temp.toFixed(1)}°C<br/>
            Productivity: ${data.prod.toFixed(1)} ton/ha
        `)
        .classed('hidden', false)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px');
}

function hideChartTooltip() {
    d3.select('#tooltip').classed('hidden', true);
}