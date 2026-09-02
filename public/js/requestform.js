// requestform.js



let addressSearchController = null;
let addressSuggestions = null;

//funcntion for request card
function setServiceFromURL() {

    const params = new URLSearchParams(window.location.search);

    const serviceId = params.get('service');

    if (!serviceId) {
        return;
    }

    const serviceSelect = document.getElementById('serviceType');

    if (!serviceSelect) {
        console.error('serviceType select not found.');
        return;
    }

    const optionExists = Array.from(serviceSelect.options)
        .some(option => option.value === serviceId);

    if (!optionExists) {
        console.warn(`Service ID ${serviceId} does not exist.`);
        return;
    }

    serviceSelect.value = serviceId;
};

const DRAFT_KEY = 'draftRequest';

document.addEventListener("DOMContentLoaded", () => {

    addressSuggestions = document.getElementById('addressSuggestions');

    // Restore any draft saved before a login/register redirect
    restoreRequestDraft();

    // Load vehicles only if logged in; otherwise show guest state
    const token = sessionStorage.getItem('token');
    if (token) {
        loadVehiclesForRequest();
    } else {
        showGuestState();
    }

    // Automatically select service from URL
    setServiceFromURL();

    const emergencyForm = document.getElementById('emergencyForm');
    if (emergencyForm) {
        emergencyForm.addEventListener('submit', handleRequestSubmit);
    }

    const addressField = document.getElementById('address');
    if (addressField) {
        addressField.addEventListener('input', () => {
            clearTimeout(addressField._geocodeTimer);
            const value = addressField.value.trim();
            addressField._geocodeTimer = setTimeout(() => {
                if (value.length >= 5) {
                    forwardGeocode(value);
                }
            }, 1000);
        });
    }

});

function showGuestState() {
    const select = document.getElementById('vehicleId');
    const guestNotice = document.getElementById('guestNotice');
    const submitBtn = document.getElementById('submitBtn');

    select.innerHTML = '<option value="">Log in to select a vehicle</option>';
    select.disabled = true;
    submitBtn.disabled = true;
    guestNotice.style.display = 'block';

    const returnTo = encodeURIComponent(window.location.pathname);

    document.getElementById('guestLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        saveRequestDraft();
        window.location.href = `/login?returnTo=${returnTo}`;
    });

    document.getElementById('guestRegisterLink').addEventListener('click', (e) => {
        e.preventDefault();
        saveRequestDraft();
        window.location.href = `/register?returnTo=${returnTo}`;
    });
}

