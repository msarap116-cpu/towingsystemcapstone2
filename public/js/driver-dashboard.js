// driver-dashboard.js

const DRIVER_LOCATION_INTERVAL_MS = 5000;

let map = null;
let driverMarker = null;
let customerMarker = null;
let routeLayer = null;
let activeRequestId = null;
let lastSentAt = 0;
let watchId = null;


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

const MAP_CONFIG = {
    bounds: {
        southWest: { lat: 6.1, lng: 124.5 },  
        northEast: { lat: 6.5, lng: 124.9}   
    },
    minZoom: 10,
    maxZoom: 18,
    boundsViscosity: 1.0
};


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

    //tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);


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




// DOMContentLoaded regular50
document.addEventListener('DOMContentLoaded', function () {
    displayUserInfo();
    setupEventListeners();
    loadDashboardData().then(() => {
        initDriverMap(); 
    }).catch(err => {
        console.error('Failed to load dashboard:', err);
    });
});

async function initDriverMap() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return; 

    const requestData = await fetchActiveRequest();
    if (!requestData) {
        mapDiv.innerHTML = '<p style="padding:1rem;color:#888">No active customer request found.</p>';
        return;
    }

    activeRequestId = requestData.request_id;
    const customerLat = parseFloat(requestData.location_lat);
    const customerLng = parseFloat(requestData.location_lng);

    
    map = L.map('map').setView([customerLat, customerLng], 15);
        // map = initMapWithBounds('map', [customerLat, customerLng], 14);// muhon

   
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

  
    customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<strong>📍 Customer Location</strong><br>${requestData.address || 'Customer location'}`)
        .openPopup();


    showJobActions(requestData);

    
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

   
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const driverLat = position.coords.latitude;
            const driverLng = position.coords.longitude;
            
            
            driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
                .addTo(map)
                .bindPopup('<strong>🚗 You (Driver)</strong>');
            
           
            map.setView([driverLat, driverLng], 19);
            
           
            await drawRoute(driverLat, driverLng, customerLat, customerLng);
            
           
            sendDriverLocation(driverLat, driverLng);
            
            
            watchId = navigator.geolocation.watchPosition(
                (newPosition) => onDriverLocationUpdate(newPosition, customerLat, customerLng),
                (err) => console.error('Geolocation error:', err),
                {         enableHighAccuracy: true,
                         maximumAge: 0,
                         timeout: 15000
                }
            );
        },
        (err) => {
            console.error('Error getting initial location:', err);
            // Fallback: start watching anyway
            watchId = navigator.geolocation.watchPosition(
                (position) => onDriverLocationUpdate(position, customerLat, customerLng),
                (err) => console.error('Geolocation error:', err),
                {           
                              enableHighAccuracy: true,
                             maximumAge: 0,
                             timeout: 15000

                }
            );
        },
        {       
              enableHighAccuracy: true,
                  maximumAge: 0,
                  timeout: 15000}
    );
}

//Called every time driver GPS updates muna sa terminal my 
async function onDriverLocationUpdate(position, customerLat, customerLng) {
    const driverLat = position.coords.latitude;
    const driverLng = position.coords.longitude;

        console.log("GPS Update:", 
    position.coords.latitude,
    position.coords.longitude,
    "Accuracy:", position.coords.accuracy
    );

    if (!driverMarker) {
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
            .addTo(map)
            .bindPopup('<strong>🚗 You (Driver)</strong>');

        map.fitBounds(
            L.latLngBounds([driverLat, driverLng], [customerLat, customerLng]),
            { padding: [60, 60] }
        );
    } else {
        driverMarker.setLatLng([driverLat, driverLng]);
    }



    await drawRoute(driverLat, driverLng, customerLat, customerLng);
    sendDriverLocation(driverLat, driverLng);
}


async function drawRoute(fromLat, fromLng, toLat, toLng) {
    try {
       
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
                `<strong>🚗 You (Driver)</strong><br>
                 Distance to customer: <strong>${distanceKm} km</strong><br>
                 Est. arrival: <strong>${durationMin} min</strong>`
            );
        }
        
    } catch (err) {
        console.error('Route drawing failed:', err);
       
        if (routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.polyline(
            [[fromLat, fromLng], [toLat, toLng]],
            { color: '#888', weight: 3, dashArray: '8 6', opacity: 0.6 }
        ).addTo(map);
        
    
        const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
        if (driverMarker) {
            driverMarker.setPopupContent(
                `<strong>🚗 You (Driver)</strong><br>
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

