
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

const pendingIcon = L.icon({
    iconUrl: 'image/waypoint-yellow.png ',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
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


async function fetchPendingRequests() {
    const token = sessionStorage.getItem('token');

    if (!token) return [];
    try {
        const res = await fetch(`${API_BASE_URL}/requests/pending`, {
            headers: { 'Authorization': `Bearer ${token}` },

            cache: 'no-store'
        });
        // console.log('Pending response status:', res.status);
        const data = await res.json();
        // console.log('Pending data:', data);
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

        // console.log('My trips response status:', res.status);

        if (!res.ok) {
            throw new Error('Failed to fetch my trips');
        }

        const data = await res.json();

        // console.log('MY TRIPS DATA:', data);

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


// ---------- RENDER UI ----------
function renderDashboardUI() {

    console.log(sessionStorage.getItem('token'));

    console.log("Pending:", pendingRequests.length, pendingRequests);
    console.log("Active:", myActiveTrips.length, myActiveTrips);
    console.log("Completed:", completedTrips.length);

    const availableList = document.getElementById('availableRequestsList');
    if (availableList) {
        if (pendingRequests.length === 0) {
            availableList.innerHTML = '<div class="empty-state">No pending requests right now.</div>';
        } else {
            console.log('First pending request raw:', pendingRequests[0]);
            availableList.innerHTML = pendingRequests.map(req => `
                <div class="request-item" data-id="${req.request_id}">
                    <div class="top-line">
                        <span class="customer">${req.customer_name || 'Customer'}</span>
                        <span class="service">${req.service_type || 'Service'}</span>
                    </div>
                    <div class="location">📍 ${req.location || 'No address'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                        <span class="price">₱${req.total_amount || req.amount || 0}</span>
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
        tripsList.innerHTML = myActiveTrips.length === 0
            ? '<div class="empty-state">No active trips</div>'
            : myActiveTrips.map(renderTripCard).join('');
    }

    console.log('First active trip raw:', myActiveTrips[0]);
    document.getElementById('statAvailable').innerText = pendingRequests.length;
    document.getElementById('statActiveTrips').innerText = myActiveTrips.length;
    document.getElementById('pendingCount').innerText = pendingRequests.length;
    document.getElementById('activeCount').innerText = myActiveTrips.length;
    document.getElementById('statCompleted').innerText = completedTrips.length;
    //    const todayEarnings = completedTrips.reduce((sum, t) => sum + Number(t.total_amount || t.amount || 0), 0);
    document.getElementById('statEarnings').innerText = `₱${todayEarnings}`;
    document.getElementById('statEarnings').innerText = `₱${todayEarnings.toFixed(2)}`;

    // Other tabs
    const totalTrips = document.getElementById('totalTripsCount');
    if (totalTrips) totalTrips.innerText = completedTrips.length + myActiveTrips.length;
    const totalEarnings = document.getElementById('totalEarnings');
    if (totalEarnings) totalEarnings.innerText = `₱${todayEarnings}`;

    const totalEarningsEl = document.getElementById('totalEarnings');
    if (totalEarningsEl) totalEarningsEl.innerText = `₱${totalEarningsValue.toFixed(2)}`;


    // NEW: "All Trips" tab — active + completed
    const allTripsList = document.getElementById('allTripsList');
    if (allTripsList) {
        const allTrips = [...myActiveTrips, ...completedTrips];
        allTripsList.innerHTML = allTrips.length === 0
            ? '<div class="empty-state">No trips yet</div>'
            : allTrips.map(renderTripCard).join('');
    }

    renderPendingRequests();
};
// existing dashboard "On Going Job" — active trips only

function renderTripCard(trip) {
    const isActive = ['assigned', 'in progress'].includes(trip.status);
    return `
    <div class="request-item">
        <div class="top-line">
            <span class="customer">${trip.customer_name || 'Customer'}</span>
            <span class="service">${trip.service_type || 'Service'}</span>
        </div>
        <div class="location">📍 ${trip.location || 'No address'}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
            <span class="status-badge ${trip.status}">${trip.status}</span>
            <span class="price">₱${trip.total_amount || trip.amount || 0}</span>
        </div>
        <div class="actions">
            ${isActive
            ? `<button class="btn btn-success btn-sm" onclick="confirmCompleteTrip(${trip.request_id})">✓ Complete</button>`
            : ''}

            ${isActive
            ? `<button class="btn btn-secondary btn-sm" onclick="openAddChargeForm(${trip.request_id})">+ Add Charge</button>`
            : ''}

            ${isActive
            ? `<button class="btn btn-danger btn-sm" onclick="confirmCancelTrip(${trip.request_id})">Cancel</button>`
            : ''}
        </div>

        ${isActive ? `
        <div id="addChargeForm-${trip.request_id}" style="display:none; margin-top:8px;">
            <input type="text" id="chargeDescription-${trip.request_id}" placeholder="e.g. Replacement battery">
            <input type="number" id="chargeAmount-${trip.request_id}" placeholder="Amount" min="0" step="0.01">
            <button type="button" onclick="submitAdditionalCharge(${trip.request_id})">Submit</button>
            <button type="button" onclick="closeAddChargeForm(${trip.request_id})">Cancel</button>
        </div>
        ` : ''}
    </div>`;
}
function confirmCompleteTrip(requestId) {
    // single confirm — just call straight through
    updateTripStatus(requestId, 'completed');
}

function confirmCancelTrip(requestId) {
    if (confirm('Cancel this trip? This cannot be undone.')) {
        cancelTrip(requestId);
    }
}
function openAddChargeForm(requestId) {
    const form = document.getElementById(`addChargeForm-${requestId}`);
    if (!form) return;
    form.style.display = 'block';
}

function closeAddChargeForm(requestId) {
    const form = document.getElementById(`addChargeForm-${requestId}`);
    if (!form) return;
    form.style.display = 'none';

    const desc = document.getElementById(`chargeDescription-${requestId}`);
    const amount = document.getElementById(`chargeAmount-${requestId}`);
    if (desc) desc.value = '';
    if (amount) amount.value = '';
}

async function submitAdditionalCharge(requestId) {
    const descEl = document.getElementById(`chargeDescription-${requestId}`);
    const amountEl = document.getElementById(`chargeAmount-${requestId}`);

    const description = descEl.value.trim();
    const amount = Number(amountEl.value);

    if (!description || !Number.isFinite(amount) || amount <= 0) {
        alert('Enter a valid description and amount.');
        return;
    }

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('Please log in again.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/charges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ description, amount })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.error || data.message || 'Failed to add charge.');
            return;
        }

        showToast(`Charge added: ₱${amount.toFixed(2)}`);
        closeAddChargeForm(requestId);

        // Refresh so total_amount reflects the new charge everywhere
        await loadDriverDashboardData();

    } catch (error) {
        console.error('Add charge error:', error);
        alert('Failed to add charge.');
    }
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
    if (!newStatus) return;


    await loadDriverDashboardData();

    // 2. Look up in the FRESH array
    const trip = myActiveTrips.find(t => Number(t.request_id) === Number(requestId));
    if (!trip) {
        alert('This trip is no longer assigned to you.');
        renderDashboardUI();
        return;
    }

    const statusOrder = { 'assigned': 1, 'in progress': 2, 'completed': 3 };
    const currentStatus = trip.status;

    if (statusOrder[newStatus] && statusOrder[currentStatus] && statusOrder[newStatus] < statusOrder[currentStatus]) {
        alert(`You cannot change the status from "${currentStatus}" back to "${newStatus}".`);
        renderDashboardUI();
        return;
    }

    if (!confirm(`Change request #${requestId} from "${currentStatus}" to "${newStatus}"?`)) {
        renderDashboardUI();
        return;
    }

    try {
        // Build the body ONCE, including actualDistanceKm when completing
        const body = { status: newStatus };
        if (newStatus === 'completed' && Number.isFinite(window.lastKnownDistanceKm)) {
            body.actualDistanceKm = window.lastKnownDistanceKm;
        }

        const res = await fetch(
            `${API_BASE_URL}/requests/${requestId}/status`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)   // ← single request, carries actualDistanceKm when relevant
            }
        );

        const data = await res.json();

        if (!res.ok) {
            if (res.status === 403) {
                showToast('This trip is no longer assigned to you.', 'error');
                await loadDriverDashboardData();
                renderDashboardUI();
                return;
            }
            if (res.status === 404) {
                showToast('Request not found.', 'error');
                await loadDriverDashboardData();
                return;
            }
            throw new Error(data.error || data.message || 'Status update failed');
        }

        showToast(`Status updated to ${newStatus}`);
        await loadDriverDashboardData();

        if (newStatus === 'completed') {
            if (Number(activeRequestId) === Number(requestId)) {
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
                if (document.getElementById('tab-tracking') && document.getElementById('tab-tracking').style.display !== 'none') {
                    initDriverMap();
                }
            }
            // NO second fetch here — already sent above
        } else {
            if (document.getElementById('tab-tracking') && document.getElementById('tab-tracking').style.display !== 'none') {
                initDriverMap();
            }
        }

    } catch (err) {
        console.error('Status update error:', err);
        alert('Error updating status: ' + err.message);
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

    setTimeout(() => {
        if (typeof map !== 'undefined' && map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
        }
    }, 300);

    window.addEventListener('resize', () => {

        if (typeof map !== 'undefined' && map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
        }
    });
    if (customerLat && customerLng) {
        const customerName = activeTrip.customer_name || 'Customer';

        customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<strong>📍 ${customerName}</strong><br>${customerAddress || 'Customer location'}`)
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
                        .bindPopup('You are here');
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
                        .bindPopup(' Driver (location unavailable)');
                }
            }
        );
    }

    console.log('  Map initialized (no boundaries)');
    renderPendingRequests();
    console.log('Map initialized (no boundaries)');
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
                    .bindPopup(' You (Driver)');
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

    const user = JSON.parse(sessionStorage.getItem("user") || '{}');
    const driverName = user.name || 'Customer';
    if (!driverMarker) {
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
            .addTo(map)
            .bindPopup(driverName);
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

        const user = JSON.parse(sessionStorage.getItem("user") || '{}');
        const driverName = user.name || 'Customer';
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

        const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
        const durationMin = Math.ceil(data.routes[0].duration / 60);
        window.lastKnownDistanceKm = Number(distanceKm);
        // NEW — send the estimate to the backend, fire-and-forget
        if (window.activeRequestId) {
            fetch(`/api/requests/${window.activeRequestId}/route-estimate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distanceKm: Number(distanceKm), durationMin })
            }).catch(err => console.warn('Failed to save route estimate (non-fatal):', err));
        }

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
                <strong>${driverName}</strong><br>
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
    showToast('Map refreshed');
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
        userType.textContent = user.role || 'Driver';
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
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;

            // hide all tabs
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

            // show selected
            document.getElementById('tab-' + tab)?.classList.add('active');
            item.classList.add('active');

            // If opening the tracking tab and map isn't ready, init it
            if (tab === 'tracking') {
                if (typeof map === 'undefined' || !map) {
                    initDriverMap();
                } else {
                    setTimeout(() => map.invalidateSize(), 150);
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


}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
    // 1. Keep your existing initialization
    displayUserInfo();
    setupEventListeners();
    // renderTripCard();

    // Initial load of driver data
    loadDriverDashboardData().catch(err => {
        console.error('Failed to load dashboard:', err);
    });

    // 2. ADD THIS: The auto-refresh timer
    // This checks for updates from the Admin every 10 seconds
    setInterval(() => {
        loadDriverDashboardData().catch(err => console.error(err));

        // Pause the payment-list refresh if ANY add-charge form is currently open
        const anyFormOpen = Array.from(
            document.querySelectorAll('#paymentHistory [id^="addChargeForm-"], #paymentHistory .add-charge-form')
        ).some(el => el.style.display === 'block');

        if (!anyFormOpen) {
            loadPaymentHistory().catch(err => console.error(err));
        }
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

let pendingLayer = null;

function renderPendingRequests() {
    if (!map) return;

    if (pendingLayer) {
        map.removeLayer(pendingLayer);
        pendingLayer = null;
    }

    if (!Array.isArray(pendingRequests) || !pendingRequests.length) return;

    pendingLayer = L.layerGroup().addTo(map);

    pendingRequests.forEach(req => {
        const lat = Number(req.location_lat ?? req.lat);
        const lng = Number(req.location_lng ?? req.lng);

        if (!isFinite(lat) || !isFinite(lng)) {
            console.warn('Pending request has no usable coords:', req.request_id, req);
            return;
        }

        L.marker([lat, lng], { icon: pendingIcon })
            .bindPopup(`
                <strong>Request #${req.request_id}</strong><br>
                ${req.customer_name || 'Customer'}<br>
                <span style="color:#5c728b">${req.service_type || ''} ${req.vehicle_type ? '· ' + req.vehicle_type : ''}</span><br>
                📍 ${req.location || 'No address'}<br>
                <span class="price">₱${req.total_amount || req.amount || 0}</span>
                <button onclick="acceptJob(${req.request_id})" style="margin-top:6px">Accept</button>
            `)
            .addTo(pendingLayer);
    });

    console.log('Pending markers drawn:', pendingLayer.getLayers().length);
}
async function confirmCashReceived(paymentId) {

    const confirmed = confirm(
        'Confirm that you received cash payment from the customer?'
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('Please log in again.');
        return;
    }

    try {

        const response = await apiFetch(
            `${API_BASE_URL}/payments/${paymentId}/cash-received`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || 'Unable to confirm cash payment.');
            return;
        }

        alert(`Cash payment confirmed. Receipt: ${data.receipt_number}`);

        // refresh whatever list/view shows this driver's active requests
        loadDriverRequests();

    } catch (error) {
        console.error('Cash confirmation error:', error);
        alert('Unable to confirm cash payment.');
    }
}
async function loadPaymentHistory() {

    const token = sessionStorage.getItem('token');
    const container = document.getElementById('paymentHistory');

    if (!token || !container) return;

    try {

        const response = await fetch(`${API_BASE_URL}/payments/driver/mine`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const payments = await response.json();

        if (!payments || payments.length === 0) {
            container.innerHTML = `<div class="empty-state">No payments yetsasa</div>`;
            return;
        }

        container.innerHTML = payments.map(p => `
    <div class="payment-item">
        <div class="payment-info">
            <strong>#${p.request_id}</strong>
            <span>₱${Number(p.amount || 0).toFixed(2)}</span>
            <span class="status-badge status-${p.status}">${p.status}</span>
            <span>${p.payment_method}</span>
        </div>
        ${p.payment_method === 'cash' && p.status === 'awaiting_cash'
                ? `<button class="btn-primary" onclick="confirmCashReceived(${p.payment_id})">
                   Mark Cash Received
               </button>`
                : ''}
    </div>
`).join('');

    } catch (error) {
        console.error('Failed to load payment history:', error);
        container.innerHTML = `<div class="empty-state">Failed to load payments</div>`;
    }
}
function openAddChargeForm(paymentId) {
    const form = document.getElementById(`addChargeForm-${paymentId}`);
    if (!form) return;
    form.style.display = 'block';
}

function closeAddChargeForm(paymentId) {
    const form = document.getElementById(`addChargeForm-${paymentId}`);
    if (!form) return;
    form.style.display = 'none';

    const desc = document.getElementById(`chargeDescription-${paymentId}`);
    const amount = document.getElementById(`chargeAmount-${paymentId}`);
    if (desc) desc.value = '';
    if (amount) amount.value = '';
}

async function confirmCashReceived(paymentId) {

    const confirmed = confirm(
        'Confirm that you received cash payment from the customer?'
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('Please log in again.');
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/${paymentId}/cash-received`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || 'Unable to confirm cash payment.');
            return;
        }

        alert(`Cash payment confirmed. Receipt: ${data.receipt_number}`);

        loadPaymentHistory();

    } catch (error) {
        console.error('Cash confirmation error:', error);
        alert('Unable to confirm cash payment.');
    }
}

console.log('Driver Dashboard loaded with API integration');