function saveRequestDraft() {
    const draft = {
        serviceType: document.getElementById('serviceType').value,
        latitude: document.getElementById('latitude').value,
        longitude: document.getElementById('longitude').value,
        address: document.getElementById('address').value
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restoreRequestDraft() {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const draft = JSON.parse(raw);
    if (draft.serviceType) document.getElementById('serviceType').value = draft.serviceType;
    if (draft.latitude) document.getElementById('latitude').value = draft.latitude;
    if (draft.longitude) document.getElementById('longitude').value = draft.longitude;
    if (draft.address) document.getElementById('address').value = draft.address;

    sessionStorage.removeItem(DRAFT_KEY);
}
// your existing loadVehiclesForRequest() and handleRequestSubmit() stay exactly as-is below



// document.addEventListener("DOMContentLoaded", () => {

//     addressSuggestions = document.getElementById('addressSuggestions');

//     loadVehiclesForRequest();

//     const emergencyForm = document.getElementById('emergencyForm');

//     if (emergencyForm) {
//         emergencyForm.addEventListener(
//             'submit',
//             handleRequestSubmit
//         );
//     }

//     const addressField =
//         document.getElementById('address');

//     if (addressField) {

//         addressField.addEventListener('input', () => {

//             clearTimeout(addressField._searchTimer);

//             const query =
//                 addressField.value.trim();

//             addressField._searchTimer =
//                 setTimeout(() => {

//                     searchAddressLocations(query);

//                 }, 1000);
//         });
//     }

// });

// document.addEventListener("DOMContentLoaded", () => {
//     loadVehiclesForRequest();

//     const emergencyForm = document.getElementById('emergencyForm');
//     if (emergencyForm) {
//         emergencyForm.addEventListener('submit', handleRequestSubmit);
//     }

//     // Forward-geocode manual address entry (debounced) so typing an
//     // address also fills in lat/lng, same as "Use Current Location" does
//     // in reverse.
//     const addressField = document.getElementById('address');
//     if (addressField) {
//         addressField.addEventListener('input', () => {
//             clearTimeout(addressField._geocodeTimer);
//             addressField._geocodeTimer = setTimeout(() => {
//                 const value = addressField.value.trim();
//                 if (value.length >= 5) {
//                     forwardGeocode(value);
//                 }
//             }, 1000); // wait 1s after typing stops — respects Nominatim's ~1 req/sec policy
//         });
//     }
// });

function escapeHtml(value) {

    if (!value) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
// address suggestion
function selectAddressResult(result) {

    const addressField =
        document.getElementById('address');

    const latitudeField =
        document.getElementById('latitude');

    const longitudeField =
        document.getElementById('longitude');

    const statusEl =
        document.getElementById('locationStatus');

    // Set address
    addressField.value =
        result.display_name;

    // Set coordinates
    latitudeField.value =
        result.lat;

    longitudeField.value =
        result.lon;

    // Hide suggestions
    addressSuggestions.innerHTML = '';

    addressSuggestions.classList.remove('show');

    // Update status
    if (statusEl) {
        statusEl.textContent =
            '📍 Location selected';
    }

    console.log('Selected address:', {
        address: result.display_name,
        latitude: result.lat,
        longitude: result.lon,
        addressDetails: result.address
    });
}
//search address
async function searchAddressLocations(query) {

    if (!query || query.trim().length < 3) {

        addressSuggestions.innerHTML = '';

        addressSuggestions.classList.remove('show');

        return;
    }

    // Cancel previous search
    if (addressSearchController) {
        addressSearchController.abort();
    }

    addressSearchController =
        new AbortController();

    addressSuggestions.innerHTML = `
        <div class="address-loading">
            🔍 Searching locations...
        </div>
    `;

    addressSuggestions.classList.add('show');

    try {

        const encodedQuery =
            encodeURIComponent(
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
            throw new Error(
                `Search failed: ${response.status}`
            );
        }

        const results =
            await response.json();

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

            const item =
                document.createElement('div');

            item.className =
                'address-suggestion';

            item.innerHTML = `
                <strong>
                    📍 ${escapeHtml(
                        result.display_name.split(',')[0]
                    )}
                </strong>

                <small>
                    ${escapeHtml(
                        result.display_name
                    )}
                </small>
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

        console.error(
            'Address search error:',
            error
        );

        addressSuggestions.innerHTML = `
            <div class="address-no-results">
                ⚠️ Unable to search locations.
            </div>
        `;
    }
}
//load vehicle
async function loadVehiclesForRequest() {
    const select = document.getElementById('vehicleId');
    const notice = document.getElementById('noVehiclesNotice');
    const submitBtn = document.getElementById('submitBtn');

    try {
        const response = await fetch(`${API_BASE_URL}/vehicles`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Failed to load your vehicles', 'danger');
            return;
        }

        const vehicles = data.vehicles || [];
        select.innerHTML = '';

        if (vehicles.length === 0) {
            select.innerHTML = '<option value="">No saved vehicles</option>';
            select.disabled = true;
            notice.style.display = 'block';
            submitBtn.disabled = true;
            return;
        }

        select.disabled = false;
        notice.style.display = 'none';
        submitBtn.disabled = false;

        select.innerHTML = '<option value="">Select a vehicle</option>' +
            vehicles.map(v => `
                <option value="${v.vehicle_id}" ${v.is_default ? 'selected' : ''}>
                  ${v.make} ${v.model} ——— ${v.license_plate}${v.is_default ? ' (Default)' : ''}
                </option>
            `).join('');

    } catch (error) {
        console.error('loadVehiclesForRequest error:', error);
        showAlert('Network error while loading your vehicles.', 'danger');
    }
}
//get current location
function getCurrentLocation() {
    const statusEl = document.getElementById('locationStatus');

    if (!navigator.geolocation) {
        statusEl.textContent = 'Geolocation is not supported by your browser.';
        return;
    }

    statusEl.textContent = 'Getting your location...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            statusEl.textContent = '📍 Location captured — looking up address...';

            await reverseGeocode(lat, lng, statusEl);
        },
        (error) => {
            console.error('Geolocation error:', error);
            statusEl.textContent = 'Could not get your location. Please enter your address manually.';
        }
    );
}

// Coordinates human-readable address (fills the address textarea)
async function reverseGeocode(lat, lng, statusEl) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );

        if (!response.ok) {
            throw new Error(`Nominatim responded with ${response.status}`);
        }

        const data = await response.json();

        if (data && data.display_name) {
            document.getElementById('address').value = data.display_name;
            if (statusEl) statusEl.textContent = '📍 Location captured';
        } else {
            if (statusEl) statusEl.textContent = '📍 Location captured (address lookup unavailable — please check the address below)';
        }
    } catch (error) {
        console.error('reverseGeocode error:', error);
        if (statusEl) statusEl.textContent = '📍 Location captured (address lookup failed — please check the address below)';
    }
}

// Address text -> coordinates (fills the hidden lat/lng fields)
// async function forwardGeocode(query) {
//     const statusEl = document.getElementById('locationStatus');

//     try {
//         const response = await fetch(
//             `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
//         );

//         if (!response.ok) {
//             throw new Error(`Nominatim responded with ${response.status}`);
//         }

//         const results = await response.json();

//         if (results && results.length > 0) {
//             document.getElementById('latitude').value = results[0].lat;
//             document.getElementById('longitude').value = results[0].lon;
//             if (statusEl) statusEl.textContent = '📍 Location matched from address';
//         } else {
//             // No match — leave whatever lat/lng was there before (or empty).
//             // The address text itself is still submitted either way.
//             if (statusEl) statusEl.textContent = '';
//         }
//     } catch (error) {
//         console.error('forwardGeocode error:', error);
//     }
// }

//sends request in the bckend
async function handleRequestSubmit(e) {
    e.preventDefault();

    const serviceType = document.getElementById('serviceType').value;
    const vehicleId = document.getElementById('vehicleId').value;
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const address = document.getElementById('address').value.trim();

    if (!vehicleId) {
        showAlert('Please select a vehicle.', 'danger');
        return;
    }

    if (!latitude && !longitude && !address) {
        showAlert('Please share your location or enter an address.', 'danger');
        return;
    }

    const requestData = {
        service_type_id: serviceType,
        vehicle_id: vehicleId,
        location_lat: latitude ? parseFloat(latitude) : null,
        location_lng: longitude ? parseFloat(longitude) : null,
        address: address || null
    };

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Submitting...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('emergencyForm').style.display = 'none';
            document.getElementById('requestId').textContent = data.request.id;
            document.getElementById('confirmation').style.display = 'block';
        } else {
            showAlert(data.error || 'Failed to submit request', 'danger');
        }
    } catch (error) {
        console.error('Request submission error:', error);
        showAlert('Network error. Please try again.', 'danger');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}
// for the request card
document.addEventListener('DOMContentLoaded', () => {

    const requestButtons = document.querySelectorAll('.request-srv');

    requestButtons.forEach(button => {

        button.addEventListener('click', () => {

            const serviceId = button.dataset.serviceId;

            if (!serviceId) {
                console.error('No service ID found on request button.');
                return;
            }

            // Change this if your request page has a different URL
            window.location.href = `requestform?service=${serviceId}`;
        });

    });

});


