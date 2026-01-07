// Global variables
let svg, width, height;
let root, gBack, gMap, gUI;
let projection, path, colorScale, zoom;
let mapData, provinceData;
let currentYear = 2019;
let currentMetric = 'climate';
let currentClimateVar = 'temperature';
let currentProductivityVar = 'productivity';

// Initialize map
async function initMap() {
    try {
        console.log('Loading map data...');
        
        // Load GeoJSON and data
        const geoData = indonesiaMapData;
        
        mapData = geoData;
        provinceData = combinedData.provinces;
        
        console.log('Data loaded!', provinceData);
        
        // Setup SVG
        setupSVG();
        
        // Setup projection
        setupProjection();
        
        // Draw map
        drawMap();

        // fit to Indonesia
        fitToBounds();
        
        // Setup legend
        setupLegend();
        
        updateMap();
        
        console.log('Map initialized!');
        
    } catch (error) {
        console.error('Error loading map:', error);
    }
}

// Setup SVG container
function setupSVG() {
    const mapContainer = d3.select('#map');

    mapContainer
      .on('pointerleave', hideTooltip)
      .on('pointerout', (e) => {
        const tooltip = e.relatedTarget;
        if (!tooltip || !mapContainer.node().contains(tooltip)) hideTooltip();
      })
      .on('wheel', hideTooltip)
      .on('pointerdown', hideTooltip);

    // Get parent size - improved calculation for dynamic sizing
    const panel = mapContainer.node().closest('.map-panel') || mapContainer.node().parentElement;
    
    let w = panel ? panel.clientWidth - 48 : 900;
    w = Math.max(w, 600);

    const aspect = 0.42;
    let h = Math.max(w * aspect, 320);

    // Ensure the size
    width = w;
    height = h;
    
    svg = mapContainer
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', width)
      .attr('height', height);

  const defs = svg.append('defs');
  defs.append('clipPath')
      .attr('id', 'map-clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height);

    // Map layer
    root = svg.append('g').attr('class','map-root');
    gBack = root.append('g').attr('class','back-layer'); // ocean
    gMap  = root.append('g').attr('class','map-layer'); // zoomable province
    gUI   = root.append('g').attr('class','ui-layer'); // legend cannot be zoom

    // Map zoom
    zoom = d3.zoom()
      .scaleExtent([1, 6])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on('zoom', (ev) => {
        gMap.attr('transform', ev.transform);
        hideTooltip && hideTooltip();
      });

    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
    gMap.attr('clip-path', 'url(#map-clip)');
}


// Setup map projection
function setupProjection() {    
    // Mercator projection centered on Indonesia
    projection = d3.geoMercator()
        .center([118, -2])  // center of Indonesia
        .scale(width * 1.0)  // Increased scale for better fill
        .translate([width / 2, height / 2]);
    
    path = d3.geoPath().projection(projection);
}

// Calculate min max domain for active year and indicator
function getActiveDomain(){
  const values = [];
  provinceData.forEach(p => {
    const year = p.data.find(d => d.year === currentYear);
    if(!year) return;
    const value = (currentMetric === 'climate')
      ? year[currentClimateVar]
      : year[currentProductivityVar];
    if (value != null && isFinite(+value)) values.push(+value);
  });
  if (!values.length) return [0, 1];
  const [min, max] = d3.extent(values);
  const padding = (max - min) * 0.05;
  return [min - padding, max + padding];
}

// Setup color scale using interpolation color
function makeColorScale(){
  const [min, max] = getActiveDomain();
  let interp;
  if (currentMetric === 'climate'){
    if (currentClimateVar === 'temperature'){ //temperature
      // low=blue, high=red
      interp = t => d3.interpolateRdYlBu(1 - t); // rainfall
    } else if (currentClimateVar === 'rainfall'){
      // Use darker blues to avoid blending with ocean
      interp = t => d3.interpolateBlues(0.3 + t * 0.7); // Start from 30% instead of 0%
    } else { // humidity
      // Use purple/magenta scheme - distinctly different from rainfall
      interp = t => d3.interpolatePurples(0.3 + t * 0.7); // Purple scheme
    }
  } else {
    if (currentProductivityVar === 'productivity'){
      // Use darker green range - start from 40% instead of 0% to avoid very light colors
      interp = t => d3.interpolateYlGn(0.4 + t * 0.6);
    } else if (currentProductivityVar === 'yieldArea'){
      interp = d3.interpolateViridis;
    } else { // production
      // Use darker orange/brown range to be more visible
      interp = t => d3.interpolateYlOrBr(0.3 + t * 0.7); // Start from 30%
    }
  }

  return d3.scaleSequential(interp).domain([min, max]);
}

// Draw the map
function drawMap() {
    console.log('Drawing map...');
    
    const features = mapData.features;

    // Ocean (background)
    gBack.selectAll(".ocean")
        .data([null])
        .join("rect")
        .attr("class", "ocean")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height);

    console.log('Features:', features);

    // Color scale for choropleth
    colorScale = makeColorScale();

    // Draw provinces on map
    gMap.selectAll('.province')
        .data(mapData.features, d => d.properties.province || d.properties.name)
        .join('path')
        .attr('class','province')
        .attr('d', path)
        .attr('fill', d => getProvinceColor(d))
        .on('pointerenter', onPointerHover)
        .on('pointermove',  onPointerMove)
        .on('pointerleave', onPointerLeave)
        .on('click', (e,d) => { hideTooltip(); showProvincePopup((d.properties.province||d.properties.name)); });

    console.log('Map drawn!');

    updateLegend();
}

