// City data with timezone information
// Expose cities both as a module export and global variable
window.cities = [
  // North America
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, timezone: "America/New_York" },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, timezone: "America/Los_Angeles" },
  { name: "Chicago", country: "USA", lat: 41.8781, lng: -87.6298, timezone: "America/Chicago" },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, timezone: "America/Toronto" },
  { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, timezone: "America/Vancouver" },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, timezone: "America/Mexico_City" },
  
  // South America
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, timezone: "America/Sao_Paulo" },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, timezone: "America/Argentina/Buenos_Aires" },
  { name: "Santiago", country: "Chile", lat: -33.4489, lng: -70.6693, timezone: "America/Santiago" },
  { name: "Lima", country: "Peru", lat: -12.0464, lng: -77.0428, timezone: "America/Lima" },
  
  // Europe
  { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, timezone: "Europe/London" },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, timezone: "Europe/Paris" },
  { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, timezone: "Europe/Berlin" },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, timezone: "Europe/Rome" },
  { name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, timezone: "Europe/Madrid" },
  { name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, timezone: "Europe/Moscow" },
  
  // Asia
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, timezone: "Asia/Tokyo" },
  { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, timezone: "Asia/Shanghai" },
  { name: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694, timezone: "Asia/Hong_Kong" },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, timezone: "Asia/Singapore" },
  { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777, timezone: "Asia/Kolkata" },
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, timezone: "Asia/Dubai" },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780, timezone: "Asia/Seoul" },
  
  // Oceania
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, timezone: "Australia/Sydney" },
  { name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, timezone: "Australia/Melbourne" },
  { name: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633, timezone: "Pacific/Auckland" },
  
  // Africa
  { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, timezone: "Africa/Cairo" },
  { name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473, timezone: "Africa/Johannesburg" },
  { name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219, timezone: "Africa/Nairobi" },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, timezone: "Africa/Lagos" }
];

// Make cities accessible even if using "const cities" directly
const cities = window.cities;

// Debug function to verify that cities data is available
// Call this from the console if you're having issues
window.debugCities = function() {
  if (typeof window.cities !== 'undefined' && Array.isArray(window.cities)) {
    console.log(`✅ Cities data available with ${window.cities.length} cities`);
    console.log("Sample cities:");
    console.log(window.cities.slice(0, 3));
    return true;
  } else {
    console.error("❌ Cities data is NOT available. Check that data.js is properly loaded.");
    return false;
  }
}

// Auto-execute debug function when the script loads
console.log("Cities data loading...");
setTimeout(() => {
  window.debugCities(); 
}, 100); 