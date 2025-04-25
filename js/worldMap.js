// World map configuration
let projection;
let path;
let svg;
let g;
let zoom;

// Initialize world map with D3.js
function initWorldMap() {
  console.log("Initializing world map...");
  const mapContainer = document.getElementById('world-map');
  
  if (!mapContainer) {
    console.error("Map container element not found");
    return;
  }
  
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  
  console.log(`Map container dimensions: ${width}x${height}`);
  
  // Check if container has valid dimensions
  if (width <= 0 || height <= 0) {
    console.error(`Invalid map container dimensions: ${width}x${height}`);
    // Force a minimum size for the container
    mapContainer.style.width = '100%';
    mapContainer.style.height = '500px';
    setTimeout(initWorldMap, 100); // Retry initialization
    return;
  }
  
  // Define projection - using Mercator for simplicity
  projection = d3.geoMercator()
    .scale((width - 3) / (2 * Math.PI))
    .translate([width / 2, height / 2]);
  
  path = d3.geoPath()
    .projection(projection);
  
  // Create SVG element
  svg = d3.select('#world-map')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet');
    
  // Add zoom behavior
  zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [width, height]])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
      updatePinPositions();
    });
    
  svg.call(zoom);
  
  // Add group for map elements
  g = svg.append('g');
  
  // Load world map data with error handling
  console.log("Loading world map data...");
  d3.json('lib/countries-110m.json')
    .then(data => {
      console.log("Map data loaded successfully");
      // Check if data has the expected structure
      if (!data || !data.objects || !data.objects.countries) {
        console.error("Invalid map data structure:", data);
        return;
      }
      
      // Convert TopoJSON to GeoJSON
      try {
        const countries = topojson.feature(data, data.objects.countries);
        console.log(`${countries.features.length} countries loaded`);
        
        // Draw countries
        g.selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('class', 'country')
          .attr('fill', '#e2e8f0')
          .attr('stroke', '#cbd5e0')
          .attr('stroke-width', 0.5);
          
        // Initial update of day/night curve
        if (typeof updateDayNightCurve === 'function') {
          updateDayNightCurve();
        } else {
          console.warn("updateDayNightCurve function not available yet");
        }
        
        // Set flag to indicate map is initialized
        window.mapInitialized = true;
        console.log("World map fully initialized");
      } catch (error) {
        console.error("Error processing map data:", error);
      }
    })
    .catch(error => {
      console.error("Failed to load map data:", error);
    });
    
  // Handle window resize
  window.addEventListener('resize', debounce(() => {
    console.log("Resizing map...");
    const newWidth = document.getElementById('world-map').clientWidth;
    const newHeight = document.getElementById('world-map').clientHeight;
    
    projection
      .scale((newWidth - 3) / (2 * Math.PI))
      .translate([newWidth / 2, newHeight / 2]);
      
    // Update paths
    svg.attr('viewBox', [0, 0, newWidth, newHeight]);
    g.selectAll('path').attr('d', path);
    
    // Update day/night curve and pins
    if (typeof updateDayNightCurve === 'function') {
      updateDayNightCurve();
    }
    updatePinPositions();
  }, 200));
}

// Get pixel coordinates from latitude and longitude
function getCoordinates(lat, lng) {
  if (!projection) {
    console.error("Projection not initialized when getCoordinates was called");
    return [0, 0];
  }
  
  const pixelCoords = projection([lng, lat]);
  return pixelCoords ? pixelCoords : [0, 0];
}

// Update pin positions when map is zoomed or panned
function updatePinPositions() {
  const pins = document.querySelectorAll('.pin');
  pins.forEach(pin => {
    const lat = parseFloat(pin.dataset.lat);
    const lng = parseFloat(pin.dataset.lng);
    const [x, y] = getCoordinates(lat, lng);
    
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
  });
} 