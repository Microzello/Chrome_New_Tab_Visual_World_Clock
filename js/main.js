class WorldClock {
    constructor() {
        this.map = new WorldMap();
        this.clocks = new Map();
        this.selectedCities = new Set();
        
        this.loadSavedCities();
        this.setupEventListeners();
    }

    loadSavedCities() {
        const savedCities = JSON.parse(localStorage.getItem('selectedCities') || '[]');
        if (savedCities.length === 0) {
            // Add default cities if no cities are saved
            cities.forEach(city => this.addCity(city));
        } else {
            savedCities.forEach(cityName => {
                const city = cityDatabase.find(c => c.name === cityName);
                if (city) {
                    this.addCity(city);
                }
            });
        }
    }

    setupEventListeners() {
        const addButton = document.getElementById('add-city');
        const citySearch = document.getElementById('city-search');
        const cityInput = document.getElementById('city-input');
        const searchResults = document.getElementById('search-results');
        
        addButton.addEventListener('click', () => {
            citySearch.classList.toggle('hidden');
            if (!citySearch.classList.contains('hidden')) {
                cityInput.focus();
            }
        });
        
        cityInput.addEventListener('input', () => {
            const query = cityInput.value.toLowerCase();
            const results = cityDatabase
                .filter(city => !this.selectedCities.has(city.name))
                .filter(city => city.name.toLowerCase().includes(query))
                .slice(0, 5);
                
            searchResults.innerHTML = '';
            results.forEach(city => {
                const div = document.createElement('div');
                div.className = 'search-result';
                div.textContent = city.name;
                div.addEventListener('click', () => {
                    this.addCity(city);
                    citySearch.classList.add('hidden');
                    cityInput.value = '';
                });
                searchResults.appendChild(div);
            });
        });
        
        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!citySearch.contains(e.target) && !addButton.contains(e.target)) {
                citySearch.classList.add('hidden');
            }
        });
    }

    addCity(city) {
        if (this.selectedCities.has(city.name)) return;
        
        this.selectedCities.add(city.name);
        
        // Add clock widget with delete callback
        const clock = new Clock(city, (cityName) => this.removeCity(cityName));
        this.clocks.set(city.name, clock);
        document.getElementById('clocks-container').appendChild(clock.element);
        
        // Add marker to map
        this.map.addCityMarker(city);
        
        // Save to localStorage
        localStorage.setItem('selectedCities', 
            JSON.stringify([...this.selectedCities]));
    }

    removeCity(cityName) {
        if (!this.selectedCities.has(cityName)) return;
        
        this.selectedCities.delete(cityName);
        
        // Remove clock widget
        const clock = this.clocks.get(cityName);
        if (clock) {
            clock.destroy();
            this.clocks.delete(cityName);
        }
        
        // Update map markers
        this.map.clearCityMarkers();
        [...this.selectedCities].forEach(name => {
            const city = cityDatabase.find(c => c.name === name);
            if (city) {
                this.map.addCityMarker(city);
            }
        });
        
        // Save to localStorage
        localStorage.setItem('selectedCities', 
            JSON.stringify([...this.selectedCities]));
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.worldClock = new WorldClock();
    
    // Drawer toggle logic
    const drawer = document.getElementById('clocks-drawer');
    const toggleBtn = document.getElementById('drawer-toggle');
    let drawerOpen = false;
    function setDrawer(open) {
        drawerOpen = open;
        if (open) {
            drawer.classList.add('open');
            toggleBtn.innerHTML = '&#8213;'; // three em dashes
        } else {
            drawer.classList.remove('open');
            toggleBtn.innerHTML = '&#8213;';
        }
    }
    toggleBtn.addEventListener('click', () => setDrawer(!drawerOpen));
    // Default: drawer hidden
    setDrawer(false);
});
