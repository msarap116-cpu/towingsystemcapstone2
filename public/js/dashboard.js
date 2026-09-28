// dashboard.js

const POLL_INTERVAL_MS = 30000;
async function fetchWithRetry(url, options, retries = 1) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
            if (i === retries) return res;
        } catch (e) {
            if (i === retries) throw e;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
}
//==================================================================map gelocation=====================================================
let map = null;
let customerMarker = null;
let driverMarker = null;
let routeLayer = null;
let pollingInterval = null;
let latestRequestId = null;
let latestRequestData = null;

let addressSearchTimeout = null;
let addressSearchController = null;

let myLocationMarker = null;

const GEO_API_BASE = 'https://goodwrench-towing-rescue.onrender.com';
const GEO_HEADERS = { Accept: 'application/json' };

const MAP_CONFIG = {
    bounds: {
        southWest: { lat: 6.0, lng: 124.4 },
        northEast: { lat: 6.7, lng: 125.1 }
    },
    minZoom: 10,
    maxZoom: 18,
    boundsViscosity: 1.0
};

const driverIcon = L.icon({
    iconUrl: 'image/waypoint-red.png',
    iconSize: [36, 36],                      // match your old circle size
    iconAnchor: [18, 36],                    // tip points to the coordinate
    popupAnchor: [0, -36]
});

