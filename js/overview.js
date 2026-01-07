(async function(){
    // Load data
    const raw = combinedData;
    const rows = raw.provinces.flatMap(p =>
        p.data.map(d => ({
        province: p.name,
        year: +d.year,
        temperature: +d.temperature,
        rainfall: +d.rainfall,
        humidity: +d.humidity,
        production: +d.production
        }))
    );

    const years = d3.extent(rows, d=>d.year);

    // DOM refs
    const svg  = d3.select('#ovr-dot');
    const tip  = d3.select('#ovr-tip');
    const note = d3.select('#ovr-note');
    const insight = d3.select('#ovr-insight');

    // DOM refs: control
    const xSelection = d3.select('#ovr-x');
    const yearInput = d3.select('#ovr-year');
    const yearLabel = d3.select('#ovr-year-label');
    const playButton = d3.select('#ovr-play');

    // Init controls
    yearInput.attr('min', years[0])
             .attr('max', years[1])
             .property('value', years[0]);

    yearLabel.text(years[0]);

    // Chart setup (Scott-Murray style) with responsive width
    const margin = {top: 20, right: 24, bottom: 56, left: 72};
    
    // Get width from parent container instead of SVG attribute
    const container = document.getElementById('ovr-chart-wrap');
    const containerWidth = container ? container.clientWidth : 900;
    svg.attr('width', containerWidth);
    
    const width  = containerWidth - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top  - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scale and axis
    const x = d3.scaleLinear()
                .range([0, width]);
    const y = d3.scaleLinear()
                .range([height, 0]);
    const xAxis = g.append('g')
                    .attr('class','axis')
                    .attr('transform', `translate(0,${height})`);
    const yAxis = g.append('g')
                    .attr('class','axis');

    // Axis label
    const xLabel = svg.append('text')
        .attr('class','label')
        .attr('text-anchor','middle').attr('x', margin.left + width/2)
        .attr('y', margin.top + height + 44);
    svg.append('text')
        .attr('class','label')
        .attr('text-anchor','middle')
        .attr('transform', `translate(18, ${margin.top + height/2}) rotate(-90)`)
        .text('Rice Production (tons)');

    const color = {temperature:'#e45757', rainfall:'#3b82f6', humidity:'#5a189a'};
    const color_legend = [
        { key: 'temperature', label: 'Temperature (°C)', color: '#e45757' },
        { key: 'rainfall',    label: 'Rainfall (mm)',    color: '#3b82f6' },
        { key: 'humidity',    label: 'Humidity (%)',     color: '#5a189a' }
    ];

    function getIndicatorColor(key) {
        if (typeof color_legend !== 'undefined') {
            const item = color_legend.find(d => d.key === key);
            if (item) return item.color;
        }
        return '#2c5f4f'; // default
    }
    // Format data
    const fmt = d3.format(',');
    const fmt1 = d3.format(',.1f');

    // Events
    // Updates when indicator changes
    function onIndicatorChange() {
        updateLabels();
        updateTooltip();
        updateTrendChart();
        updateLegendActive();
    }

    xSelection.on('change', onIndicatorChange);

    yearInput.on('input', ()=>{
        yearLabel.text(yearInput.node().value);
        updateTooltip(); });

    let playing = false, timer = null;
    playButton.on('click', ()=>{
        if(playing){
            playing=false;
            playButton.text('Play');
            
            if(timer) timer.stop();
            
            return; 
        }

        playing = true; 

        playButton.text('Pause');

        let yearvalue = +yearInput.node().value, 
            maxY = +yearInput.attr('max'),
            minY = +yearInput.attr('min');

        timer = d3.interval(()=>{
            yearvalue = (yearvalue < maxY) ? (yearvalue+1) : minY;
            yearInput.property('value', yearvalue);
            yearLabel.text(yearvalue);
            updateTooltip();
        }, 1000);
    });

    // Update label on x-axis
    function updateLabels(){
        const label = {
            temperature: 'Temperature (°C)',
            rainfall: 'Rainfall (mm)',
            humidity: 'Humidity (%)'
        }[xSelection.node().value];
        xLabel.text(label);
    }

    // Generate dynamic insights based on climate indicator
    function updateInsight(xKey, data) {
        const insights = {
            temperature: [
                "The scatter plot reveals how temperature correlates with rice productivity across provinces in a single year, while the trend line shows the national average temperature pattern from 2019-2024. Most high-productivity provinces maintain temperatures between 26-28°C. The 6-year trend helps identify whether temperature variations are becoming more extreme or stabilizing over time.",
                "Notice the clustering patterns in the scatter plot where provinces with similar temperatures often show varied productivity levels, suggesting other factors like water management matter too. The national trend line smooths out provincial differences, revealing whether Indonesia's rice belt is experiencing warming trends that could impact future cultivation strategies.",
                "The scatter plot demonstrates temperature's complex role in rice cultivation, while the trend line tracks whether average temperatures across top provinces are rising, falling, or remaining stable. Comparing individual years in the scatter with the overall trend helps identify anomalous years and long-term climate patterns affecting rice production."
            ],
            rainfall: [
                "Rainfall patterns tell two stories: the scatter plot shows how different rainfall levels affect productivity within a year, while the trend line reveals whether Indonesia's top rice provinces are experiencing increasingly wet or dry conditions over 2019-2024. Optimal rainfall (1,500-2,500mm) supports high yields, but the trend shows if precipitation is becoming more unpredictable.",
                "The scatter plot highlights interesting patterns that is moderate, consistent rainfall correlates with higher productivity, while extreme rainfall (>3,000mm) often reduces yields due to flooding. Meanwhile, the national trend line reveals whether average rainfall across provinces is increasing, decreasing, or fluctuating year-to-year, helping predict future irrigation needs.",
                "Indonesia's rice belt depends heavily on monsoon patterns, shown in both charts. The scatter plot demonstrates how individual provinces respond to different rainfall levels, while the 6-year trend line reveals whether climate change is making rainfall more erratic or maintaining historical patterns across the agricultural heartland."
            ],
            humidity: [
                "Humidity's dual impact is captured in both visualizations: the scatter plot shows the optimal range (70-80%) for rice growth in a given year, while the trend line tracks whether average humidity levels across provinces are shifting over time. Higher humidity can increase disease pressure, while lower humidity may cause water stress.",
                "The scatter plot reveals that most high-productivity provinces maintain humidity around 73-77%, but productivity varies even at similar levels when timing matters during growth stages. The national trend line helps identify if humidity patterns are becoming consistently higher or lower, which could require adjustments in cultivation practices and disease management.",
                "Both charts work together to show humidity's complex role: the scatter plot demonstrates year-specific relationships between humidity and productivity across provinces, while the trend line reveals whether the top rice-producing regions are experiencing systematic changes in moisture levels that could affect long-term planning and variety selection."
            ]
        };
        
        // Calculate correlation for insight selection
        const correlation = calculateSimpleCorrelation(data, xKey);
        let insightIndex = 0;
        
        // Select insight based on correlation strength
        if (Math.abs(correlation) > 0.5) {
            insightIndex = 0; // Strong relationship - explain both strong correlation and trend
        } else if (Math.abs(correlation) > 0.2) {
            insightIndex = 1; // Moderate relationship - explain patterns and variability
        } else {
            insightIndex = 2; // Weak/complex relationship - explain complexity in both charts
        }
        
        insight.text(insights[xKey][insightIndex]);
    }

    // Simple correlation calculation
    function calculateSimpleCorrelation(data, xKey) {
        if (data.length < 2) return 0;
        
        const xMean = d3.mean(data, d => d[xKey]);
        const yMean = d3.mean(data, d => d.production);
        
        let numerator = 0;
        let xDenominator = 0;
        let yDenominator = 0;
        
        data.forEach(d => {
            const xDiff = d[xKey] - xMean;
            const yDiff = d.production - yMean;
            numerator += xDiff * yDiff;
            xDenominator += xDiff * xDiff;
            yDenominator += yDiff * yDiff;
        });
        
        const denominator = Math.sqrt(xDenominator * yDenominator);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    function updateTooltip(){
        const year = +yearInput.node().value;
        const xKey = xSelection.node().value;

        // filter each year
        let data = rows.filter(d=>d.year===year);

        // padding
        const xExt = d3.extent(data, d=>d[xKey]);
        const xp=(xExt[1]-xExt[0]||1)*0.08;
        const yExt = d3.extent(data, d=>d.production);
        const yp=(yExt[1]-yExt[0]||1)*0.08;
        x.domain([xExt[0]-xp, xExt[1]+xp]);
        y.domain([yExt[0]-yp, yExt[1]+yp]);

        // transition
        xAxis.transition()
            .duration(250)
            .call(d3.axisBottom(x).ticks(6));
        yAxis.transition()
            .duration(250)
            .call(d3.axisLeft(y).ticks(6).tickFormat(d => {
                // Format large numbers nicely
                if (d >= 1000000) {
                    return (d / 1000000).toFixed(1) + 'M';
                }
                return d3.format('~s')(d);
            }));
        
        // data join (key = province)
        const dots = g.selectAll('.ovr-dot').data(data, d=>d.province);

        // pointer enter
        dots.enter().append('circle')
            .attr('class','ovr-dot')
            .attr('r', 0)
            .attr('cx', d=>x(d[xKey]))
            .attr('cy', d=>y(d.production))
            .attr('fill', color[xKey])
            .attr('opacity', 1)
            .style('cursor','pointer')
            // when hover
            .on('pointerenter', onDotEnter)
            .on('pointermove', (ev,d)=> showTip(ev, d, xKey))
            .on('pointerleave', onDotLeave)
            .transition().duration(350).attr('r', 10);

        // pointer move
        dots.transition().duration(300)
            .attr('fill', color[xKey])
            .attr('cx', d=>x(d[xKey]))
            .attr('cy', d=>y(d.production))
            .attr('opacity', 0.9)
            .attr('r', 10)
            .attr('stroke', null)
            .attr('stroke-width', null);

        // pointer leave
        dots.exit()
            .transition()
            .duration(250)
            .attr('r',0)
            .remove();
        
        // note under the chart
        if(data.length){
            const best = data.reduce((a,b)=> a.production>b.production?a:b);
            const prodFormatted = (best.production / 1000000).toFixed(2) + 'M';
            note.text(`Year ${year}: Highest rice production = ${best.province} (${prodFormatted} tons)`);
        } else {
            note.text('No data for the selection.');
        }
        
        // Update insight based on climate indicator
        updateInsight(xKey, data);
    }

    // when hover: active dot only
    function focusDot(selection){
        g.selectAll('.ovr-dot')
            .filter(function(){ return this !== selection.node(); })
            .transition().duration(120)
            .attr('opacity', 0.5)
            .attr('r', 10)
            .attr('stroke', null);
        
        // click active dot
        selection.raise().transition().duration(120)
            .attr('opacity', 1)
            .attr('r', 10)
            .attr('stroke', '#111')
            .attr('stroke-width', 2);
        }

        // back to normal
        function clearFocus(){
        g.selectAll('.ovr-dot').transition().duration(150)
            .attr('opacity', 0.9)
            .attr('r', 10)
            .attr('stroke', null)
            .attr('stroke-width', null);
        }

        // event handlers
        function onDotEnter(event, d){
            const sel = d3.select(this);
            focusDot(sel);
            showTip(event, d, d3.select('#ovr-x').property('value'));
        }

        function onDotLeave(){
            hideTooltip();
            clearFocus();
        }


    function renderLegend(){
        const box = d3.select('#ovr-legend');
        const selection = box.selectAll('.item').data(color_legend, d=>d.key);
        const enter = selection.enter().append('div')
                        .attr('class','item')
                        .on('click', (ev,d) => {
                            d3.select('#ovr-x')
                            .property('value', d.key)
                            .dispatch('change');
                        });

        enter.append('span').attr('class','swatch').style('background', d=>d.color);
        enter.append('span').attr('class','lab').text(d=>d.label);

        selection.exit().remove();

        updateLegendActive();
        }

    function updateLegendActive(){
        const current = d3.select('#ovr-x').property('value');
        d3.selectAll('#ovr-legend .item')
            .classed('is-active', d => d.key === current)
            .select('.swatch')
            .style('outline-width', function(d){ return (d.key === current) ? '2px' : '1px'; });
    }

    // Tooltip
    function showTip(ev, d, xKey){
        const html = `<b>${d.province}</b> - ${d.year}<br>${xLabel.text()}: <b>${fmt1(d[xKey])}</b><br>Rice Production: <b>${fmt(d.production)}</b>`;
        const pad = 12,
              shift=14;

        tip.html(html).classed('hidden', false) // hide
            .style('visibility','hidden')
            .style('left','-9999px')
            .style('top','-9999px');

        const r = tip.node().getBoundingClientRect();

        let left = ev.clientX + shift, top = ev.clientY + shift;

        if(left + r.width + pad > innerWidth)
            left = ev.clientX - r.width - shift;
        if(top  + r.height + pad > innerHeight)
            top  = ev.clientY - r.height - shift;

        left = Math.max(pad, Math.min(left, innerWidth  - r.width  - pad));
        top  = Math.max(pad, Math.min(top,  innerHeight - r.height - pad));

        tip.style('left', left+'px')
            .style('top', top+'px')
            .style('visibility','visible');
    }

    // Hide tooltip
    function hideTooltip(){ 
        tip.classed('hidden', true);
    }

    updateLabels();
    updateTooltip();
    renderLegend();

    // Trend line chart
    // Calculate national averages by year
    function calculateNationalTrend(indicator) {
        const yearlyData = [];
        for (let year = 2019; year <= 2024; year++) {
            const yearRows = rows.filter(d => d.year === year);
            if (yearRows.length > 0) {  // Only add if data exists
                const avg = d3.mean(yearRows, d => d[indicator]);
                yearlyData.push({ year, value: avg });
            }
        }
        return yearlyData;
    }

    // Setup trend line chart
    const trendSvg = d3.select('#trend-line-chart');
    const trendMargin = {top: 20, right: 30, bottom: 40, left: 60};
    const trendContainer = document.querySelector('.trend-chart-container');
    const trendWidth = (trendContainer ? trendContainer.clientWidth : 900) - trendMargin.left - trendMargin.right;
    const trendHeight = 200 - trendMargin.top - trendMargin.bottom;

    trendSvg.attr('height', 200);

    const trendG = trendSvg.append('g')
        .attr('transform', `translate(${trendMargin.left},${trendMargin.top})`);

    // Scales for trend chart
    const trendX = d3.scaleLinear()
        .domain([years[0], years[1]])
        .range([0, trendWidth]);

    const trendY = d3.scaleLinear()
        .range([trendHeight, 0]);

    // Axes
    const trendXAxis = trendG.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${trendHeight})`);

    const trendYAxis = trendG.append('g')
        .attr('class', 'axis');

    // Line generator
    const line = d3.line()
        .x(d => trendX(d.year))
        .y(d => trendY(d.value))
        .curve(d3.curveMonotoneX);

    // Line path
    const linePath = trendG.append('path')
        .attr('class', 'trend-line')
        .attr('fill', 'none')
        .attr('stroke-width', 3);

    // Dots for each year
    const dotsGroup = trendG.append('g').attr('class', 'trend-dots');

    // Y-axis label
    const trendYLabel = trendG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -trendMargin.left + 9)
        .attr('x', -trendHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#525252')
        .attr('font-size', '12px')
        .attr('font-weight', '600');

    // X-axis label
    const trendXLabel = trendG.append('text')
        .attr('x', trendWidth / 2)
        .attr('y', trendHeight + trendMargin.bottom - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#525252')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text('Year');
    
    // Update trend chart
    function updateTrendChart() {
        const indicator = xSelection.node().value;
        const trendData = calculateNationalTrend(indicator);
        const trendColor = getIndicatorColor(indicator);

        // Update Y scale
        const yExtent = d3.extent(trendData, d => d.value);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        trendY.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);

        // Update axes
        trendXAxis.call(d3.axisBottom(trendX).ticks(6).tickFormat(d3.format('d')));
        trendYAxis.transition().duration(500)
            .call(d3.axisLeft(trendY).ticks(5).tickFormat(d => {
                if (indicator === 'temperature') return d.toFixed(1) + '°C';
                if (indicator === 'rainfall') return d3.format('.0f')(d) + 'mm';
                if (indicator === 'humidity') return d.toFixed(1) + '%';
            }));

        // Update Y-axis label
        const labels = {
            temperature: 'Temperature (°C)',
            rainfall: 'Rainfall (mm)',
            humidity: 'Humidity (%)'
        };
        trendYLabel.text(labels[indicator]);

        // Update line
        linePath.datum(trendData)
            .transition()
            .duration(500)
            .attr('stroke', trendColor)
            .attr('stroke-width', 2)
            .attr('d', line);

        // Tooltip for trend dots
        const trendTooltip = d3.select('body').selectAll('.trend-tooltip')
            .data([null])
            .join('div')
            .attr('class', 'trend-tooltip')
            .style('position', 'fixed')
            .style('background', 'rgba(0, 0, 0, 0.85)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '10000')
            .style('display', 'none')
            .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');

        // Update dots with hover
        const dots = dotsGroup.selectAll('circle')
            .data(trendData);

        const allDots = dots.enter()
            .append('circle')
            .attr('r', 0)
            .attr('cx', d => trendX(d.year))
            .attr('cy', d => trendY(d.value))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .merge(dots)
            .attr('fill', trendColor)
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 7)
                    .attr('stroke-width', 3);

                const formatValue = (val) => {
                    if (indicator === 'temperature') return val.toFixed(1) + '°C';
                    if (indicator === 'rainfall') return d3.format(',.0f')(val) + ' mm';
                    if (indicator === 'humidity') return val.toFixed(1) + '%';
                    return val.toFixed(1);
                };

                trendTooltip
                    .style('display', 'block')
                    .html(`<strong>Year ${d.year}</strong><br/>
                           National Avg: ${formatValue(d.value)}`)
                    .style('left', (event.clientX + 15) + 'px')
                    .style('top', (event.clientY - 10) + 'px');
            })
            .on('mousemove', function(event) {
                trendTooltip
                    .style('left', (event.clientX + 15) + 'px')
                    .style('top', (event.clientY - 10) + 'px');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 5)
                    .attr('stroke-width', 2);

                trendTooltip.style('display', 'none');
            });

        allDots.transition()
            .duration(500)
            .attr('cx', d => trendX(d.year))
            .attr('cy', d => trendY(d.value))
            .attr('r', 5)
            .attr('fill', trendColor);

        dots.exit()
            .transition()
            .duration(300)
            .attr('r', 0)
            .remove();
    }

    // Initial render
    updateTrendChart();

})();