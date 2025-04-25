// Timezone management
let userTimezones = [];

// Initialize timezones
function initTimezones() {
  // Load saved timezones from storage
  try {
    chrome.storage.sync.get('timezones', (result) => {
      if (result.timezones && Array.isArray(result.timezones)) {
        userTimezones = result.timezones;
        renderTimezones();
      }
    });
  } catch (error) {
    console.warn("Chrome storage API not available, using empty timezone list", error);
    userTimezones = [];
    renderTimezones();
  }
}

// Add a new timezone
function addTimezone(city) {
  // Check if already exists
  const exists = userTimezones.some(tz => tz.name === city.name && tz.country === city.country);
  
  if (!exists) {
    const timezone = {
      id: Date.now().toString(),
      name: city.name,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
      timezone: city.timezone
    };
    
    userTimezones.push(timezone);
    
    // Save to storage
    try {
      chrome.storage.sync.set({ timezones: userTimezones });
    } catch (error) {
      console.warn("Could not save timezones to storage:", error);
    }
    
    // Add to map
    renderTimezones();
  }
}

// Remove a timezone
function removeTimezone(id) {
  userTimezones = userTimezones.filter(tz => tz.id !== id);
  
  // Save to storage
  try {
    chrome.storage.sync.set({ timezones: userTimezones });
  } catch (error) {
    console.warn("Could not save timezones to storage:", error);
  }
  
  // Update map
  renderTimezones();
}

// Render all timezones on the map
function renderTimezones() {
  const pinsContainer = document.getElementById('timezone-pins');
  pinsContainer.innerHTML = '';
  
  userTimezones.forEach(tz => {
    // Create pin element
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.dataset.id = tz.id;
    pin.dataset.lat = tz.lat;
    pin.dataset.lng = tz.lng;
    
    // Add pin icon
    const pinIcon = document.createElement('div');
    pinIcon.className = 'pin-icon';
    
    // Add city and time labels
    const pinLabel = document.createElement('div');
    pinLabel.className = 'pin-label';
    
    // Add delete button
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '×';
    deleteBtn.style.marginLeft = '5px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTimezone(tz.id);
    });
    
    // Add elements to pin
    pin.appendChild(pinIcon);
    pin.appendChild(pinLabel);
    pinLabel.innerHTML = `${tz.name}`;
    pinLabel.appendChild(deleteBtn);
    
    // Position pin on map
    const [x, y] = getCoordinates(tz.lat, tz.lng);
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
    
    pinsContainer.appendChild(pin);
  });
  
  // Update all timezone times
  updateAllTimezones();
}

// Update times for all timezones
function updateAllTimezones() {
  const now = new Date();
  const pins = document.querySelectorAll('.pin');
  
  // Default to 12-hour format if storage access fails
  let format = '12';
  
  // Get time format setting (12h or 24h)
  try {
    chrome.storage.sync.get('timeFormat', (result) => {
      format = result.timeFormat || '12';
      updateTimesWithFormat(now, pins, format);
    });
  } catch (error) {
    console.warn("Could not access time format from storage:", error);
    updateTimesWithFormat(now, pins, format);
  }
}

// Helper function to update times with a specific format
function updateTimesWithFormat(now, pins, format) {
  pins.forEach(pin => {
    const id = pin.dataset.id;
    const timezone = userTimezones.find(tz => tz.id === id);
    
    if (timezone) {
      const localTime = getLocalTime(now, timezone.timezone);
      const timeStr = formatTime(localTime, format);
      
      const pinLabel = pin.querySelector('.pin-label');
      if (pinLabel) {
        // Preserve the delete button
        const deleteBtn = pinLabel.querySelector('span');
        pinLabel.innerHTML = `${timezone.name}<br>${timeStr}`;
        pinLabel.appendChild(deleteBtn);
      }
    }
  });
}

// Get the local time for a specific timezone
function getLocalTime(date, timezone) {
  try {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  } catch (e) {
    console.error('Invalid timezone:', timezone, e);
    return date; // Fallback to UTC
  }
}

// Format time based on user preference
function formatTime(date, format) {
  if (format === '24') {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  }
} 