// CUSTOMER ICON
const customerIcon = L.icon({
    iconUrl: 'image/waypoint-blue.png',      // your blue icon
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

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
};

// ONE function owns the fetch now
async function loadLatestRequests() {
    try {
        const data = await apiFetch('/requests/latest');
        const activities = Array.isArray(data) ? data : [data];

        // Feed the recent-activity list
        renderRecentActivity(activities);

        // Feed the map with just the newest request
        await updateMapFromRequest(activities[0]);

    } catch (err) {
        console.error('Failed to load latest requests:', err);
    }
}
// Extracted from the old loadUserMap() — now takes data instead of fetching it
async function updateMapFromRequest(request) {

    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    const user = JSON.parse(sessionStorage.getItem("user") || '{}');
    const customerName = user.name || 'Customer';

    if (!request) {
        console.warn('No active request found.');
        return;
    }

    latestRequestId = request.request_id;
    latestRequestData = request;

    updateRequestBadge(request);

    if (request.status === 'completed' || request.status === 'cancelled') {
        console.log(`Request #${request.request_id} is ${request.status}.`);

        if (request.status === 'cancelled') {
            latestRequestData = null;
        }

        if (map) {
            map.remove();
            map = null;
        }
        customerMarker = null;
        driverMarker = null;
        routeLayer = null;
        return;
    }

    if (request.location_lat == null || request.location_lng == null) {
        console.warn('No customer location data on request.');
        return;
    }

    const customerLat = parseFloat(request.location_lat);
    const customerLng = parseFloat(request.location_lng);

    if (Number.isNaN(customerLat) || Number.isNaN(customerLng)) {
        console.error('Invalid customer coordinates.');
        return;
    }

    // Create the map only once
    if (!map) {
        map = L.map('map').setView([customerLat, customerLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<strong>📍 ${customerName}</strong><br>${request.address || 'Your requested location'}`)
            .openPopup();

        setTimeout(() => { if (map) map.invalidateSize(); }, 100);
    }

    if (request.driver_lat != null && request.driver_lng != null) {
        await showDriverOnMap(
            parseFloat(request.driver_lat),
            parseFloat(request.driver_lng),
            customerLat,
            customerLng
        );
    }

    // Restart driver-location polling now that we have a confirmed active request
    pollingInterval = setInterval(() => pollDriverLocation(), POLL_INTERVAL_MS);
};

// ---------- REFRESH MAP ----------
function refreshMap() {
    loadLatestRequests();  // ← was loadUserMap()
    showToast('Map refreshed');
}
window.refreshMap = refreshMap;

function showTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.hidden = true;
    });

    const activePanel = document.getElementById(tabId);
    if (activePanel) {
        activePanel.hidden = false;

        // If the panel we just revealed contains the map, tell Leaflet to recalc size
        if (activePanel.querySelector('#map') && window.map) {
            setTimeout(() => window.map.invalidateSize(), 100);
        }
    }
}


//getting the locations of the driver from the driver area

async function pollDriverLocation() {
    const token = sessionStorage.getItem('token');

    if (!token) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            console.error('Polling failed:', res.status);
            return;
        }

        const data = await res.json();

        // Important: latest endpoint returns an array.
        const request = Array.isArray(data) ? data[0] : data;

        if (!request) {
            return;
        }

        // Keep the current request data updated.
        latestRequestId = request.request_id;
        latestRequestData = request;

        updateRequestBadge(request);

        if (
            request.status === 'completed' ||
            request.status === 'cancelled'
        ) {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }

            if (request.status === 'cancelled') {
                latestRequestData = null;
            }

            if (map) {
                map.remove();
                map = null;
            }

            customerMarker = null;
            driverMarker = null;
            routeLayer = null;

            return;
        }

        if (
            request.location_lat == null ||
            request.location_lng == null
        ) {
            return;
        }

        const customerLat = parseFloat(request.location_lat);
        const customerLng = parseFloat(request.location_lng);

        // Driver may not have accepted yet.
        if (
            request.driver_lat == null ||
            request.driver_lng == null
        ) {
            console.log('Driver has not sent a location yet.');
            return;
        }

        const driverLat = parseFloat(request.driver_lat);
        const driverLng = parseFloat(request.driver_lng);

        if (
            Number.isNaN(driverLat) ||
            Number.isNaN(driverLng)
        ) {
            return;
        }

        // This updates or creates the driver marker.
        showDriverOnMap(
            driverLat,
            driverLng,
            customerLat,
            customerLng
        );

    } catch (err) {
        console.error('Poll error:', err);
    }
}

// Show driver on map and draw route
async function showDriverOnMap(driverLat, driverLng, customerLat, customerLng) {
    // Pull driver info from the latest request data
    const driverName = latestRequestData?.driver_name || 'Driver';
    const driverPhone = latestRequestData?.driver_phone || '';
    const vehicleType = latestRequestData?.vehicle_type || '';
    const plate = latestRequestData?.license_plate || '';

    // Build popup HTML once
    const popupHtml = `
        <strong>🚗 ${driverName}</strong><br>
        ${vehicleType ? `${vehicleType}` : ''}
        ${plate ? ` • ${plate}` : ''}
        ${driverPhone ? `<br>📞 ${driverPhone}` : ''}
        <br><em>On the way</em>
    `;

    if (!driverMarker) {
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
            .addTo(map)
            .bindPopup(buildDriverPopup());
    } else {
        driverMarker.setLatLng([driverLat, driverLng]);
        driverMarker.setPopupContent(buildDriverPopup());
    }

    const distance = calculateDistance(driverLat, driverLng, customerLat, customerLng);
    if (parseFloat(distance) > 0.05) { // 0.05 km = 50 meters
        const bounds = L.latLngBounds(
            [driverLat, driverLng],
            [customerLat, customerLng]
        );
        map.fitBounds(bounds, { padding: [60, 60] });
    } else {
        map.setView([customerLat, customerLng], 16);
    }

    await drawRoute(driverLat, driverLng, customerLat, customerLng);
}

//draw route in the map
async function drawRoute(fromLat, fromLng, toLat, toLng) {
    try {
        console.log('drawRoute inputs:', { fromLat, fromLng, toLat, toLng });

        const url = `https://router.project-osrm.org/route/v1/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?overview=full&geometries=geojson&steps=true`;

        console.log('OSRM URL:', url);

        const response = await fetch(url);
        console.log('OSRM HTTP status:', response.status);

        const data = await response.json();
        console.log('OSRM response:', data);

        if (data.code !== 'Ok') throw new Error('Routing failed: ' + data.code);
        // ... rest unchanged

        // Extract route coordinates
        const coordinates = data.routes[0].geometry.coordinates;
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

        // Calculate distance and duration
        const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
        const durationMin = Math.ceil(data.routes[0].duration / 60);

        // NEW — push real ETA into the badge
        const etaEl = document.getElementById('etaDisplay');
        if (etaEl) {
            etaEl.style.display = '';
            etaEl.textContent = `ETA ${durationMin} min`;
        }

        // Update or create route layer
        if (routeLayer) map.removeLayer(routeLayer);

        routeLayer = L.polyline(latLngs, {
            color: '#1D9E75',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(map);


        if (driverMarker) {
            driverMarker.setPopupContent(buildDriverPopup({ distanceKm, durationMin }));
        }

        const midPoint = getMidpoint(fromLat, fromLng, toLat, toLng);
        const routeSummary = L.popup()
            .setLatLng(midPoint)
            .setContent(`🚗 ${distanceKm} km · ⏱️ ${durationMin} min`)
            .openOn(map);

        // Auto-close the summary after 5 seconds
        setTimeout(() => map.closePopup(routeSummary), 5000);

    } catch (err) {
        console.error('Route drawing failed:', err);


        if (routeLayer) map.removeLayer(routeLayer);

        routeLayer = L.polyline(
            [[fromLat, fromLng], [toLat, toLng]],
            { color: '#888', weight: 3, dashArray: '8 6', opacity: 0.6 }
        ).addTo(map);

        // Calculate straight-line distance as fallback
        const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng);

        if (driverMarker) {
            driverMarker.setPopupContent(buildDriverPopup({ straightDistance }));
        }
        const etaEl = document.getElementById('etaDisplay');
        if (etaEl) {
            etaEl.style.display = '';
            etaEl.textContent = `~${straightDistance} km away`; // no reliable ETA without routing
        }

        if (driverMarker) {
            driverMarker.setPopupContent(buildDriverPopup({ straightDistance }));
        }

    }
}
//calculate the distance
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

function getMidpoint(lat1, lng1, lat2, lng2) {
    return [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
}

function initRecenterButton() {
    const btn = document.getElementById('recenterMapBtn');
    if (!btn) return;
    btn.addEventListener('click', handleRecenterClick);
}
const myLocationIcon = L.icon({
    iconUrl: 'image/waypoint-blue.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});
function handleRecenterClick() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    const btn = document.getElementById('recenterMapBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Locating…';

    // Get the customer name the same way displayUserInfo() does
    const user = JSON.parse(sessionStorage.getItem("user") || '{}');
    const customerName = user.name || 'You';
    const popupText = `<b>${customerName}</b><br>You are here`;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            btn.disabled = false;
            btn.textContent = originalText;

            const { latitude, longitude } = position.coords;

            if (map) {
                map.setView([latitude, longitude], 16);

                if (myLocationMarker) {
                    myLocationMarker.setLatLng([latitude, longitude]);
                    myLocationMarker.setPopupContent(popupText);
                } else {
                    myLocationMarker = L.marker([latitude, longitude], { icon: myLocationIcon })
                        .addTo(map)
                        .bindPopup(popupText);
                }
            } else {
                const mapDiv = document.getElementById('map');
                if (!mapDiv) return;

                mapDiv.innerHTML = '';

                map = L.map('map').setView([latitude, longitude], 16);

                L.tileLayer(
                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    {
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 19
                    }
                ).addTo(map);

                myLocationMarker = L.marker([latitude, longitude], { icon: myLocationIcon })
                    .addTo(map)
                    .bindPopup(popupText)
                    .openPopup();
            }
        },
        (error) => {
            btn.disabled = false;
            btn.textContent = originalText;

            let msg = 'Unable to get your location.';
            if (error.code === error.PERMISSION_DENIED) {
                msg = 'Location permission denied. Please enable location access in your browser settings.';
            } else if (error.code === error.TIMEOUT) {
                msg = 'Location request timed out. Please try again.';
            }
            alert(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Call this once on page load
initRecenterButton();
function updateRequestBadge(request) {
    const trackingEl = document.getElementById('trackingIdDisplay');
    const statusEl = document.getElementById('requestStatusBadge');
    const etaEl = document.getElementById('etaDisplay');

    if (trackingEl && request?.request_id) {
        trackingEl.textContent = `request ID  ${request.request_id}`;
    }

    if (statusEl && request?.status) {
        // Map raw status values to display labels
        const statusLabels = {
            pending: 'Searching for driver',
            accepted: 'Driver on the way',
            in_transit: 'In Transit',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        statusEl.textContent = statusLabels[request.status] || request.status;
    }

    // Only show ETA once a driver is actually assigned
    if (etaEl) {
        const hasDriver = !!(request?.driver_lat && request?.driver_lng);
        if (!hasDriver) {
            etaEl.style.display = 'none';
            etaEl.textContent = '';
        } else {
            etaEl.style.display = '';
            // leave text as-is here; drawRoute() will fill in the real minutes
        }
    }
}
//======================================================= display user/driver =================================================

//display the user info in the sidebar
function displayUserInfo() {
    const user = JSON.parse(sessionStorage.getItem("user") || '{}');
    if (!user) return;

    const profileName = document.getElementById('profileName');
    const userType = document.getElementById('userType');

    if (profileName) profileName.textContent = user.name || 'User';
    if (userType) userType.textContent = user.role || 'Customer';
}

//gets the request that the user made in the backend
async function loadRecentActivity() {
    try {
        const activities = await apiFetch('/requests/latest');

        // console.log("Recent activities:", activities);

        renderRecentActivity(activities);
        emergencyBtn
    } catch (err) {
        console.error("Failed to load recent activity:", err);
    }
}
//loads the recent activity in the table or fron end
function renderRecentActivity(activities) {
    const container = document.getElementById("recentHistoryList");

    if (!container) return;

    if (!Array.isArray(activities) || activities.length === 0) {
        container.innerHTML = `
            <div class="history-item">
                No recent activity
            </div>
        `;
        return;
    }

    const cancellableStatuses = ["pending", "assigned", 'in progress'];

    container.innerHTML = activities.map(a => {
        const statusNormalized = (a.status || "").toLowerCase().trim();
        const canCancel = cancellableStatuses.includes(statusNormalized);

        return `
            <div class="history-item">
                <strong>#${a.request_id}</strong>
                <span>${a.service_type || "Service Request"}</span>
                <span>${a.status || "Unknown"}</span>
                ${canCancel ? `
                    <button class="btn btn-danger btn-sm" onclick="cancelRequest(${a.request_id})">
                        Cancel
                    </button>
                ` : ""}
            </div>
        `;
    }).join("");
}
//cancel request
window.cancelRequest = async function (requestId) {
    const token = sessionStorage.getItem('token');
    if (!token) {
        alert('Please log in again.');
        return;
    }
    const confirmed = confirm('Are you sure you want to cancel this request?');
    if (!confirmed) return;
    try {
        const res = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: 'Cancelled by customer' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancel failed');

        console.log('cancelation done:', data);


        showToast(`Request #${requestId} cancelled.`);

        // Refresh the recent activity table
        await loadRecentActivity();

        // Refresh other dashboard components if needed
        // await loadDashboardData();
    } catch (err) {
        console.error('Cancel error:', err);
        alert('Error cancelling request: ' + err.message);
    }
};

document.addEventListener("DOMContentLoaded", () => {

    loadDashboardData(); // Make sure this function exists in your dashboard.js or app.js
    loadLatestRequests();
    displayUserInfo();

    // This keeps the customer view updated when the admin changes something
    setInterval(() => {
        loadDashboardData(true); // Use the "silent" version to avoid flickering
        loadRecentActivity();
    }, 5000);

    // Clock
    function updateClock() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 10000);


    const gcashForm = document.getElementById('gcashProofForm');
    const paymentMessage = document.getElementById('paymentMessage');

    gcashForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const requestId = document.getElementById('gcashRequestId').value;
        const referenceNumber = document.getElementById('gcashReferenceNumber').value.trim();
        const fileInput = document.getElementById('gcashProofImage');

        if (!requestId) {
            if (paymentMessage) paymentMessage.textContent = 'Missing request ID.';
            return;
        }

        if (!referenceNumber) {
            if (paymentMessage) paymentMessage.textContent = 'Please enter the GCash reference number.';
            return;
        }

        if (!fileInput.files.length) {
            if (paymentMessage) paymentMessage.textContent = 'Please upload a receipt image.';
            return;
        }

        await submitProofOfPayment(
            requestId,
            referenceNumber,
            fileInput
        );
    });
});

//======================================== declarations getElementById ==========================================================
const editAddressSection = document.getElementById('editAddressSection');
const editAddressSidebarBtn = document.getElementById('editAddressNavBtn');
const closeEditModalBtn = document.getElementById('closeModalBtn');
const saveEditAddressBtn = document.getElementById('saveAddressBtn');
const editAddressInput = document.getElementById('editAddressInput');

const emergencyBtn = document.getElementById('emergencyRequestBtn');
const newRequestModal = document.getElementById('newRequestModal');
const closeNewRequestBtn = document.getElementById('closeNewRequestBtn');
const cancelNewRequestBtn = document.getElementById('cancelNewRequestBtn');

const addressSuggestions = document.getElementById('addressSuggestions');
const editLocationLat = document.getElementById('editLocationLat');
const editLocationLng = document.getElementById('editLocationLng');
const selectedLocationInfo = document.getElementById('selectedLocationInfo');

const useCurrentEditLocationBtn = document.getElementById('useCurrentEditLocationBtn');



//payments
const paymentNavBtn = document.getElementById('paymentNavBtn');
const paymentModal = document.getElementById('paymentSection');
const gcashPaymentSection = document.getElementById('gcashPaymentSection');
const closePaymentModal = document.getElementById('closePaymentModal');
const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
const paymentRequestId = document.getElementById('paymentRequestId');
const paymentAmount = document.getElementById('paymentAmount');
const paymentMessage = document.getElementById('paymentMessage');


//============================================================= payment section ======================================================
function closePaymentModalFunction(event) {
    console.log('Closing ONLY GCash payment section');

    // Stop this click from reaching the payment-section/tab handler
    event.stopPropagation();
    event.preventDefault();

    if (gcashPaymentSection) {
        gcashPaymentSection.style.display = 'none';
        console.log('GCash section hidden');
    } else {
        console.error('gcashPaymentSection NOT FOUND');
    }
}
const paymentMethodButtons =
    document.querySelectorAll(
        '.payment-method-btn'
    );

if (paymentNavBtn) {

    paymentNavBtn.addEventListener(
        'click',
        () => {
            openPaymentModal();
        }
    );
}
function openPaymentModal(requestId) {

    console.log(
        'Opening payment modal for request:',
        requestId
    );

    if (!paymentModal) return;

    paymentModal.classList.add('show');

    paymentMessage.textContent = '';

    loadPaymentRequestInfo(requestId);
}
function closePaymentModalFunction() {
    console.log('Closing GCash payment section dfdf');

    if (gcashPaymentSection) {
        gcashPaymentSection.style.display = 'none';
    }
};
if (closePaymentModal) {

    closePaymentModal.addEventListener(
        'click',
        closePaymentModalFunction
    );
    console.log('closepaymentmodafunction is hit')
}
if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        gcashPaymentSection.style.display = 'none';
    });
}
async function loadMyPayments() {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/payments/mine`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const payments = await response.json();

        console.log('Loaded payments:', payments);

        // TODO: render `payments` into whatever list/table element
        // shows payment history on the dashboard

    } catch (error) {
        console.error('Failed to load payments:', error);
    }
}
//loads the payment info
function loadPaymentRequestInfo() {
    if (!latestRequestData) {
        paymentRequestId.textContent = '--';
        paymentAmount.textContent = '₱0.00';
        paymentMessage.textContent = 'No payment is currently available.';
        return;
    }

    paymentRequestId.textContent = latestRequestData.request_id;

    const amount = Number(latestRequestData.total_amount ?? latestRequestData.amount);

    if (amount <= 0) {
        paymentAmount.textContent = 'Not yet assigned';
        paymentMessage.textContent = 'The service fee has not been assigned yet.';
        return;
    }

    paymentAmount.textContent = `₱${amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2
    })}`;
}


paymentMethodButtons.forEach(button => {
    console.log(
        'Payment button found:',
        button.dataset.method
    );
    button.addEventListener('click', async () => {
        console.log(
            'PAYMENT BUTTON CLICKED:',
            button.dataset.method
        );

        if (!latestRequestData || !latestRequestData.request_id) {
            paymentMessage.textContent =
                'No service request is available for payment.';
            return;
        }

        const method = button.dataset.method;
        console.log(
            'Selected payment method:',
            method
        );

        await processPaymentMethod(method, latestRequestData.request_id);
    });
});

//selecting and displaying the payment method dal a imo ankol
async function processPaymentMethod(method, requestId) {
    console.log('processPaymentMethod() called:', method);
    console.log('Payment request ID:', requestId);

    if (!requestId) {
        paymentMessage.textContent =
            'No service request is available for payment.';
        return;
    }

    const token = sessionStorage.getItem('token');

    if (!token) {
        paymentMessage.textContent =
            'Please log in again.';
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/payments/request/${requestId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                'Failed to check payment status.'
            );
        }

        const payment = data.payment;

        console.log('Existing payment:', payment);

        // =========================
        // CASH PAYMENT
        // =========================
        if (method === 'cash') {

            if (payment) {

                if (payment.status === 'completed') {
                    paymentMessage.textContent =
                        'This request has already been paid.';
                    return;
                }

                if (payment.status === 'awaiting_cash') {
                    paymentMessage.textContent =
                        'Cash payment is selected. Please pay the driver.';
                    return;
                }

                if (payment.status === 'refunded') {
                    paymentMessage.textContent =
                        'This payment was refunded.';
                    return;
                }
            }

            await selectCashPayment(requestId);
            return;
        }

        // =========================
        // GCASH PAYMENT
        // =========================
        if (method === 'gcash') {

            if (payment) {

                if (payment.status === 'awaiting_payment') {
                    await startGCashPayment(requestId);
                    return;
                }

                if (payment.status === 'pending') {
                    paymentMessage.textContent =
                        'Proof was already submitted and is awaiting verification.';
                    return;
                }

                if (payment.status === 'completed') {
                    paymentMessage.textContent =
                        'This request has already been paid.';
                    return;
                }

                if (payment.status === 'failed') {
                    paymentMessage.textContent =
                        'Your previous proof was rejected. You may submit proof again.';

                    await startGCashPayment(requestId);
                    return;
                }

                if (payment.status === 'refunded') {
                    paymentMessage.textContent =
                        'This payment was refunded.';
                    return;
                }
            }

            // No GCash payment yet
            await startGCashPayment(requestId);
        }

    } catch (error) {

        console.error(
            'Payment status check failed:',
            error
        );

        paymentMessage.textContent =
            error.message ||
            'Unable to check payment status.';
    }
}
//function for paying in gcash
async function startGCashPayment(requestId) {
    const token = sessionStorage.getItem('token');

    try {
        const response = await fetch(
            `${API_BASE_URL}/payments/gcash/start`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_id: requestId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to start payment.'
            );
        }

        const payment = data.payment;

        if (payment.status === 'completed') {
            paymentMessage.textContent =
                'This request has already been paid.';
            return;
        }

        if (payment.status === 'pending') {
            paymentMessage.textContent =
                'Proof was already submitted and is awaiting verification.';
            return;
        }

        document.getElementById('gcashRequestId').value =
            payment.request_id;

        document.getElementById('gcashPaymentSection')
            .style.display = 'block';

        paymentMessage.textContent =
            'Pay the displayed amount through GCash, then upload your receipt.';

    } catch (error) {
        console.error('Start GCash payment error:', error);
        paymentMessage.textContent = error.message;
    }
}

//submitting proof to admin
async function submitProofOfPayment(requestId, referenceNumber, fileInput) {

    const token = sessionStorage.getItem('token');

    const formData = new FormData();
    formData.append('request_id', requestId);
    formData.append('reference_number', referenceNumber);
    formData.append('proof_image', fileInput.files[0]);

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/gcash/submit-proof`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            }
        );

        const data = await response.json();

        paymentMessage.textContent = data.message;

        if (data.success) {
            document.getElementById('gcashPaymentSection').style.display = 'none';
        }

    } catch (error) {
        console.error('Proof submission error:', error);
        paymentMessage.textContent = 'Unable to submit proof of payment.';
    }
}
async function selectCashPayment(requestId) {

    const confirmed = confirm(
        'Do you want to pay in cash to the driver?'
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem('token');

    if (!token) {
        paymentMessage.textContent =
            'Please log in again.';
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/cash`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },

                body: JSON.stringify({
                    request_id: requestId
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            paymentMessage.textContent =
                data.message ||
                'Unable to select cash payment.';

            return;
        }

        paymentMessage.textContent =
            'Cash payment selected. Please pay the driver when the service is completed.';

        console.log(
            'Cash payment created:',
            data.payment
        );

        loadMyPayments();

    } catch (error) {

        console.error(
            'Cash payment error:',
            error
        );

        paymentMessage.textContent =
            'Unable to select cash payment.';
    }
}

//when selecting gcash payment
// async function selectCashPayment(requestId) {

//     console.log(
//         '💵 CASH FUNCTION HIT'
//     );

//     console.log(
//         'Request ID:',
//         requestId
//     );

//     paymentMessage.textContent =
//         `Cash selected for Request #${requestId}.`;

// }


//================================================================address section =====================================================
async function useCurrentEditLocation() {
    console.log("📍 Getting current location...");

    const useCurrentEditLocationBtn = document.getElementById('useCurrentEditLocationBtn');
    const editLocationLat = document.getElementById('editLocationLat');
    const editLocationLng = document.getElementById('editLocationLng');
    const editAddressInput = document.getElementById('editAddressInput');
    const selectedLocationInfo = document.getElementById('selectedLocationInfo');

    if (!navigator.geolocation) {
        alert("Your browser does not support location services.");
        return;
    }

    useCurrentEditLocationBtn.disabled = true;
    useCurrentEditLocationBtn.textContent = "📍 Getting your location...";
    selectedLocationInfo.innerHTML = "📡 Getting your GPS location...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log("Current GPS location:", { lat, lng });

            editLocationLat.value = lat;
            editLocationLng.value = lng;

            try {
                selectedLocationInfo.innerHTML = "🔍 Finding your address...";

                const url =
                    `${GEO_API_BASE}/api/geocode/reverse?` +
                    `lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;

                const response = await fetch(url, { headers: GEO_HEADERS });

                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`Reverse geocoding failed: ${response.status} ${body.slice(0, 120)}`);
                }

                const data = await response.json();
                console.log("Reverse geocoding result:", data);

                const address = data.address || `${lat}, ${lng}`;
                editAddressInput.value = address;

                selectedLocationInfo.innerHTML = `
          📍 <strong>Current location selected</strong><br>
          ${escapeHtml(address)}<br>
          <small>Lat: ${lat.toFixed(6)} &nbsp; Lng: ${lng.toFixed(6)}</small>
        `;
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                editAddressInput.value = `${lat}, ${lng}`;
                selectedLocationInfo.innerHTML = `
          📍 <strong>GPS location selected</strong><br>
          Lat: ${lat.toFixed(6)}<br>
          Lng: ${lng.toFixed(6)}
        `;
            } finally {
                useCurrentEditLocationBtn.disabled = false;
                useCurrentEditLocationBtn.textContent = "📍 Use My Current Location";
            }
        },
        (error) => {
            console.error("Geolocation error:", error);
            useCurrentEditLocationBtn.disabled = false;
            useCurrentEditLocationBtn.textContent = "📍 Use My Current Location";
            selectedLocationInfo.innerHTML = "Unable to get your current location.";

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    alert("Location permission was denied. Please allow location access."); break;
                case error.POSITION_UNAVAILABLE:
                    alert("Your current location is unavailable."); break;
                case error.TIMEOUT:
                    alert("Getting your location took too long. Please try again."); break;
                default:
                    alert("Unable to determine your current location.");
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

// ========== SEARCH ADDRESS ==========
async function searchAddressLocations(query) {
    const addressSuggestions = document.getElementById('addressSuggestions');

    if (!query || query.trim().length < 3) {
        addressSuggestions.innerHTML = '';
        addressSuggestions.classList.remove('show');
        return;
    }

    if (addressSearchController) addressSearchController.abort();
    addressSearchController = new AbortController();

    addressSuggestions.innerHTML = `<div class="address-loading">🔍 Searching locations...</div>`;
    addressSuggestions.classList.add('show');

    try {
        const url =
            `${GEO_API_BASE}/api/geocode/search?` +
            `q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            signal: addressSearchController.signal,
            headers: GEO_HEADERS,
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Search failed: ${response.status} ${body.slice(0, 120)}`);
        }

        const results = await response.json();

        if (!Array.isArray(results) || results.length === 0) {
            addressSuggestions.innerHTML = `<div class="address-no-results">No locations found.</div>`;
            return;
        }

        addressSuggestions.innerHTML = '';
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'address-suggestion';
            item.innerHTML = `
        <strong>📍 ${escapeHtml(result.display_name.split(',')[0])}</strong>
        <small>${escapeHtml(result.display_name)}</small>
      `;
            item.addEventListener('click', () => selectAddressResult(result));
            addressSuggestions.appendChild(item);
        });
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Address search error:', error);
        addressSuggestions.innerHTML = `<div class="address-no-results">⚠️ Unable to search locations.</div>`;
    }
}

// ========== SELECT ADDRESS RESULT ==========
function selectAddressResult(result) {
    const editAddressInput = document.getElementById('editAddressInput');
    const editLocationLat = document.getElementById('editLocationLat');
    const editLocationLng = document.getElementById('editLocationLng');
    const selectedLocationInfo = document.getElementById('selectedLocationInfo');
    const addressSuggestions = document.getElementById('addressSuggestions');

    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name;

    editAddressInput.value = address;
    editLocationLat.value = lat;
    editLocationLng.value = lng;

    selectedLocationInfo.innerHTML = `
    📍 <strong>Location selected</strong><br>
    Latitude: ${lat}<br>
    Longitude: ${lng}
  `;

    addressSuggestions.innerHTML = '';
    addressSuggestions.classList.remove('show');
    console.log('Selected address:', { address, lat, lng });
}

// ========== GEOCODE ADDRESS (manual input) ==========
async function geocodeAddress(address) {
    try {
        // Server already appends ", Philippines" and sets countrycodes=ph,
        // so we don't need to do it here.
        const url =
            `${GEO_API_BASE}/api/geocode/search?` +
            `q=${encodeURIComponent(address)}`;

        const response = await fetch(url, { headers: GEO_HEADERS });
        if (!response.ok) {
            const body = await response.text();
            console.error('Geocoding HTTP error:', response.status, body.slice(0, 120));
            return null;
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        // Prefer a result inside your service area (lat 6–7, lon 124–126),
        // otherwise fall back to the first result.
        const best = data.find(r =>
            parseFloat(r.lat) >= 6.0 && parseFloat(r.lat) <= 7.0 &&
            parseFloat(r.lon) >= 124.0 && parseFloat(r.lon) <= 126.0
        ) || data[0];

        return {
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
            displayName: best.display_name,
        };
    } catch (err) {
        console.error('Geocoding error:', err);
        return null;
    }
}
function escapeHtml(value) {

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}

//listener for input addrss
editAddressInput.addEventListener('input', () => {

    const query = editAddressInput.value.trim();

    // The user changed the address manually,
    // so the previous coordinates are no longer guaranteed.
    editLocationLat.value = '';
    editLocationLng.value = '';

    selectedLocationInfo.innerHTML = `
        📍 Searching for a new location...
    `;

    clearTimeout(addressSearchTimeout);

    addressSearchTimeout = setTimeout(() => {

        searchAddressLocations(query);

    }, 500);

});

if (emergencyBtn) {
    emergencyBtn.addEventListener('click', () => {
        window.location.href = 'requestForm';
    });
} else {
    console.log('the emergency button is not clicked');
}

[closeNewRequestBtn, cancelNewRequestBtn].forEach(btn => {
    btn?.addEventListener('click', () => {
        newRequestModal.classList.remove('show');
    });
});




//  Close button handler — return to Dashboard
document.getElementById('closeEditAddressSection')?.addEventListener('click', () => {
    showPanel(dashboardPanel, dashboardNav);
});


// SAVE ADDRESS — Full updated logic (Section mode)


// base line sang popular people
window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});


//=================================================================download receipt==================================================

//sidebar nav button functions
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready');

    // ========== DECLARE ALL ELEMENTS ==========
    const dashboardNav = document.getElementById('dashboardNav');
    const receiptNavBtn = document.getElementById('receiptNavBtn');
    const recentNavBtn = document.getElementById('recentNavBtn');
    const paymentNavBtn = document.getElementById('paymentNavBtn');
    const editAddressSidebarBtn = document.getElementById('editAddressNavBtn');
    const dashboardPanel = document.getElementById('dashboardPanel');
    const receiptPanel = document.getElementById('receiptPanel');
    const recentPanel = document.getElementById('recent-panel');
    const paymentSection = document.getElementById('paymentSection');
    const editAddressSection = document.getElementById('editAddressSection');
    const useCurrentEditLocationBtn = document.getElementById('useCurrentEditLocationBtn');
    const editAddressInput = document.getElementById('editAddressInput');
    const addressSuggestions = document.getElementById('addressSuggestions');
    const saveEditAddressBtn = document.getElementById('saveAddressBtn');

    // ========== showPanel() ==========
    function showPanel(panel, navItem) {
        dashboardPanel.hidden = true;
        receiptPanel.hidden = true;
        recentPanel.hidden = true;
        if (paymentSection) paymentSection.hidden = true;
        if (editAddressSection) editAddressSection.hidden = true;

        dashboardNav.classList.remove('active');
        receiptNavBtn.classList.remove('active');
        recentNavBtn.classList.remove('active');
        if (paymentNavBtn) paymentNavBtn.classList.remove('active');
        if (editAddressSidebarBtn) editAddressSidebarBtn.classList.remove('active');

        panel.hidden = false;
        if (navItem) navItem.classList.add('active');
    }

    // ========== DASHBOARD ==========
    dashboardNav?.addEventListener('click', () => showPanel(dashboardPanel, dashboardNav));

    // ========== RECEIPTS ==========
    receiptNavBtn?.addEventListener('click', async () => {
        showPanel(receiptPanel, receiptNavBtn);
        console.log('receipt clicked');
        await loadMyReceipts();
    });

    // ========== RECENT ==========
    recentNavBtn?.addEventListener('click', () => showPanel(recentPanel, recentNavBtn));

    // ========== PAYMENT ==========
    paymentNavBtn?.addEventListener('click', () => showPanel(paymentSection, paymentNavBtn));
    document.getElementById('closePaymentSection')?.addEventListener('click', () => showPanel(dashboardPanel, dashboardNav));
    // document.getElementById('cancelPaymentBtn')?.addEventListener('click', () => showPanel(dashboardPanel, dashboardNav));


    // EDIT ADDRESS NAV BUTTON — NOW WORKS!

    if (editAddressSidebarBtn) {
        editAddressSidebarBtn.addEventListener('click', (e) => {
            console.log('🔵 Edit Address button CLICKED!');

            if (!latestRequestData) {
                alert("No active request found.");
                return;
            }

            const editAddressInput = document.getElementById('editAddressInput');
            const editLocationLat = document.getElementById('editLocationLat');
            const editLocationLng = document.getElementById('editLocationLng');
            const selectedLocationInfo = document.getElementById('selectedLocationInfo');
            const addressSuggestions = document.getElementById('addressSuggestions');

            editAddressInput.value = latestRequestData.address || '';
            editLocationLat.value = latestRequestData.location_lat || '';
            editLocationLng.value = latestRequestData.location_lng || '';

            if (latestRequestData.location_lat && latestRequestData.location_lng) {
                selectedLocationInfo.innerHTML = `
          📍 <strong>Current request location</strong><br>
          Latitude: ${latestRequestData.location_lat}<br>
          Longitude: ${latestRequestData.location_lng}
        `;
            } else {
                selectedLocationInfo.innerHTML = `📍 No location coordinates available`;
            }

            addressSuggestions.innerHTML = '';
            addressSuggestions.classList.remove('show');

            showPanel(editAddressSection, editAddressSidebarBtn);
        });
    } else {
        console.log('editAddressNavBtn NOT FOUND — check your HTML ID!');
    }

    // ========== CLOSE EDIT ADDRESS ==========
    document.getElementById('closeEditAddressSection')?.addEventListener('click', () => {
        showPanel(dashboardPanel, dashboardNav);
    });

    // ========== USE CURRENT LOCATION BUTTON ==========
    useCurrentEditLocationBtn?.addEventListener('click', useCurrentEditLocation);

    // ========== ADDRESS SEARCH INPUT ==========
    editAddressInput?.addEventListener('input', () => {
        const query = editAddressInput.value.trim();
        const editLocationLat = document.getElementById('editLocationLat');
        const editLocationLng = document.getElementById('editLocationLng');
        const selectedLocationInfo = document.getElementById('selectedLocationInfo');

        editLocationLat.value = '';
        editLocationLng.value = '';
        selectedLocationInfo.innerHTML = `📍 Searching for a new location...`;

        clearTimeout(addressSearchTimeout);
        addressSearchTimeout = setTimeout(() => searchAddressLocations(query), 500);
    });

    // ========== SAVE ADDRESS ==========
    saveEditAddressBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        const editAddressInput = document.getElementById('editAddressInput');
        const editLocationLat = document.getElementById('editLocationLat');
        const editLocationLng = document.getElementById('editLocationLng');
        const addressSuggestions = document.getElementById('addressSuggestions');
        const newAddress = editAddressInput.value.trim();

        if (!newAddress) {
            alert("Please search and select an address.");
            return;
        }

        let lat = parseFloat(editLocationLat.value);
        let lng = parseFloat(editLocationLng.value);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            console.log("No coordinates — geocoding...");
            const geo = await geocodeAddress(newAddress);
            if (!geo) { alert("Please select a location from search results."); return; }
            lat = parseFloat(geo.lat);
            lng = parseFloat(geo.lng);
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            alert("Invalid location coordinates.");
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/requests/${latestRequestId}/address`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ address: newAddress, location_lat: lat, location_lng: lng })
            });

            const result = await res.json();
            if (!res.ok) { alert(result.error || "Failed to update address"); return; }
            console.log("Address updated:", result);

            showPanel(dashboardPanel, dashboardNav);

            latestRequestData.address = newAddress;
            latestRequestData.location_lat = lat;
            latestRequestData.location_lng = lng;

            // Update map marker
            if (customerMarker) {
                customerMarker.setLatLng([lat, lng]);
                customerMarker.setPopupContent(`<strong>📍 Your Location</strong><br>${newAddress}`);
            }

            // Update driver & route
            const driverLat = parseFloat(latestRequestData.driver_lat);
            const driverLng = parseFloat(latestRequestData.driver_lng);
            if (Number.isFinite(driverLat) && Number.isFinite(driverLng)) {
                await showDriverOnMap(driverLat, driverLng, lat, lng);
            }

            // Fit map
            if (Number.isFinite(driverLat) && Number.isFinite(driverLng)) {
                map.fitBounds(L.latLngBounds([lat, lng], [driverLat, driverLng]), { padding: [60, 60] });
            } else {
                map.setView([lat, lng], 15);
            }

            addressSuggestions.innerHTML = '';
            addressSuggestions.classList.remove('show');
            alert(result.message || "Address updated successfully");

        } catch (err) {
            console.error('Save error:', err);
            alert("Failed to update address.");
        }
    });

}); // END DOMContentLoaded

