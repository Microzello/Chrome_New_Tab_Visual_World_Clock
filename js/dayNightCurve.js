// Solar calculations
// Based on NOAA calculations: https://www.esrl.noaa.gov/gmd/grad/solcalc/

// Day/night curve container
let dayNightSvg;
let dayNightPath;

// Initialize day/night curve
function initDayNightCurve() {
  console.log("Initializing day/night curve...");
  const container = document.getElementById('day-night-curve');
  
  if (!container) {
    console.error("Day-night curve container not found");
    return;
  }
  
  dayNightSvg = d3.select('#day-night-curve')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0)
    .style('pointer-events', 'none');
    
  // Path for night side
  dayNightPath = dayNightSvg.append('path')
    .attr('fill', 'rgba(0, 0, 0, 0.3)') // Semi-transparent black for night
    .attr('stroke', 'rgba(0, 0, 0, 0.1)')
    .attr('stroke-width', 0.5);
    
  console.log("Day/night curve initialized");
}

// Update day/night curve based on current time
function updateDayNightCurve() {
  if (!projection || !dayNightPath) {
    console.error("Cannot update day/night curve: projection or path not initialized");
    return;
  }
  
  try {
    const now = new Date();
    console.log("Updating day/night curve for time:", now.toISOString());
    
    // Calculate sun's position
    const sunPosition = calculateSunPosition(now);
    console.log("Sun position:", sunPosition);
    
    // Create a path for the night side of Earth
    const pathData = createNightPath(sunPosition);
    dayNightPath.attr('d', pathData);
    
    console.log("Day/night curve updated");
  } catch (error) {
    console.error("Error updating day/night curve:", error);
  }
}

// Calculate sun's position (declination and right ascension)
function calculateSunPosition(date) {
  // Days since J2000.0 epoch
  const julianDate = getJulianDate(date);
  const jd = julianDate - 2451545.0;
  
  // Orbital elements of the Sun
  const L = (280.460 + 0.9856474 * jd) % 360; // mean longitude
  const g = (357.528 + 0.9856003 * jd) % 360; // mean anomaly
  
  // Ecliptic longitude
  const eclipticLongitude = L + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180);
  
  // Obliquity of the ecliptic
  const obliquity = 23.439 - 0.0000004 * jd;
  
  // Sun's declination and right ascension
  const declination = Math.asin(Math.sin(obliquity * Math.PI / 180) * Math.sin(eclipticLongitude * Math.PI / 180)) * 180 / Math.PI;
  const rightAscension = Math.atan2(
    Math.cos(obliquity * Math.PI / 180) * Math.sin(eclipticLongitude * Math.PI / 180),
    Math.cos(eclipticLongitude * Math.PI / 180)
  ) * 180 / Math.PI;
  
  // Hour angle calculation
  // Greenwich Mean Sidereal Time
  const gmst = getGMST(date);
  
  // Convert right ascension to hour angle
  // The subsolar point is where the sun is directly overhead
  // This is at longitude = hour angle in degrees
  const hourAngle = gmst - rightAscension;
  
  // Subsolar point (the point where the sun is directly overhead)
  const subsolarPoint = {
    lat: declination,
    lng: hourAngle
  };
  
  return {
    declination,
    hourAngle,
    subsolarPoint
  };
}

// Get Julian date from JavaScript date
function getJulianDate(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  
  let jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4)
    + Math.floor(275 * month / 9) + day + 1721013.5
    + ((hour + minute / 60 + second / 3600) / 24);
  
  return jd;
}

// Calculate Greenwich Mean Sidereal Time (in degrees)
function getGMST(date) {
  const jd = getJulianDate(date);
  const jd0 = Math.floor(jd - 0.5) + 0.5; // Julian date at 0h UTC
  const T = (jd0 - 2451545.0) / 36525.0; // Julian centuries since J2000.0
  const ut = (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) * 1.002737909; // UT in hours, converted to sidereal time
  
  // GMST at 0h UT
  let gmst = 100.46061837 + 36000.770053608 * T + 0.000387933 * T * T - (T * T * T) / 38710000.0;
  
  // Add UT contribution
  gmst = (gmst + 15.0 * ut) % 360;
  if (gmst < 0) gmst += 360;
  
  return gmst;
}

// Create path data for the night hemisphere
function createNightPath(sunPosition) {
  try {
    const container = document.getElementById('day-night-curve');
    if (!container) {
      console.error("Day-night curve container not found");
      return "";
    }
    
    // The antisolar point - where the sun is directly underneath (night center)
    const antisolarLat = -sunPosition.declination;
    const antisolarLng = (sunPosition.hourAngle + 180) % 360;
    
    console.log("Antisolar point (night center):", { lat: antisolarLat, lng: antisolarLng });
    
    // Create a great circle path centered at the antisolar point
    // All points 90 degrees from the antisolar point form the terminator
    
    // Get width and height of the container
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create a d3 geo path generator
    const path = d3.geoPath().projection(projection);
    
    // Create a circle centered at the antisolar point with a 90-degree radius
    // This covers the night side of Earth
    const nightSide = d3.geoCircle()
      .center([antisolarLng, antisolarLat])
      .radius(90)();
      
    // Convert the GeoJSON object to a path
    return path(nightSide);
  } catch (error) {
    console.error("Error creating night path:", error);
    return "";
  }
} 