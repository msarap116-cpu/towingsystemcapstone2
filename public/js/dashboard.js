// dashboard.js
// Shows the customer's own request location + driver's live location (if available)

const POLL_INTERVAL_MS = 30000; // refresh driver position every 30 seconds (increased from 6 to respect rate limits)

let map = null;
let customerMarker = null;
let driverMarker = null;
let routeLayer = null;
let pollingInterval = null;

const MAP_CONFIG = {
    bounds: {
        southWest: { lat: 6.1, lng: 124.5 },  
        northEast: { lat: 6.5, lng: 124.9}   
    },
    minZoom: 10,
    maxZoom: 18,
    boundsViscosity: 1.0
};

const customerIcon = L.divIcon({
    className: '',
    html: `<div style="
        background:#D85A30;color:#fff;border-radius:50%;
        width:36px;height:36px;display:flex;align-items:center;
        justify-content:center;font-size:18px;
        border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
        📍
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const driverIcon = L.divIcon({
    className: '',
    html: `<div style="
        background:#1D9E75;color:#fff;border-radius:50%;
        width:36px;height:36px;display:flex;align-items:center;
        justify-content:center;font-size:18px;
        border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
        🚗
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
});
//display who is login fdsklafjj
function displayUserInfo() {
    const user = JSON.parse(localStorage.getItem("user") || '{}');
    if (!user) return;

    const profileName = document.getElementById('profileName');
    const userType = document.getElementById('userType');

    if (profileName) profileName.textContent = user.name || 'User';
    if (userType) userType.textContent = user.role || 'Customer';
}
// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Clear all storage
        window.localStorage.clear();
        window.sessionStorage.clear();
        
        // Redirect to home
        window.location.replace('home');
    }
}
// Function to initialize map with boundaries
function initMapWithBounds(mapDiv, initialCenter, initialZoom = 14) {
    const map = L.map(mapDiv, {
        maxBounds: L.latLngBounds(
            [MAP_CONFIG.bounds.southWest.lat, MAP_CONFIG.bounds.southWest.lng],
            [MAP_CONFIG.bounds.northEast.lat, MAP_CONFIG.bounds.northEast.lng]
        ),
        maxBoundsViscosity: MAP_CONFIG.boundsViscosity,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        bounceAtZoomLimits: false
    }).setView(initialCenter, initialZoom);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Optional: Add boundary overlay
    const boundsLayer = L.rectangle(
        L.latLngBounds(
            [MAP_CONFIG.bounds.southWest.lat, MAP_CONFIG.bounds.southWest.lng],
            [MAP_CONFIG.bounds.northEast.lat, MAP_CONFIG.bounds.northEast.lng]
        ),
        {
            color: "#7700ff",
            weight: 2,
            fill: false,
            dashArray: "5, 10",
            interactive: true
        }
    ).addTo(map);
    
    boundsLayer.bindPopup("South Cotabato Service Area");

    return map;
}
// Main function to load user map
async function loadUserMap() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token — customer not logged in.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`${res.status} - ${body}`);
        }

        const data = await res.json();

        if (!data?.location_lat || !data?.location_lng) {
            console.warn('No location data on request.');
            const mapDiv = document.getElementById('map');
            if (mapDiv) {
                mapDiv.innerHTML = '<p style="padding:1rem;color:#888">No active request found. Please create a service request first.</p>';
            }
            return;
        }

        const lat = parseFloat(data.location_lat);
        const lng = parseFloat(data.location_lng);

        // Initialize map with FREE OpenStreetMap tiles
        map = L.map('map').setView([lat, lng], 15);
    //    map = initMapWithBounds('map', [lat, lng], 14);

        // FREE tile layer - NO API KEY NEEDED!
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        // Customer pin
        customerMarker = L.marker([lat, lng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<strong>📍 Your Location</strong><br>${data.address || 'Your requested location'}`)
            .openPopup();

        // If driver location already exists, show it immediately
        if (data.driver_lat && data.driver_lng) {
            showDriverOnMap(
                parseFloat(data.driver_lat),
                parseFloat(data.driver_lng),
                lat, lng
            );
        }

        // Poll for driver location updates
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => pollDriverLocation(lat, lng), POLL_INTERVAL_MS);

    } catch (err) {
        console.error('Map load error:', err);
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = '<p style="padding:1rem;color:#888">Error loading map. Please refresh the page.</p>';
        }
    }
}

// Poll for driver location updates
async function pollDriverLocation(customerLat, customerLng) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.driver_lat || !data?.driver_lng) return;

        showDriverOnMap(
            parseFloat(data.driver_lat),
            parseFloat(data.driver_lng),
            customerLat, customerLng
        );
    } catch (err) {
        console.error('Poll error:', err);
    }
}

// Show driver on map and draw route
async function showDriverOnMap(driverLat, driverLng, customerLat, customerLng) {
    if (!driverMarker) {
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
            .addTo(map)
            .bindPopup('<strong>🚗 Driver is on the way</strong>');

        const bounds = L.latLngBounds(
            [driverLat, driverLng],
            [customerLat, customerLng]
        );
        map.fitBounds(bounds, { padding: [60, 60] });
    } else {
        driverMarker.setLatLng([driverLat, driverLng]);
    }

    // Draw route using FREE OSRM
    await drawRoute(driverLat, driverLng, customerLat, customerLng);
}

// Draw route using FREE OSRM (no API key needed)
async function drawRoute(fromLat, fromLng, toLat, toLng) {
    try {
        // Using free OSRM public server - NO API KEY NEEDED!
        const url = `https://router.project-osrm.org/route/v1/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?overview=full&geometries=geojson&steps=true`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code !== 'Ok') throw new Error('Routing failed');
        
        // Extract route coordinates
        const coordinates = data.routes[0].geometry.coordinates;
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
        
        // Calculate distance and duration
        const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
        const durationMin = Math.ceil(data.routes[0].duration / 60);
        
        // Update or create route layer
        if (routeLayer) map.removeLayer(routeLayer);
        
        routeLayer = L.polyline(latLngs, {
            color: '#1D9E75',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);
        
        // Update driver marker popup with ETA
        if (driverMarker) {
            driverMarker.setPopupContent(
                `<strong>🚗 Driver is on the way</strong><br>
                 Distance: <strong>${distanceKm} km</strong><br>
                 ETA: <strong>${durationMin} min</strong>`
            );
        }
        
        // Optional: Add a small popup with route summary
        const midPoint = getMidpoint(fromLat, fromLng, toLat, toLng);
        const routeSummary = L.popup()
            .setLatLng(midPoint)
            .setContent(`🚗 ${distanceKm} km · ⏱️ ${durationMin} min`)
            .openOn(map);
        
        // Auto-close the summary after 5 seconds
        setTimeout(() => map.closePopup(routeSummary), 5000);
        
    } catch (err) {
        console.error('Route drawing failed:', err);
        
        // Fallback to straight line with distance calculation
        if (routeLayer) map.removeLayer(routeLayer);
        
        routeLayer = L.polyline(
            [[fromLat, fromLng], [toLat, toLng]],
            { color: '#888', weight: 3, dashArray: '8 6', opacity: 0.6 }
        ).addTo(map);
        
        // Calculate straight-line distance as fallback
        const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
        
        if (driverMarker) {
            driverMarker.setPopupContent(
                `<strong>🚗 Driver is on the way</strong><br>
                 Straight line distance: <strong>${straightDistance} km</strong><br>
                 (Routing temporarily unavailable)`
            );
        }
    }
}

// Helper function to calculate straight-line distance (fallback)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
}

// Helper function to get midpoint between two points
function getMidpoint(lat1, lng1, lat2, lng2) {
    return [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
}

// Optional: Add geocoding function if needed (convert address to coordinates)
async function geocodeAddress(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(address)}&format=json&limit=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'YourApp/1.0' // Required by Nominatim
            }
        });
        const data = await response.json();
        
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }
        return null;
    } catch (err) {
        console.error('Geocoding error:', err);
        return null;
    }
}

// Clean up polling on page unload
window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});


document.addEventListener('DOMContentLoaded', function () {
    displayUserInfo();  // Just call it directly - it's synchronous
    loadUserMap();      // Then load the map
});