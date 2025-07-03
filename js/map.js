class WorldMap {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight * 1;
        this.projection = d3.geoEquirectangular()
            .scale((this.width / 640) * 100)
            .translate([this.width / 2, this.height / 2]);
        
        this.svg = d3.select('#world-map')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        this.g = this.svg.append('g');
        
        this.path = d3.geoPath().projection(this.projection);
        this.dayNightPath = this.svg.append('path')
            .attr('class', 'day-night-terminator')
            .style('fill', 'rgba(0, 0, 0, 0.3)');
            
        this.loadMap();
        this.setupResizeHandler();
    }

    async loadMap() {
        try {
            const response = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
            const world = await response.json();
            
            this.g.selectAll('path')
                .data(topojson.feature(world, world.objects.countries).features)
                .enter()
                .append('path')
                .attr('d', this.path)
                .style('fill', '#2c2c2e')
                .style('stroke', '#2c2c2e')
                .style('stroke-width', '0.5px');
                
            this.updateDayNightTerminator();
            setInterval(() => this.updateDayNightTerminator(), 60000);
        } catch (error) {
            console.error('Error loading map:', error);
        }
    }

    updateDayNightTerminator() {
        const now = new Date();
        const lat = [];
        const lon = [];
        
        // Calculate terminator points
        for (let i = 0; i <= 360; i++) {
            const p = this.calculateTerminator(now, i);
            lat.push(p[0]);
            lon.push(p[1]);
        }
        
        // Create the night area polygon (no reverse, correct day/night)
        const coordinates = [];
        for (let i = 0; i < lat.length; i++) {
            coordinates.push([lon[i], lat[i]]);
        }
        
        // Close the polygon
        coordinates.push([180, 90]);
        coordinates.push([180, -90]);
        coordinates.push([-180, -90]);
        coordinates.push([-180, 90]);
        coordinates.push([coordinates[0][0], coordinates[0][1]]);
        
        const nightPolygon = { type: 'Polygon', coordinates: [coordinates] };
        this.dayNightPath.attr('d', this.path(nightPolygon));
    }

    calculateTerminator(date, longitude) {
        // Accurate astronomical calculation for the day/night terminator
        const RAD = Math.PI / 180;
        const DEG = 180 / Math.PI;

        // Number of days since J2000.0
        const julian = (date.getTime() / 86400000) + 2440587.5;
        const n = julian - 2451545.0;

        // Mean longitude of the sun
        const L = (280.46 + 0.9856474 * n) % 360;
        // Mean anomaly of the sun
        const g = (357.528 + 0.9856003 * n) % 360;
        // Ecliptic longitude of the sun
        const lambda = (L + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD)) % 360;
        // Obliquity of the ecliptic
        const epsilon = 23.439 - 0.0000004 * n;
        // Declination of the sun
        const delta = Math.asin(Math.sin(epsilon * RAD) * Math.sin(lambda * RAD));

        // Calculate the current time in fractional hours UTC
        const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        // Calculate the hour angle for this longitude
        const H = ((utcHours - 12) * 15 + longitude) * RAD;

        // Latitude of the terminator at this longitude
        const lat = Math.atan(-Math.cos(H) / Math.tan(delta)) * DEG;
        return [lat, longitude];
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight * 1;
            this.projection
                .scale((this.width / 640) * 100)
                .translate([this.width / 2, this.height / 2]);
            this.svg
                .attr('width', this.width)
                .attr('height', this.height);
            this.g.selectAll('path')
                .attr('d', this.path);
            this.updateDayNightTerminator();
        });
    }

    addCityMarker(city) {
        const coords = this.projection([city.lon, city.lat]);
        if (!coords) return;

        // Marker dot
        const marker = document.createElement('div');
        marker.className = 'city-marker';
        marker.style.left = `${coords[0]}px`;
        marker.style.top = `${coords[1]}px`;
        marker.title = city.name;

        // Label with name and time
        const label = document.createElement('div');
        label.className = 'city-marker-label';
        label.innerHTML = `<div class="city-marker-name">${city.name}</div><div class="city-marker-time" data-tz="${city.timezone}"></div>`;
        let labelLeft = coords[0] + 12;
        let labelTop = coords[1] - 8;

        // Improved collision avoidance: nudge both labels if overlapping
        const existingLabels = document.querySelectorAll('.city-marker-label');
        let tries = 0;
        let lastOverlapping = null;
        while (tries < 5) {
            let overlap = false;
            existingLabels.forEach(el => {
                const rect1 = {x: labelLeft, y: labelTop, w: 80, h: 32};
                const elLeft = parseFloat(el.style.left);
                const elTop = parseFloat(el.style.top);
                if (
                    Math.abs(labelLeft - elLeft) < rect1.w &&
                    Math.abs(labelTop - elTop) < rect1.h
                ) {
                    overlap = true;
                    lastOverlapping = el;
                }
            });
            if (!overlap) break;
            // Move both labels apart
            labelTop += 18;
            if (lastOverlapping) {
                lastOverlapping.style.top = `${parseFloat(lastOverlapping.style.top) - 18}px`;
            }
            tries++;
        }
        label.style.left = `${labelLeft}px`;
        label.style.top = `${labelTop}px`;

        document.getElementById('city-markers').appendChild(marker);
        document.getElementById('city-markers').appendChild(label);
    }

    updateCityMarkerTimes() {
        const now = new Date();
        document.querySelectorAll('.city-marker-time').forEach(el => {
            const tz = el.getAttribute('data-tz');
            if (tz) {
                const cityTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
                el.textContent = cityTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        });
    }

    clearCityMarkers() {
        document.getElementById('city-markers').innerHTML = '';
    }
}

// Update city marker times every minute
setInterval(() => {
    if (window.worldClock && window.worldClock.map) {
        window.worldClock.map.updateCityMarkerTimes();
    }
}, 60000);

// Initial update on load
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.worldClock && window.worldClock.map) {
            window.worldClock.map.updateCityMarkerTimes();
        }
    }, 500);
});
