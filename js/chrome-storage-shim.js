// Chrome Storage API Shim for testing outside extension context
(function() {
  // Only add the shim if chrome.storage is not defined
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn("Chrome storage API not available, using localStorage shim");
    
    // Create chrome namespace if it doesn't exist
    window.chrome = window.chrome || {};
    
    // Create storage object
    chrome.storage = {
      // Sync storage (uses localStorage)
      sync: {
        // Get data from localStorage
        get: function(keys, callback) {
          console.log("Storage shim: get", keys);
          let result = {};
          
          if (Array.isArray(keys)) {
            keys.forEach(key => {
              try {
                const value = localStorage.getItem('chrome-storage-' + key);
                if (value !== null) {
                  result[key] = JSON.parse(value);
                }
              } catch (e) {
                console.error("Error reading from localStorage:", e);
              }
            });
          } else if (typeof keys === 'object') {
            Object.keys(keys).forEach(key => {
              try {
                const value = localStorage.getItem('chrome-storage-' + key);
                result[key] = value !== null ? JSON.parse(value) : keys[key];
              } catch (e) {
                console.error("Error reading from localStorage:", e);
                result[key] = keys[key]; // Use default
              }
            });
          } else if (typeof keys === 'string') {
            try {
              const value = localStorage.getItem('chrome-storage-' + keys);
              if (value !== null) {
                result[keys] = JSON.parse(value);
              }
            } catch (e) {
              console.error("Error reading from localStorage:", e);
            }
          }
          
          // Async callback to mimic chrome.storage behavior
          setTimeout(() => {
            callback(result);
          }, 0);
        },
        
        // Set data to localStorage
        set: function(items, callback) {
          console.log("Storage shim: set", items);
          
          try {
            Object.keys(items).forEach(key => {
              localStorage.setItem('chrome-storage-' + key, JSON.stringify(items[key]));
            });
            
            if (callback) {
              setTimeout(callback, 0);
            }
          } catch (e) {
            console.error("Error writing to localStorage:", e);
            if (callback) {
              setTimeout(() => {
                callback(e);
              }, 0);
            }
          }
        },
        
        // Remove data from localStorage
        remove: function(keys, callback) {
          console.log("Storage shim: remove", keys);
          
          try {
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                localStorage.removeItem('chrome-storage-' + key);
              });
            } else if (typeof keys === 'string') {
              localStorage.removeItem('chrome-storage-' + keys);
            }
            
            if (callback) {
              setTimeout(callback, 0);
            }
          } catch (e) {
            console.error("Error removing from localStorage:", e);
            if (callback) {
              setTimeout(() => {
                callback(e);
              }, 0);
            }
          }
        },
        
        // Clear all data from localStorage (only our keys)
        clear: function(callback) {
          console.log("Storage shim: clear");
          
          try {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('chrome-storage-')) {
                localStorage.removeItem(key);
              }
            });
            
            if (callback) {
              setTimeout(callback, 0);
            }
          } catch (e) {
            console.error("Error clearing localStorage:", e);
            if (callback) {
              setTimeout(() => {
                callback(e);
              }, 0);
            }
          }
        }
      }
    };
    
    console.log("Chrome storage shim initialized");
  }
})(); 