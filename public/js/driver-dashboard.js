
// driver-dashboard.js – Real API Integration

const DRIVER_LOCATION_INTERVAL_MS = 5000;
// const API_BASE_URL = 'https://your-backend-api.com'; // <-- CHANGE THIS

let map = null;
let driverMarker = null;
let customerMarker = null;
let routeLayer = null;
let activeRequestId = null;
let lastSentAt = 0;
let watchId = null;


//  DRIVER ICON — Plain Red PNG
const driverIcon = L.icon({
    iconUrl: 'image/waypoint-red.png',       // your red icon
    iconSize: [36, 36],                      // match your old circle size
    iconAnchor: [18, 36],                    // tip points to the coordinate
    popupAnchor: [0, -36]
});

// CUSTOMER ICON — Plain Blue PNG
const customerIcon = L.icon({
    iconUrl: 'image/waypoint-blue.png',      // your blue icon
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});
// ---------- SOUTH COTABATO MAP CONFIG (optional) ----------
const MAP_CONFIG = {
    bounds: {
        southWest: { lat: 6.1, lng: 124.5 },
        northEast: { lat: 6.5, lng: 124.9 }
    },
    minZoom: 10,
    maxZoom: 18,
    boundsViscosity: 1.0,
    defaultCenter: { lat: 6.3, lng: 124.7 }
};

// ---------- DATA STORE ----------
let pendingRequests = [];
let myActiveTrips = [];
let completedTrips = [];
let CURRENT_DRIVER = { id: null, name: '' };

// ---------- FETCH FUNCTIONS ----------
// async function fetchPendingRequests() {
//     const token = sessionStorage.getItem('token');
//     if (!token) return [];
//     try {
//         const res = await fetch(`${API_BASE_URL}/requests/pending`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (!res.ok) throw new Error('Failed to fetch pending');
//         return await res.json();
//     } catch (err) {
//         console.error('fetchPendingRequests error:', err);
//         return [];
//     }
// }

async function fetchPendingRequests() {
    const token = sessionStorage.getItem('token');

    if (!token) return [];
    try {
        const res = await fetch(`${API_BASE_URL}/requests/pending`, {
            headers: { 'Authorization': `Bearer ${token}` },

            cache: 'no-store'
        });
        console.log('Pending response status:', res.status);
        const data = await res.json();
        console.log('Pending data:', data);
        return data;
    } catch (err) {
        console.error('fetchPendingRequests error:', err);
        return [];
    }
}