// POST driver GPS to backend every 5s
async function sendDriverLocation(lat, lng) {
    const now = Date.now();
    if (now - lastSentAt < DRIVER_LOCATION_INTERVAL_MS) return;
    lastSentAt = now;

    const token = localStorage.getItem('token');
    if (!token || !activeRequestId) return;

    try {
        await fetch(`${API_BASE_URL}/requests/driver-location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lat, lng, request_id: activeRequestId })
        });
    } catch (err) {
        console.error('Failed to send driver location:', err);
    }
}

//  Fetch latest pending request (Point B data) 
async function fetchActiveRequest() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token — driver not logged in.');
        return null;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('status:', res.status);

        if (!res.ok) {
            console.error('Failed to fetch request:', res.status);
            return null;
        }

        const data = await res.json();
        console.log('parsed data:', data);

        if (!data?.location_lat || !data?.location_lng) {
            console.warn('Request has no location data.');
            return null;
        }

        return data;

    } catch (err) {
        console.error('Failed to fetch active request:', err);
        return null;
    }
}

//  Show job action buttons once a request is loaded 
function showJobActions(requestData) {
    const jobActions = document.getElementById('job-actions');
    const jobInfo = document.getElementById('job-info');

    if (jobActions) jobActions.style.display = 'block';
    if (jobInfo) {
        jobInfo.textContent = `Job #${requestData.request_id} — ${requestData.service_type || 'Service'} (${requestData.vehicle_type || 'Vehicle'})`;
    }
}

//  Display user info in sidebar
function displayUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = user.name;

    const userType = document.getElementById('userType');
    if (userType) userType.textContent = user.role;

    const initials = user.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();

    const userInitials = document.getElementById('userInitials');
    if (userInitials) userInitials.textContent = initials;
}

//  Setup event listeners 
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const completeBtn = document.getElementById('completeJobBtn');
    if (completeBtn) completeBtn.addEventListener('click', completeJob);
    
    const acceptBtn = document.getElementById('acceptJobBtn');
    if (acceptBtn) acceptBtn.addEventListener('click', acceptJob);
}

// Logout 
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.localStorage.clear();
        window.sessionStorage.clear();
        window.location.replace('home');
    }
}



//  Accept job (if your system has this feature) ─
async function acceptJob() {
    if (!activeRequestId) {
        alert('No active job found.');
        return;
    }

    if (!confirm('Accept this job?')) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_BASE_URL}/requests/${activeRequestId}/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to accept job');
        }

        alert('Job accepted! Starting navigation...');
        
        // Hide accept button, show complete button if needed
        const acceptBtn = document.getElementById('acceptJobBtn');
        if (acceptBtn) acceptBtn.style.display = 'none';
        
        const completeBtn = document.getElementById('completeJobBtn');
        if (completeBtn) completeBtn.style.display = 'inline-block';

    } catch (err) {
        console.error('Failed to accept job:', err);
        alert('Error accepting job. Please try again.');
    }
}

//complete the job buttonis
async function completeJob() {
    if (!activeRequestId) {
        alert('No active job found.');
        return;
    }

    if (!confirm('Mark this job as completed?')) return;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_BASE_URL}/requests/${activeRequestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'completed' })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to complete job');
        }

        alert('Job marked as completed!');

        // Stop GPS tracking
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }

        // Hide the action buttons
        const jobActions = document.getElementById('job-actions');
        if (jobActions) jobActions.style.display = 'none';

        // Clear the route line
        if (routeLayer) map.removeLayer(routeLayer);
        
        // Update marker popup
        if (driverMarker) {
            driverMarker.setPopupContent('<strong>Job Completed!</strong>');
        }

        // Optional: Redirect to dashboard or show completion message
        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (err) {
        console.error('Failed to complete job:', err);
        alert('Error completing job. Please try again.');
    }
}

//  Load dashboard data (implement as needed) ─
async function loadDashboardData() {
    // Your existing dashboard data loading logic
    // This function should fetch driver stats, earnings, etc.
    console.log('Loading dashboard data...');
}

//  Clean up on page unload ─
window.addEventListener('beforeunload', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
});