// fit the map to Indonesia
function fitToBounds(){
  const b = path.bounds({type:'FeatureCollection', features: mapData.features});
  const dx = b[1][0] - b[0][0];
  const dy = b[1][1] - b[0][1];
  const cx = (b[0][0] + b[1][0]) / 2;
  const cy = (b[0][1] + b[1][1]) / 2;
  const k  = Math.min( width  / dx,  height / dy) * 0.92;  // Maximum fit - use more space
  // Center the map properly
  const transform = d3.zoomIdentity.translate(width/2, height/2).scale(k).translate(-cx, -cy);
  svg.transition()
    .duration(600)
    .call(zoom.transform, transform);
}

// when the province button clicked
function focusProvince(provinceName) {
    if (!mapData || !svg || !zoom) return;

    // find the provice
    const feature = mapData.features.find(f => {
        const name = (f.properties.province || f.properties.name || '').toLowerCase();
        return name === provinceName.toLowerCase();
    });

    if (!feature) return;

    const [[x0, y0], [x1, y1]] = path.bounds(feature);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    // scale the zoom
    const scale = Math.min(width / dx, height / dy) * 0.9;

    const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-cx, -cy);

    // scroll to map panel
    const mapPanel = document.querySelector('.map-panel');
    if (mapPanel) {
        mapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // apply zoom using animation
    svg.transition()
        .duration(700)
        .call(zoom.transform, transform);

    // highlight the province
    const isSelected = d =>
      (d.properties.province || d.properties.name || '').toLowerCase() === provinceName.toLowerCase();

    const provinces = gMap.selectAll('.province')
      .classed('focus-province', d => isSelected(d));

    provinces.filter(d => isSelected(d)).raise();

    setTimeout(() => {
        gMap.selectAll('.province').classed('focus-province', false);
    }, 1200);
}


// Get color for province based on current metric
function getProvinceColor(feature) {
    const provinceName = feature.properties.province || feature.properties.name;
    const yearData = getProvinceData(provinceName, currentYear);
    
    if (!yearData) {
        return '#e0e0e0'; // Grey for no data
    }

    // Get value based on current metric
    const value = (currentMetric === 'climate')
      ? yearData[currentClimateVar]
      : yearData[currentProductivityVar];

    return (value == null) ? '#e0e0e0' : colorScale(value);
}

// Get province data by name and year
function getProvinceData(provinceName, year) {
    const province = provinceData.find(p => p.name === provinceName);
    
    if (!province) {
        // console.warn('Province not found in data:', provinceName);
        return null;  // Return early!
    }
    
    const yearData = province.data.find(d => d.year === year);
    
    if (!yearData) {
        // console.warn('Year data not found:', provinceName, year);
        return null;
    }
    
    return yearData;
}