async function fetchMyTrips() {
    const token = sessionStorage.getItem('token');

    if (!token) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/requests/my-trips`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('My trips response status:', res.status);

        if (!res.ok) {
            throw new Error('Failed to fetch my trips');
        }

        const data = await res.json();

        console.log('MY TRIPS DATA:', data);

        return data;

    } catch (err) {
        console.error('fetchMyTrips error:', err);
        return [];
    }
}

async function loadDriverDashboardData() {
    try {
        const [pending, trips, earnings] = await Promise.all([
            fetchPendingRequests(),
            fetchMyTrips(),
            fetchEarningsSummary()
        ]);

        const currentDataString = JSON.stringify({ pending, trips, earnings });
        if (window.lastDriverData === currentDataString) {
            return;
        }
        window.lastDriverData = currentDataString;

        pendingRequests = pending;
        myActiveTrips = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
        completedTrips = trips.filter(t => t.status === 'completed');
        todayEarnings = earnings.today;       // now a real "today" number
        totalEarningsValue = earnings.allTime; // separate from today

        renderDashboardUI();
    } catch (err) {
        console.error('loadDriverDashboardData error:', err);
    }
}


// async function loadDashboardData() {
//     const [pending, trips] = await Promise.all([
//         fetchPendingRequests(),
//         fetchMyTrips()
//     ]);

//     pendingRequests = pending;
//     myActiveTrips = trips.filter(t => t.status !== 'completed' && t.status !== 'completed');
//     completedTrips = trips.filter(t => t.status === 'completed');

//     renderDashboardUI();
// }

// ---------- RENDER UI ----------
function renderDashboardUI() {

    console.log("Pending:", pendingRequests.length, pendingRequests);
    console.log("Active:", myActiveTrips.length, myActiveTrips);
    console.log("Completed:", completedTrips.length);

    const availableList = document.getElementById('availableRequestsList');
    if (availableList) {
        if (pendingRequests.length === 0) {
            availableList.innerHTML = '<div class="empty-state">No pending requests right now.</div>';
        } else {
            availableList.innerHTML = pendingRequests.map(req => `
                <div class="request-item" data-id="${req.request_id}">
                    <div class="top-line">
                        <span class="customer">${req.customer_name || 'Customer'}</span>
                        <span class="service">${req.service_type || 'Service'}</span>
                    </div>
                    <div class="location">📍 ${req.location || 'No address'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span class="price">₱${req.amount || 0}</span>
                        <span style="font-size:0.7rem; color:#5c728b;">${req.vehicle_type || ''}</span>
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary btn-sm" onclick="acceptJob(${req.request_id})">  Accept</button>
                    </div>
                </div>
            `).join('');
        }
    }

    const tripsList = document.getElementById('myTripsList');
    if (tripsList) {
        if (myActiveTrips.length === 0) {
            tripsList.innerHTML = '<div class="empty-state">No active trips</div>';
        } else {
            tripsList.innerHTML = myActiveTrips.map(trip => `
                <div class="request-item">
                    <div class="top-line">
                        <span class="customer">${trip.customer_name || 'Customer'}</span>
                        <span class="service">${trip.service_type || 'Service'}</span>
                    </div>
                    <div class="location">📍 ${trip.location || 'No address'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span class="status-badge ${trip.status}">${trip.status}</span>
                        <span class="price">₱${trip.amount || 0}</span>
                    </div>
                    <div class="actions">
                        <select class="status-select" onchange="updateTripStatus(${trip.request_id}, this.value)">

                                <option value="">Update Status</option>

                                    <option value="assigned" ${trip.status === 'assigned' ? 'selected' : ''}>Assigned</option>

                                    <option value="in progress" ${trip.status === 'in progress' ? 'selected' : ''}> In Progress</option>

                                    <option value="completed" ${trip.status === 'completed' ? 'selected' : ''}>Completed</option></select>

                                    <button class="btn btn-danger btn-sm" onclick="cancelTrip(${trip.request_id})">🗑️ Cancel</button>
                    </div>
                </div>
            `).join('');
        }
    }


    document.getElementById('statAvailable').innerText = pendingRequests.length;
    document.getElementById('statActiveTrips').innerText = myActiveTrips.length;
    document.getElementById('pendingCount').innerText = pendingRequests.length;
    document.getElementById('activeCount').innerText = myActiveTrips.length;
    document.getElementById('statCompleted').innerText = completedTrips.length;
    const todayEarnings = completedTrips.reduce((sum, t) => sum + (t.amount || 0), 0);
    document.getElementById('statEarnings').innerText = `₱${todayEarnings}`;
    document.getElementById('statEarnings').innerText = `₱${todayEarnings.toFixed(2)}`;

    // Other tabs
    const totalTrips = document.getElementById('totalTripsCount');
    if (totalTrips) totalTrips.innerText = completedTrips.length + myActiveTrips.length;
    const totalEarnings = document.getElementById('totalEarnings');
    if (totalEarnings) totalEarnings.innerText = `₱${todayEarnings}`;

    const totalEarningsEl = document.getElementById('totalEarnings');
    if (totalEarningsEl) totalEarningsEl.innerText = `₱${totalEarningsValue.toFixed(2)}`;

}

// ---------- ACCEPT JOB ----------
window.acceptJob = async function (requestId) {
    const token = sessionStorage.getItem('token');
    if (!token) {
        alert('Please log in again.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/requests/${requestId}/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            cache: 'no-store'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Accept failed');

        showToast(`  Job #${requestId} accepted!`);
        await loadDriverDashboardData(); // refresh lists

        // If Live Tracking tab is visible, refresh map
        if (document.getElementById('tab-tracking').style.display !== 'none') {
            initDriverMap();
        }
    } catch (err) {
        console.error('Accept error:', err);
        alert('Error accepting job: ' + err.message);
    }
};

// ---------- UPDATE TRIP STATUS ----------
window.updateTripStatus = async function (requestId, newStatus) {

    const token = sessionStorage.getItem('token');

    if (!token) return;

    // Nothing selected
    if (!newStatus) {
        return;
    }

    const trip = myActiveTrips.find(
        t => Number(t.request_id) === Number(requestId)
    );

    if (!trip) {
        alert('Trip not found.');
        return;
    }

    // Don't allow going backwards
    const statusOrder = {
        'assigned': 1,
        'in progress': 2,
        'completed': 3
    };

    const currentStatus = trip.status;

    if (
        statusOrder[newStatus] &&
        statusOrder[currentStatus] &&
        statusOrder[newStatus] < statusOrder[currentStatus]
    ) {
        alert(
            `You cannot change the status from "${currentStatus}" back to "${newStatus}".`
        );

        // Reload UI to restore the dropdown
        renderDashboardUI();
        return;
    }

    if (
        !confirm(
            `Change request #${requestId} from "${currentStatus}" to "${newStatus}"?`
        )
    ) {
        renderDashboardUI();
        return;
    }

    try {

        console.log('Updating request:', requestId);
        console.log('Current status:', currentStatus);
        console.log('New status:', newStatus);

        const res = await fetch(
            `${API_BASE_URL}/requests/${requestId}/status`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        const data = await res.json();

        console.log('Status update response:', data);

        if (!res.ok) {
            throw new Error(
                data.error || data.message || 'Status update failed'
            );
        }

        showToast(`Status updated to ${newStatus}`);

        // IMPORTANT:
        // Reload the requests after updating the database
        await loadDriverDashboardData();

        // If completed, stop driver tracking
        if (newStatus === 'completed') {

            if (Number(activeRequestId) === Number(requestId)) {

                console.log('Cleaning up completed request:', requestId);

                activeRequestId = null;

                if (watchId) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }

                if (routeLayer) {
                    map.removeLayer(routeLayer);
                    routeLayer = null;
                }

                if (customerMarker) {
                    map.removeLayer(customerMarker);
                    customerMarker = null;
                }

                if (
                    document.getElementById('tab-tracking') &&
                    document.getElementById('tab-tracking').style.display !== 'none'
                ) {
                    initDriverMap();
                }
            }

        } else {

            // Refresh tracking map
            if (
                document.getElementById('tab-tracking') &&
                document.getElementById('tab-tracking').style.display !== 'none'
            ) {
                initDriverMap();
            }
        }

    } catch (err) {

        console.error('Status update error:', err);

        alert(
            'Error updating status: ' + err.message
        );

        // Restore correct UI after failure
        await loadDriverDashboardData();
    }
};
//-----------cancel trippings--------------------------------------------
window.cancelTrip = async function (requestId) {
    const token = sessionStorage.getItem('token');
    if (!token) {
        alert('Please log in again.');
        return;
    }

    const reason = prompt('Please enter a reason for cancellation (optional):');
    if (reason === null) return; // user clicked Cancel

    try {
        const res = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason.trim() || 'Cancelled by driver' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancel failed');

        showToast(`Job #${requestId} cancelled.`);
        await loadDriverDashboardData(); // refresh lists

        // If Live Tracking tab is visible, refresh map
        if (document.getElementById('tab-tracking').style.display !== 'none') {
            initDriverMap();
        }
    } catch (err) {
        console.error('Cancel error:', err);
        alert('Error cancelling job: ' + err.message);
    }
};

// ---------- MAP & GPS (unchanged except for API integration) ----------
async function initDriverMap() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) {
        console.warn('Map div not found');
        return;
    }

    // Clean up existing map
    if (map) {
        try {
            if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
            if (driverMarker) { map.removeLayer(driverMarker); driverMarker = null; }
            if (customerMarker) { map.removeLayer(customerMarker); customerMarker = null; }
            map.remove();
        } catch (e) { }
        map = null;
    }

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    // Default center = South Cotabato
    let center = [MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lng];
    let zoom = 13;
    let customerLat = null;
    let customerLng = null;
    let customerAddress = '';

    // Find active trip (assigned or in_progress)
    const activeTrip = myActiveTrips.find(t => t.status === 'assigned' || t.status === 'in progress');
    if (activeTrip) {
        activeRequestId = activeTrip.request_id;
        customerLat = activeTrip.location_lat || activeTrip.lat;
        customerLng = activeTrip.location_lng || activeTrip.lng;
        customerAddress = activeTrip.location;
        if (customerLat && customerLng) {
            center = [customerLat, customerLng];
            zoom = 15;
        }

        const statusEl = document.getElementById('tracking-status');
        if (statusEl) statusEl.innerHTML = `<p>  Active job #${activeTrip.request_id} – tracking in progress.</p>`;
    } else {
        activeRequestId = null;
        const statusEl = document.getElementById('tracking-status');
        if (statusEl) statusEl.innerHTML = '<p>📍 No active job – waiting for assignment.</p>';
    }

    // Create plain map (no boundaries)
    map = L.map('map').setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    if (customerLat && customerLng) {
        customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<strong>📍 Customer Location</strong><br>${customerAddress || 'Customer'}`)
            .openPopup();
        startGPSTracking(customerLat, customerLng);
    }

    // Always show driver location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                if (!driverMarker) {
                    driverMarker = L.marker([lat, lng], { icon: driverIcon })
                        .addTo(map)
                        .bindPopup('🚗 You are here');
                } else {
                    driverMarker.setLatLng([lat, lng]);
                }
                if (!customerLat) {
                    map.setView([lat, lng], 14);
                }
            },
            () => {
                if (!driverMarker) {
                    driverMarker = L.marker([MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lng], { icon: driverIcon })
                        .addTo(map)
                        .bindPopup('🚗 Driver (location unavailable)');
                }
            }
        );
    }

    console.log('  Map initialized (no boundaries)');
}

// ---------- GPS TRACKING (unchanged) ----------
function startGPSTracking(customerLat, customerLng) {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const driverLat = position.coords.latitude;
            const driverLng = position.coords.longitude;

            if (!driverMarker) {
                driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
                    .addTo(map)
                    .bindPopup('🚗 You (Driver)');
            } else {
                driverMarker.setLatLng([driverLat, driverLng]);
            }

            map.setView([driverLat, driverLng], 16);
            await drawRoute(driverLat, driverLng, customerLat, customerLng);
            sendDriverLocation(driverLat, driverLng);

            if (watchId) navigator.geolocation.clearWatch(watchId);
            watchId = navigator.geolocation.watchPosition(
                (newPos) => onDriverLocationUpdate(newPos, customerLat, customerLng),
                (err) => console.error('GPS error:', err),
                { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
            );
        },
        (err) => {
            console.error('Initial location error:', err);
            watchId = navigator.geolocation.watchPosition(
                (pos) => onDriverLocationUpdate(pos, customerLat, customerLng),
                (err) => console.error('GPS error:', err),
                { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
            );
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function onDriverLocationUpdate(position, customerLat, customerLng) {
    if (!map) return;
    const driverLat = position.coords.latitude;
    const driverLng = position.coords.longitude;

    if (!driverMarker) {
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
            .addTo(map)
            .bindPopup('🚗 You (Driver)');
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
    if (!map) return;

    fromLat = parseFloat(fromLat);
    fromLng = parseFloat(fromLng);
    toLat = parseFloat(toLat);
    toLng = parseFloat(toLng);

    console.log("🗺️ drawRoute coordinates:", {
        fromLat,
        fromLng,
        toLat,
        toLng
    });

    // Validate coordinates
    if (
        !Number.isFinite(fromLat) ||
        !Number.isFinite(fromLng) ||
        !Number.isFinite(toLat) ||
        !Number.isFinite(toLng)
    ) {
        console.error("Invalid route coordinates:", {
            fromLat,
            fromLng,
            toLat,
            toLng
        });
        return;
    }

    // Philippines sanity check for your towing system
    if (
        fromLat < 4 || fromLat > 22 ||
        fromLng < 116 || fromLng > 127 ||
        toLat < 4 || toLat > 22 ||
        toLng < 116 || toLng > 127
    ) {
        console.error("Coordinates are outside the Philippines:", {
            fromLat,
            fromLng,
            toLat,
            toLng
        });
        return;
    }

    try {
        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?overview=full&geometries=geojson`;

        console.log("🛣️ OSRM URL:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`OSRM HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.length) {
            throw new Error(`Routing failed: ${data.code}`);
        }

        const coordinates = data.routes[0].geometry.coordinates;

        const latLngs = coordinates.map(coord => [
            coord[1],
            coord[0]
        ]);

        const distanceKm =
            (data.routes[0].distance / 1000).toFixed(1);

        const durationMin =
            Math.ceil(data.routes[0].duration / 60);

        if (routeLayer) {
            map.removeLayer(routeLayer);
        }

        routeLayer = L.polyline(latLngs, {
            color: '#1D9E75',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);

        if (driverMarker) {
            driverMarker.setPopupContent(`
                <strong>🚗 You (Driver)</strong><br>
                Distance: <strong>${distanceKm} km</strong><br>
                Est. arrival: <strong>${durationMin} min</strong>
            `);
        }

    } catch (err) {

        console.error("Route error:", err);

        if (routeLayer) {
            map.removeLayer(routeLayer);
        }

        // Straight-line fallback
        routeLayer = L.polyline(
            [
                [fromLat, fromLng],
                [toLat, toLng]
            ],
            {
                color: '#888',
                weight: 3,
                dashArray: '8 6',
                opacity: 0.6
            }
        ).addTo(map);
    }
}

