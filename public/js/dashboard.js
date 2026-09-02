// dashboard.js

const POLL_INTERVAL_MS = 30000;
//==================================================================map gelocation=====================================================
let map = null;
let customerMarker = null;
let driverMarker = null;
let routeLayer = null;
let pollingInterval = null;
let latestRequestId = null;
let latestRequestData = null;

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

// Main function to load user map
async function loadUserMap() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    const token = sessionStorage.getItem('token');

    if (!token) {
        console.error('No token — customer not logged in.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }, cache: 'no-store'
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`${res.status} - ${body}`);
        }

        const data = await res.json();

        // /requests/latest now returns an ARRAY of the latest 5 requests.
        // The first item is the newest/latest request.
        const request = Array.isArray(data) ? data[0] : data;



        if (!request) {
            console.warn('No active request found.');
            return;
        }


      if (
    request.status === 'completed' ||
    request.status === 'cancelled'
) {
    console.log(`Request #${request.request_id} is ${request.status}. Clearing live tracking.`);

    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    latestRequestId = request.request_id;
    // Keep latestRequestData populated for completed requests so payment still works.
    // Only null it out when there's truly nothing left to act on.
    if (request.status === 'cancelled') {
        latestRequestData = null;
    } else {
        latestRequestData = request;
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
        // Store the latest request, not the entire array
        latestRequestId = request.request_id;
        latestRequestData = request;

        if (!request?.location_lat || !request?.location_lng) {
            console.warn('No location data on request.');

            const mapDiv = document.getElementById('map');

            if (mapDiv) {
                mapDiv.innerHTML =
                    '<p style="padding:1rem;color:#888">No active request found.</p>';
            }

            return;
        }

        const lat = parseFloat(request.location_lat);
        const lng = parseFloat(request.location_lng);

        // console.log('Customer:', lat, lng);
        // console.log('Driver:', request.driver_lat, request.driver_lng);
        // console.log('Status:', request.status);
        // console.log('Full data:', request);

        if (map) {
            map.remove();
            map = null;
            customerMarker = null;
            driverMarker = null;
            routeLayer = null;
        }

        map = L.map('map').setView([lat, lng], 15);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }
        ).addTo(map);

        customerMarker = L.marker(
            [lat, lng],
            { icon: customerIcon }
        )
            .addTo(map)
            .bindPopup(
                `<strong>📍 Your Location</strong><br>${request.address || 'Your requested location'}`
            )
            .openPopup();

        if (request.driver_lat && request.driver_lng) {
            showDriverOnMap(
                parseFloat(request.driver_lat),
                parseFloat(request.driver_lng),
                lat,
                lng
            );
        }

        pollingInterval = setInterval(
            () => pollDriverLocation(lat, lng),
            POLL_INTERVAL_MS
        );

    } catch (err) {
        console.error('Map load error:', err);

        const mapDiv = document.getElementById('map');

        if (mapDiv) {
            mapDiv.innerHTML =
                '<p style="padding:1rem;color:#888">Error loading map. Please refresh.</p>';
        }
    }
}



