// Main app initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing application...");
  
  // Check if required libraries are loaded
  if (typeof d3 === 'undefined') {
    console.error("D3.js library not loaded!");
    showErrorMessage("Required library D3.js is not loaded. Please check your internet connection and try again.");
    return;
  }
  
  if (typeof topojson === 'undefined') {
    console.error("TopoJSON library not loaded!");
    showErrorMessage("Required library TopoJSON is not loaded. Please check your internet connection and try again.");
    return;
  }
  
  // Verify cities data is available
  if (typeof window.cities === 'undefined' || !Array.isArray(window.cities) || window.cities.length === 0) {
    console.error("Cities data not available or empty!");
    showErrorMessage("Cities data could not be loaded. Please check the data.js file.");
    return;
  } else {
    console.log(`Cities data loaded: ${window.cities.length} cities available`);
  }
  
  try {
    // Initialize components in sequence
    initWorldMap();
    
    // Wait for the map to initialize before continuing
    const checkMapInterval = setInterval(() => {
      if (window.mapInitialized) {
        clearInterval(checkMapInterval);
        console.log("Map initialized, continuing with other components");
        
        // Initialize remaining components
        initDayNightCurve();
        initTimezones();
        initModalHandlers();
        initThemeSettings();
        
        // Update timezones every minute
        updateAllTimezones();
        setInterval(updateAllTimezones, 60000);
        
        // Update day/night curve every 15 minutes
        updateDayNightCurve();
        setInterval(updateDayNightCurve, 15 * 60000);
        
        // Hide loading indicator
        document.querySelector('.loading-indicator').style.display = 'none';
      }
    }, 500);
    
    // Set a timeout in case the map never initializes
    setTimeout(() => {
      if (!window.mapInitialized) {
        clearInterval(checkMapInterval);
        console.error("Map failed to initialize within timeout period");
        showErrorMessage("Failed to load the world map. Please try refreshing the page.");
      }
    }, 20000); // 20 second timeout
  } catch (error) {
    console.error("Error during initialization:", error);
    showErrorMessage("An error occurred during initialization: " + error.message);
  }
});

// Display error message to user
function showErrorMessage(message) {
  const loadingIndicator = document.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.innerHTML = `<div style="color: #721c24; background-color: #f8d7da; padding: 10px; border-radius: 4px; max-width: 400px;">${message}</div>`;
  }
}

// Modal handlers initialization
function initModalHandlers() {
  try {
    const addTimezoneBtn = document.getElementById('add-timezone');
    const settingsBtn = document.getElementById('settings');
    const timezoneModal = document.getElementById('timezone-modal');
    const settingsModal = document.getElementById('settings-modal');
    const closeButtons = document.querySelectorAll('.close');
    
    if (!addTimezoneBtn || !settingsBtn || !timezoneModal || !settingsModal) {
      console.error("One or more modal elements not found");
      return;
    }
    
    addTimezoneBtn.addEventListener('click', () => {
      timezoneModal.style.display = 'block';
    });
    
    settingsBtn.addEventListener('click', () => {
      settingsModal.style.display = 'block';
    });
    
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        timezoneModal.style.display = 'none';
        settingsModal.style.display = 'none';
      });
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === timezoneModal) {
        timezoneModal.style.display = 'none';
      }
      if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
    
    // City search handler
    const citySearch = document.getElementById('city-search');
    const searchResults = document.getElementById('search-results');
    
    if (!citySearch || !searchResults) {
      console.error("City search elements not found");
      return;
    }
    
    citySearch.addEventListener('input', debounce(() => {
      const query = citySearch.value.trim().toLowerCase();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }
      
      // Check if cities data is available
      if (!window.cities || !Array.isArray(window.cities) || window.cities.length === 0) {
        console.error("Cities data is not available for search");
        searchResults.innerHTML = '<div class="search-result error">Error: City data not loaded</div>';
        return;
      }
      
      console.log(`Searching for "${query}" in ${window.cities.length} cities`);
      
      const results = window.cities.filter(city => 
        city.name.toLowerCase().includes(query) || 
        city.country.toLowerCase().includes(query)
      ).slice(0, 10);
      
      console.log(`Found ${results.length} matches for "${query}"`);
      
      displaySearchResults(results);
    }, 300));
    
    console.log("Modal handlers initialized");
  } catch (error) {
    console.error("Error initializing modal handlers:", error);
  }
}

// Display search results
function displaySearchResults(results) {
  try {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result">No results found</div>';
      return;
    }
    
    results.forEach(city => {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'search-result';
      resultDiv.textContent = `${city.name}, ${city.country}`;
      resultDiv.addEventListener('click', () => {
        addTimezone(city);
        document.getElementById('timezone-modal').style.display = 'none';
        document.getElementById('city-search').value = '';
        searchResults.innerHTML = '';
      });
      searchResults.appendChild(resultDiv);
    });
  } catch (error) {
    console.error("Error displaying search results:", error);
  }
}

// Initialize theme settings
function initThemeSettings() {
  try {
    const themeSelect = document.getElementById('theme-select');
    const timeFormatSelect = document.getElementById('time-format');
    
    if (!themeSelect || !timeFormatSelect) {
      console.error("Theme settings elements not found");
      return;
    }
    
    // Load saved settings or use defaults
    try {
      chrome.storage.sync.get(['theme', 'timeFormat'], (result) => {
        const savedTheme = result.theme || 'light';
        const savedTimeFormat = result.timeFormat || '12';
        
        themeSelect.value = savedTheme;
        timeFormatSelect.value = savedTimeFormat;
        
        applyTheme(savedTheme);
      });
    } catch (storageError) {
      // Fallback if chrome storage is not available
      console.warn("Chrome storage API not available, using defaults", storageError);
      themeSelect.value = 'light';
      timeFormatSelect.value = '12';
      applyTheme('light');
    }
    
    // Save settings when changed
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value;
      try {
        chrome.storage.sync.set({ theme });
      } catch (err) {
        console.warn("Could not save theme to storage:", err);
      }
      applyTheme(theme);
    });
    
    timeFormatSelect.addEventListener('change', () => {
      const timeFormat = timeFormatSelect.value;
      try {
        chrome.storage.sync.set({ timeFormat });
      } catch (err) {
        console.warn("Could not save time format to storage:", err);
      }
      updateAllTimezones();
    });
    
    console.log("Theme settings initialized");
  } catch (error) {
    console.error("Error initializing theme settings:", error);
  }
}

// Apply theme
function applyTheme(theme) {
  try {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark-theme', prefersDark);
      
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        document.body.classList.toggle('dark-theme', e.matches);
      });
    } else {
      document.body.classList.toggle('dark-theme', theme === 'dark');
    }
  } catch (error) {
    console.error("Error applying theme:", error);
  }
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
} 