async function sendDriverLocation(lat, lng) {
    const now = Date.now();
    if (now - lastSentAt < DRIVER_LOCATION_INTERVAL_MS) return;
    lastSentAt = now;

    const token = sessionStorage.getItem('token');
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

// ---------- REFRESH MAP ----------
function refreshMap() {
    initDriverMap();
    showToast('🔄 Map refreshed');
}
window.refreshMap = refreshMap;

// ---------- UI HELPERS ----------
function displayUserInfo() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    if (!user.name) {
        return;
    }

    const initials = getInitials(user.name);

    const avatarInitials = document.getElementById('avatarInitials');
    const profileName = document.getElementById('profileName');
    const userType = document.getElementById('userType');

    if (avatarInitials) {
        avatarInitials.textContent = initials;
    }

    if (profileName) {
        profileName.textContent = user.name;
    }

    if (userType) {
        userType.textContent = user.role || '🚛 Driver';
    }

    CURRENT_DRIVER.id = user.id;
    CURRENT_DRIVER.name = user.name;
}


function showToast(msg) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.style.cssText = `
        position:fixed; bottom:28px; right:28px;
        background:#0b1a2e; color:#fff;
        padding:14px 24px; border-radius:20px;
        font-size:0.9rem; font-weight:500;
        box-shadow:0 8px 28px rgba(0,0,0,0.15);
        z-index:9999;
        max-width:380px;
        animation: fadeInUp 0.25s ease;
        font-family: inherit;
    `;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(12px)';
        div.style.transition = '0.25s';
        setTimeout(() => div.remove(), 300);
    }, 2800);
}