//getting the locations of the driver from the driver area
async function pollDriverLocation(customerLat, customerLng) {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
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
    } else {
        driverMarker.setLatLng([driverLat, driverLng]);
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


        if (driverMarker) {
            driverMarker.setPopupContent(
                `<strong>🚗 Driver is on the way</strong><br>

                 Distance: <strong>${distanceKm} km</strong><br>
                 ETA: <strong>${durationMin} min</strong>`
            );
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
            driverMarker.setPopupContent(
                `<strong>🚗 Driver is on the way</strong><br>
                 Straight line distance: <strong>${straightDistance} km</strong><br>
                 (Routing temporarily unavailable)`
            );
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
//getting the location of the address in the change address modal
async function geocodeAddress(address) {
    try {
        const searchQuery = address.includes('Philippines')
            ? address
            : `${address}, Philippines`;

        const encoded = encodeURIComponent(searchQuery);

        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encoded}` +
            `&format=json` +
            `&limit=5` +
            `&countrycodes=ph` +
            `&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TowTheRescue/1.0'
            }
        });

        const data = await response.json();

        if (!data || data.length === 0) return null;

        const best = data.find(r =>
            parseFloat(r.lat) >= 6.0 && parseFloat(r.lat) <= 7.0 &&
            parseFloat(r.lon) >= 124.0 && parseFloat(r.lon) <= 126.0
        ) || data[0];

        return {
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
            displayName: best.display_name
        };

    } catch (err) {
        console.error('Geocoding error:', err);
        return null;
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
        cache: 'no-store'
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
                        🗑️ Cancel
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
//general event listener for all
document.addEventListener("DOMContentLoaded", () => {

    loadDashboardData(); // Make sure this function exists in your dashboard.js or app.js
    loadRecentActivity();


    // This keeps the customer view updated when the admin changes something
    setInterval(() => {
        loadDashboardData(true); // Use the "silent" version to avoid flickering
        loadRecentActivity();
    }, 5000);


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
const editAddressModal = document.getElementById('editAddressModal');
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

let addressSearchTimeout = null;
let addressSearchController = null;

//payments
const paymentNavBtn = document.getElementById('paymentNavBtn');
const paymentModal = document.getElementById('paymentModal');
const closePaymentModal = document.getElementById('closePaymentModal');
const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
const paymentRequestId = document.getElementById('paymentRequestId');
const paymentAmount = document.getElementById('paymentAmount');
const paymentMessage = document.getElementById('paymentMessage');


//============================================================= payment section ======================================================
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
    console.log('closepaymentmodalfunction is active');
    if (!paymentModal) return;

    paymentModal.classList.remove('show');
}
if (closePaymentModal) {

    closePaymentModal.addEventListener(
        'click',
        closePaymentModalFunction
    );
    console.log('closepaymentmodafunction is hit')
}
if (cancelPaymentBtn) {

    cancelPaymentBtn.addEventListener(
        'click',
        closePaymentModalFunction
    );
}
//loads the payment info
function loadPaymentRequestInfo() {
    if (!latestRequestData) {
        paymentRequestId.textContent = '--';
        paymentAmount.textContent = '₱0.00';
        paymentMessage.textContent =
            'No payment is currently available.';
        return;
    }

    paymentRequestId.textContent = latestRequestData.request_id;

    const amount = Number(latestRequestData.amount);

    if (amount <= 0) {
        paymentAmount.textContent = 'Not yet assigned';
        paymentMessage.textContent =
            'The service fee has not been assigned yet.';
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
    console.log(
        'processPaymentMethod() called:',
        method
    );

    console.log(
        'Payment request ID:',
        requestId
    );

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

        // No payment record yet
        await startGCashPayment(requestId);

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
// async function selectCashPayment(requestId) {

//     const confirmed =
//         confirm(
//             'Do you want to pay in cash to the driver?'
//         );

//     if (!confirmed) return;

//     const token =
//         sessionStorage.getItem('token');

//     try {

//         const response = await fetch(
//             `${API_BASE_URL}/payments/cash`,
//             {
//                 method: 'POST',

//                 headers: {
//                     'Content-Type':
//                         'application/json',

//                     'Authorization':
//                         `Bearer ${token}`
//                 },

//                 body: JSON.stringify({
//                     request_id: requestId
//                 })
//             }
//         );

//         const data =
//             await response.json();

//         if (!response.ok || !data.success) {

//             paymentMessage.textContent =
//                 data.message ||
//                 'Unable to select cash payment.';

//             return;
//         }

//         paymentMessage.textContent =
//             'Cash payment selected. Please pay the driver.';

//         loadMyPayments();

//     } catch (error) {

//         console.error(
//             'Cash payment error:',
//             error
//         );

//     }
// }

//when selecting gcash payment
async function selectCashPayment(requestId) {

    console.log(
        '💵 CASH FUNCTION HIT'
    );

    console.log(
        'Request ID:',
        requestId
    );

    paymentMessage.textContent =
        `Cash selected for Request #${requestId}.`;

}
async function startPayMayaPayment(requestId) {

    console.log(
        'PayMaya selected for request:',
        requestId
    );

    paymentMessage.textContent =
        'PayMaya payment is not implemented yet.';
}

async function startCardPayment(requestId) {

    console.log(
        'Card selected for request:',
        requestId
    );

    paymentMessage.textContent =
        'Card payment is not implemented yet.';
}

//================================================================address section =====================================================
//using current address
async function useCurrentEditLocation() {

    console.log("📍 Getting current location...");

    if (!navigator.geolocation) {

        alert(
            "Your browser does not support location services."
        );

        return;
    }

    // Show loading state
    useCurrentEditLocationBtn.disabled = true;

    useCurrentEditLocationBtn.textContent =
        "📍 Getting your location...";

    selectedLocationInfo.innerHTML =
        "📡 Getting your GPS location...";

    navigator.geolocation.getCurrentPosition(

        async (position) => {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            console.log("Current GPS location:", {
                lat,
                lng
            });

            // Save coordinates
            editLocationLat.value = lat;
            editLocationLng.value = lng;

            try {

                selectedLocationInfo.innerHTML =
                    "🔍 Finding your address...";

                /*
                 * Reverse geocoding:
                 * Coordinates -> readable address
                 */

                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse` +
                    `?lat=${lat}` +
                    `&lon=${lng}` +
                    `&format=json` +
                    `&addressdetails=1`
                );

                if (!response.ok) {
                    throw new Error(
                        `Reverse geocoding failed: ${response.status}`
                    );
                }

                const data = await response.json();

                console.log(
                    "Reverse geocoding result:",
                    data
                );

                const address =
                    data.display_name ||
                    `${lat}, ${lng}`;

                // Put address into input
                editAddressInput.value = address;

                // Show selected location
                selectedLocationInfo.innerHTML = `
                    📍 <strong>Current location selected</strong><br>
                    ${escapeHtml(address)}<br>
                    <small>
                        Lat: ${lat.toFixed(6)}
                        &nbsp;
                        Lng: ${lng.toFixed(6)}
                    </small>
                `;

            } catch (error) {

                console.error(
                    "Reverse geocoding error:",
                    error
                );

                /*
                 * GPS still worked even if
                 * address lookup failed.
                 */

                editAddressInput.value =
                    `${lat}, ${lng}`;

                selectedLocationInfo.innerHTML = `
                    📍 <strong>GPS location selected</strong><br>
                    Lat: ${lat.toFixed(6)}<br>
                    Lng: ${lng.toFixed(6)}
                `;

            } finally {

                useCurrentEditLocationBtn.disabled = false;

                useCurrentEditLocationBtn.textContent =
                    "📍 Use My Current Location";
            }

        },

        (error) => {

            console.error(
                "Geolocation error:",
                error
            );

            useCurrentEditLocationBtn.disabled = false;

            useCurrentEditLocationBtn.textContent =
                "📍 Use My Current Location";

            selectedLocationInfo.innerHTML =
                "Unable to get your current location.";

            switch (error.code) {

                case error.PERMISSION_DENIED:

                    alert(
                        "Location permission was denied. " +
                        "Please allow location access in your browser."
                    );

                    break;

                case error.POSITION_UNAVAILABLE:

                    alert(
                        "Your current location is unavailable."
                    );

                    break;

                case error.TIMEOUT:

                    alert(
                        "Getting your location took too long. " +
                        "Please try again."
                    );

                    break;

                default:

                    alert(
                        "Unable to determine your current location."
                    );
            }

        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );
}
if (useCurrentEditLocationBtn) {

    useCurrentEditLocationBtn.addEventListener(
        'click',
        useCurrentEditLocation
    );

}

//search addresss
async function searchAddressLocations(query) {

    if (!query || query.trim().length < 3) {
        addressSuggestions.innerHTML = '';
        addressSuggestions.classList.remove('show');
        return;
    }

    // Cancel previous request
    if (addressSearchController) {
        addressSearchController.abort();
    }

    addressSearchController = new AbortController();

    addressSuggestions.innerHTML = `
        <div class="address-loading">
            🔍 Searching locations...
        </div>
    `;

    addressSuggestions.classList.add('show');

    try {

        const encodedQuery = encodeURIComponent(
            `${query}, Philippines`
        );

        const url =
            `https://nominatim.openstreetmap.org/search` +
            `?q=${encodedQuery}` +
            `&format=json` +
            `&addressdetails=1` +
            `&limit=5` +
            `&countrycodes=ph`;

        const response = await fetch(url, {
            signal: addressSearchController.signal
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const results = await response.json();

        if (!results || results.length === 0) {

            addressSuggestions.innerHTML = `
                <div class="address-no-results">
                    No locations found.
                </div>
            `;

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

            item.addEventListener('click', () => {

                selectAddressResult(result);

            });

            addressSuggestions.appendChild(item);
        });

    } catch (error) {

        if (error.name === 'AbortError') {
            return;
        }

        console.error('Address search error:', error);

        addressSuggestions.innerHTML = `
            <div class="address-no-results">
                ⚠️ Unable to search locations.
            </div>
        `;
    }
}

//sorting the address
function selectAddressResult(result) {

    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    const address = result.display_name;

    // Put selected address into input
    editAddressInput.value = address;

    // Store coordinates
    editLocationLat.value = lat;
    editLocationLng.value = lng;

    // Show selected location
    selectedLocationInfo.innerHTML = `
        📍 <strong>Location selected</strong><br>
        Latitude: ${lat}<br>
        Longitude: ${lng}
    `;

    // Hide suggestions
    addressSuggestions.innerHTML = '';
    addressSuggestions.classList.remove('show');

    console.log('Selected address:', {
        address,
        lat,
        lng
    });
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

if (editAddressSidebarBtn) {

    editAddressSidebarBtn.addEventListener('click', (e) => {

        console.log('editAddressSidebarBtn is clicked');

        if (!latestRequestData) {
            alert("No active request found.");
            return;
        }

        // Load current address
        editAddressInput.value = latestRequestData.address || '';

        // Load current coordinates
        editLocationLat.value =
            latestRequestData.location_lat || '';

        editLocationLng.value =
            latestRequestData.location_lng || '';

        // Show current location information
        if (
            latestRequestData.location_lat &&
            latestRequestData.location_lng
        ) {

            selectedLocationInfo.innerHTML = `
            📍 <strong>Current request location</strong><br>
            Latitude: ${latestRequestData.location_lat}<br>
            Longitude: ${latestRequestData.location_lng}
        `;

        } else {

            selectedLocationInfo.innerHTML =
                `📍 No location coordinates available`;

        }

        // Clear old suggestions
        addressSuggestions.innerHTML = '';
        addressSuggestions.classList.remove('show');

        // Open modal
        editAddressModal.style.display = 'flex';

    });
}

if (closeEditModalBtn) {
    closeEditModalBtn.onclick = () => {
        editAddressModal.style.display = 'none';
    };
}

window.addEventListener('click', function (event) {
    if (event.target == editAddressModal) {
        editAddressModal.style.display = 'none';
    }
});

if (saveEditAddressBtn) {

    saveEditAddressBtn.onclick = async (e) => {

        e.preventDefault();

        const newAddress = editAddressInput.value.trim();

        if (!newAddress) {
            alert("Please search and select an address.");
            return;
        }

        // GET SELECTED COORDINATES

        let lat = parseFloat(editLocationLat.value);
        let lng = parseFloat(editLocationLng.value);

        /*
         * If the user typed an address manually without
         * selecting a search result, geocode it.
         */
        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            console.log(
                "No selected coordinates. Geocoding address..."
            );

            const geo =
                await geocodeAddress(newAddress);

            if (!geo) {

                alert(
                    "Please select a location from the search results."
                );

                return;
            }

            lat = parseFloat(geo.lat);
            lng = parseFloat(geo.lng);
        }

        // Make absolutely sure coordinates are valid
        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            alert("Invalid location coordinates.");
            return;
        }

        try {

            const token =
                sessionStorage.getItem('token');

            // UPDATE DATABASE
            const res = await fetch(
                `${API_BASE_URL}/requests/${latestRequestId}/address`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        address: newAddress,
                        location_lat: lat,
                        location_lng: lng
                    })
                }
            );

            const result = await res.json();

            if (!res.ok) {

                alert(
                    result.error ||
                    "Failed to update address"
                );

                return;
            }

            console.log(
                "Address update successful:",
                result
            );

            // CLOSE MODAL

            editAddressModal.style.display = 'none';

            // UPDATE LOCAL REQUEST DATA

            latestRequestData.address =
                newAddress;

            latestRequestData.location_lat =
                lat;

            latestRequestData.location_lng =
                lng;

            console.log(
                "========== UPDATING MAP AFTER ADDRESS =========="
            );

            console.log(
                "Customer:",
                lat,
                lng
            );

            console.log(
                "Driver:",
                latestRequestData.driver_lat,
                latestRequestData.driver_lng
            );

            // UPDATE CUSTOMER MARKER

            if (customerMarker) {

                console.log(
                    "📍 Updating existing customer marker"
                );

                customerMarker.setLatLng([
                    lat,
                    lng
                ]);

                customerMarker.setPopupContent(
                    `<strong>📍 Your Location</strong><br>
                     ${newAddress}`
                );

            } else {

                console.warn(
                    "Customer marker doesn't exist. Creating it."
                );

                customerMarker = L.marker(
                    [lat, lng],
                    { icon: customerIcon })
                    .addTo(map)
                    .bindPopup(
                        `<strong>📍 Your Location</strong><br>
                     ${newAddress}`);
            }

            // GET DRIVER LOCATION
            const driverLat =
                parseFloat(
                    latestRequestData.driver_lat
                );

            const driverLng =
                parseFloat(
                    latestRequestData.driver_lng
                );

            console.log(
                "🚗 Driver coordinates:",
                driverLat,
                driverLng
            );
            // UPDATE DRIVER + ROUTE
            if (
                Number.isFinite(driverLat) &&
                Number.isFinite(driverLng)
            ) {
                console.log(
                    "🚗 Driver still exists"
                );
                await showDriverOnMap(
                    driverLat,
                    driverLng,
                    lat,
                    lng
                );
            } else {
                console.warn(
                    "Driver coordinates missing."
                );
            }
            // FIT MAP TO BOTH LOCATIONS
            if (
                Number.isFinite(driverLat) &&
                Number.isFinite(driverLng)
            ) {
                const bounds =
                    L.latLngBounds(
                        [lat, lng],
                        [driverLat, driverLng]
                    );
                map.fitBounds(
                    bounds,
                    {
                        padding: [60, 60]
                    }
                );
            } else {
                map.setView(
                    [lat, lng],
                    15
                );
            }
            if (addressSuggestions) {

                addressSuggestions.innerHTML = '';

                addressSuggestions.classList.remove(
                    'show'
                );
            }
            alert(
                result.message ||
                "Address updated successfully"
            );
        } catch (err) {
            console.error(
                'Failed to update address:',
                err
            );
            alert("Failed to update address.");
        }
    };
}

// base line sang popular people
window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    displayUserInfo();

    loadUserMap();
});
//=================================================================download receipt==================================================
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
        console.error('❌ Download receipt error:', error);
        alert(error.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dashboardNav = document.getElementById('dashboardNav');
    const receiptNavBtn = document.getElementById('receiptNavBtn');

    const dashboardPanel = document.getElementById('dashboardPanel');
    const receiptPanel = document.getElementById('receiptPanel');

    function showPanel(panel, navItem) {
        dashboardPanel.hidden = true;
        receiptPanel.hidden = true;

        dashboardNav.classList.remove('active');
        receiptNavBtn.classList.remove('active');

        panel.hidden = false;
        navItem.classList.add('active');
    }

    dashboardNav.addEventListener('click', () => {
        showPanel(dashboardPanel, dashboardNav);
    });

    receiptNavBtn.addEventListener('click', async () => {
        showPanel(receiptPanel, receiptNavBtn);

        console.log('receipt is clicked');

        await loadMyReceipts();
    });
});


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
                <td colspan="6" class="text-center">
                    No receipts found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = receipts.map(receipt => `
        <tr>
            <td>
                ${receipt.receipt_number || '—'}
            </td>

            <td>
                #${receipt.request_id || '—'}
            </td>

            <td>
                ₱${Number(receipt.amount || 0).toFixed(2)}
            </td>

            <td>
                ${
                    receipt.payment_date
                        ? new Date(
                            receipt.payment_date
                        ).toLocaleDateString()
                        : '—'
                }
            </td>

            <td>
                <span class="status-badge status-${receipt.status || 'unknown'}">
                    ${receipt.status || '—'}
                </span>
            </td>

            <td>
                ${
                    receipt.status === 'completed'
                        ? `
                            <button
                                class="btn btn-sm"
                                onclick="downloadReceipt(${receipt.payment_id})">
                                Generate Receipt
                            </button>
                          `
                        : `
                            <span>—</span>
                          `
                }
            </td>
        </tr>
    `).join('');
}