// Update map (when year/metric changes)
function updateMap() {
    if(!(sticky_on_scroll && activeTip.visible && activeTip.feature)){
        hideTooltip();
    }

    colorScale = makeColorScale();

    gMap.selectAll('.province')
        .transition()
        .duration(800)
        .attr('fill', d => getProvinceColor(d));
    
    updateLegend();
}

// Make updateMap accessible globally
window.updateMap = updateMap;

window.addEventListener('resize', () => {
  if (!mapData) return;
  d3.select('#map').selectAll('*').remove();
  setupSVG();
  setupProjection();
  drawMap();
  fitToBounds();
  updateLegend();
});

// Tooltip
// Global tooltip helpers
function getTooltip(){
    let tooltip = d3.select('#tooltip');
    if (tooltip.empty()){
        tooltip = d3.select('body')
                    .append('div')
                    .attr('id','tooltip')
                    .attr('class','tooltip hidden');
    }
    return tooltip
}

// Hide tooltip
function hideTooltip(){
    getTooltip().classed('hidden', true).html('');
}

// Tooltip content
function buildTooltipHTML(feature){
  const provinceName = feature.properties.province || feature.properties.name;
  const data = getProvinceData(provinceName, currentYear);
  if (!data) return `<b>${provinceName} (${currentYear})</b><br/>No data`;

  if (currentMetric === 'climate'){
    return `
      <div style="font-weight:700;margin-bottom:4px">${provinceName} (${currentYear})</div>
      <div>Temperature: ${(+data.temperature).toFixed(1)}°C</div>
      <div>Rainfall: ${(+data.rainfall).toFixed(0)} mm</div>
      <div>Humidity: ${(+data.humidity).toFixed(1)}%</div>
    `;
  } else {
    if (currentProductivityVar === 'production'){
      return `
        <div style="font-weight:700;margin-bottom:4px">${provinceName} (${currentYear})</div>
        <div>Production: ${(+data.production/1_000_000).toFixed(2)} M tons</div>
      `;
    } else if (currentProductivityVar === 'yieldArea'){
      return `
        <div style="font-weight:700;margin-bottom:4px">${provinceName} (${currentYear})</div>
        <div>Yield Area: ${(+data.yieldArea).toFixed(0)}</div>
      `;
    } else {
      return `
        <div style="font-weight:700;margin-bottom:4px">${provinceName} (${currentYear})</div>
        <div>Productivity: ${(+data.productivity).toFixed(1)} ton/ha</div>
      `;
    }
  }
}

// Pointer handler hover
function onPointerHover(event, feature){
    const cell = d3.select(this);
    cell.attr('_prev_stroke', cell.attr('stroke') || null)
        .raise() 
        .attr('_prev_stroke_width', cell.attr('stroke-width') || null)
        .attr('stroke', '#333').attr('stroke-width', 0.5);

    activeTip.feature = feature;
    activeTip.x = event.clientX;
    activeTip.y = event.clientY;
    activeTip.visible = true;

    const tooltip = getTooltip();
    tooltip.html(buildTooltipHTML(feature))
        .classed('hidden', false)
        .style('left', event.clientX + 'px')  // clientX/Y for fixed position
        .style('top',  event.clientY + 'px');
}

// Pointer move
function onPointerMove(event, feature){
    activeTip.feature = feature;
    activeTip.x = event.clientX;
    activeTip.y = event.clientY;
    activeTip.visible = true;

    getTooltip()
        .style('left', event.clientX + 'px')
        .style('top',  event.clientY + 'px');
}

// Pointer leave
function onPointerLeave(event, feature){
    const cell = d3.select(this);
    const prevStroke = cell.attr('_prev_stroke');
    const prevWidth  = cell.attr('_prev_stroke_width');

    if (prevStroke === null) cell.attr('stroke', null);
        else cell.attr('stroke', prevStroke);

    if (prevWidth  === null) cell.attr('stroke-width', null);
        else cell.attr('stroke-width', prevWidth);

    activeTip.feature = null;
    activeTip.visible = false;
    hideTooltip();
}

// when the user scroll too much out of the viewport
function mapInViewport(threshold = 20) {
  const el = document.getElementById('map');
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;

  const visible = r.bottom > threshold && r.top < (vh - threshold);
  return visible;
}