// ---------- EVENT LISTENERS ----------
function setupEventListeners() {
    // Logout
    // document.getElementById('logoutBtnSidebar')?.addEventListener('click', function() {
    //     if (confirm('Logout?')) {
    //         sessionStorage.clear();
    //         window.location.replace('home');
    //     }
    // });

    // Tab switching with map init
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
            const target = document.getElementById('tab-' + tabId);
            if (target) {
                target.style.display = 'flex';
                if (tabId === 'tracking') {
                    setTimeout(() => {
                        initDriverMap();
                    }, 200);
                }
                if (tabId === 'dashboard' && map) {
                    setTimeout(() => map.invalidateSize(), 100);
                }
            }
        });
    });

    // Search filter
    document.getElementById('dashboardSearch')?.addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#availableRequestsList .request-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    });

    // Clock
    function updateClock() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 10000);
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
    // 1. Keep your existing initialization
    displayUserInfo();
    setupEventListeners();

    // Initial load of driver data
    loadDriverDashboardData().catch(err => {
        console.error('Failed to load dashboard:', err);
    });

    // 2. ADD THIS: The auto-refresh timer
    // This checks for updates from the Admin every 10 seconds
    setInterval(() => {
        loadDriverDashboardData().catch(err => {
            console.error('Auto-refresh failed:', err);
        });
    }, 10000);
});


window.addEventListener('beforeunload', () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
});

async function fetchEarningsSummary() {
    const token = sessionStorage.getItem('token');
    if (!token) return { today: 0, thisWeek: 0, allTime: 0 };

    const res = await fetch(`${API_BASE_URL}/earnings/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to fetch earnings summary: ${res.status} ${body}`);
    }

    return res.json();
}
console.log('🚛 Driver Dashboard loaded with API integration');