window.downloadReceipt = async function (paymentId) {
    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('Authentication required.');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/payments/${paymentId}/receipt`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to download receipt.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${paymentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Download receipt error:', error);
        alert(error.message);
    }
};
async function loadMyReceipts() {
    const tbody = document.getElementById('receiptsTableBody');

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">Loading...</td>
        </tr>
    `;

    try {
        const receipts = await apiFetch('/payments/mine');
        renderReceipts(receipts);
    } catch (err) {
        console.error('Failed to load receipts:', err);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Could not load receipts
                </td>
            </tr>
        `;

        if (typeof showAlert === 'function') {
            showAlert('Could not load receipts', 'danger');
        }
    }
}
function renderReceipts(receipts) {
    const tbody = document.getElementById('receiptsTableBody');
    if (!receipts || receipts.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">No receipts found</td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = receipts.map(receipt => `
    <tr>
      <td>${receipt.receipt_number || '—'}</td>
      <td>#${receipt.request_id || '—'}</td>
      <td>₱${Number(receipt.amount || 0).toFixed(2)}</td>
      <td>${receipt.payment_date ? new Date(receipt.payment_date).toLocaleDateString() : '—'}</td>
      <td><span class="status-badge status-${receipt.status || 'unknown'}">${receipt.status || '—'}</span></td>
      <td>${receipt.status === 'completed'
            ? `<button class="btn btn-sm" onclick="downloadReceipt(${receipt.payment_id})">Generate Receipt</button>`
            : `<span>—</span>`}</td>
    </tr>
  `).join('');
}
function buildDriverPopup({ distanceKm, durationMin, straightDistance } = {}) {
    const driverName = latestRequestData?.driver_name || 'Driver';
    const driverPhone = latestRequestData?.driver_phone || '';
    const vehicleType = latestRequestData?.vehicle_type || '';
    const plate = latestRequestData?.license_plate || '';

    let extra = '';
    if (durationMin != null && distanceKm != null) {
        extra = `Distance: <strong>${distanceKm} km</strong><br>
                 ETA: <strong>${durationMin} min</strong>`;
    } else if (straightDistance != null) {
        extra = `Straight line distance: <strong>${straightDistance} km</strong><br>
                 <em>(Routing temporarily unavailable)</em>`;
    }

    return `
        <strong>🚗 ${driverName}</strong><br>
        ${vehicleType}${plate ? ` • ${plate}` : ''}
        ${driverPhone ? `<br>📞 ${driverPhone}` : ''}
        ${extra ? `<hr style="margin:4px 0;border:none;border-top:1px solid #ddd">${extra}` : ''}
    `;
}