// Sticky tooltip -> tooltip will be updated once user scroll
let sticky_on_scroll = true;
let activeTip = {
    feature: null,
    x: 0,
    y: 0,
    visible: false
};

// When the pointer out of the map -> hide tooltip
window.addEventListener('pointermove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.closest('#map')) hideTooltip();
}, { passive: true });


// Active domain
function getCurrentDomain(){
  if (currentMetric === 'climate'){
    if (currentClimateVar === 'temperature') return [30, 24];
    if (currentClimateVar === 'rainfall')    return [1000, 4500];
    if (currentClimateVar === 'humidity')    return [70, 85];
  } else {
    if (currentProductivityVar === 'productivity') return [45, 58];
    if (currentProductivityVar === 'yieldArea')    return [100000, 2000000];
    if (currentProductivityVar === 'production')   return [1000000, 10000000];
  }
  return [0,1];
}

// Setup legend
function setupLegend() {
    const legend = d3.select('.legend').html(''); // Clear previous
    
    console.log('Legend element:', d3.select('.legend').node());

    const width = 280;  // Smaller width for left position
    const height = 85;
    const padding = 15;
     
    const svg = legend.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display','block');
    
    // Create gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'legend-gradient');

    const [d0, d1] = colorScale.domain();
    const stops = d3.range(0, 1.0001, 0.1).map(t => ({
        offset: `${t*100}%`,
        color: colorScale(d0 + t*(d1-d0))
    }));

    gradient.selectAll('stop')
        .data(stops)
        .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

    // Bar gradient
    const barX = 20,
        barY = 18,
        barW = width - 40,
        barH = 14;
    svg.append("rect")
        .attr("x", barX)
        .attr("y", barY)
        .attr("width", barW)
        .attr("height", barH)
        .attr("rx", 4)
        .style("fill", "url(#legend-gradient)");

    const fmtX = (()=>{
        if (currentMetric === 'climate'){
        if (currentClimateVar === 'temperature') return d3.format(".1f"); // temperature
        if (currentClimateVar === 'humidity') return d3.format(".1f"); // humidity
        return d3.format(",.0f"); // rainfall
        } else {
        if (currentProductivityVar === 'productivity') return d3.format(".1f");
        if (currentProductivityVar === 'yieldArea') return d3.format(",.0f");
        return d3.format(".2s"); // production
        }
    })();

    const x = d3.scaleLinear().domain([d0, d1]).range([padding, width - padding]);
    svg.append('g')
        .attr('transform', 'translate(0, 42)')
        .call(d3.axisBottom(x).ticks(3).tickFormat(fmtX))
        .style('font-size', '11px')
        .call(g => g.select(".domain").remove());

    // label low/high
    svg
      .append("text")
      .attr("x", padding)
      .attr("y", 12)
      .attr("fill", "#555")
      .attr("font-weight", 600)
      .style("font-size", 12)
      .text("Low");

    svg
      .append("text")
      .attr("x", width - padding)
      .attr("y", 12)
      .attr("text-anchor", "end")
      .attr("fill", "#555")
      .attr("font-weight", 600)
      .style("font-size", 12)
      .text("High");

    // legend label
    let label = '';
    if (currentMetric === 'climate'){
        label = (currentClimateVar === 'temperature') ? 'Temperature (°C)'
            : (currentClimateVar === 'rainfall')    ? 'Rainfall (mm)'
            : 'Humidity (%)';
    } else {
        label = (currentProductivityVar === 'productivity') ? 'Productivity (t/ha)'
            : (currentProductivityVar === 'yieldArea')     ? 'Yield Area (ha)'
            : 'Production (tons)';
    }
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 72)
      .attr("text-anchor", "middle")
      .attr("fill", "#555")
      .attr("font-size", 12)
      .attr("font-weight", "700")
      .text(label);
}

function updateLegend() {
    d3.select('.legend').selectAll('*').remove();
    setupLegend();
}

initMap().then(() => {
    // click badge then get to the selected province
    document.querySelectorAll('.province-badge').forEach(btn => {
        const name = btn.textContent.trim();
        btn.addEventListener('click', () => {
            focusProvince(name);
        });
    });
});