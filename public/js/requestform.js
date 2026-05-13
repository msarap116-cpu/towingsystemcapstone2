// requestform.js 

async function handleEmergencyRequest(e) {
    e.preventDefault();

    // Get token and user
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    
    if (!token || !user) {
        showAlert('Please login first!', 'warning');
        setTimeout(() => {
            window.location.href = 'login';
        }, 1500);
        return;
    }

    
    const serviceType = document.getElementById('serviceType')?.value;
    const vehicleType = document.getElementById('vehicleType')?.value;
    const licensePlate = document.getElementById('licensePlate')?.value;
    let latitude = document.getElementById('latitude')?.value;
    let longitude = document.getElementById('longitude')?.value;
    let address = document.getElementById('address')?.value;

    console.log('Form data:', { serviceType, vehicleType, licensePlate, latitude, longitude, address });

    // Check if user manually entered address (and no coordinates from "Use Current Location")
    const hasManualAddress = address && address.trim() !== '';
    const hasCoordinates =
    latitude !== '' &&
    longitude !== '' &&
    latitude !== null &&
    longitude !== null &&
    latitude !== undefined &&
    longitude !== undefined;

    console.log("Final latitude:", latitude);
    console.log("Final longitude:", longitude);
    
    // If manual address is provided but no coordinates, geocode it
    if (hasManualAddress && !hasCoordinates) {
        showAlert('Converting address to coordinates...', 'info');
        
        try {
            const coords = await geocodeAddress(address);
            if (coords) {
                latitude = coords.lat;
                longitude = coords.lng;
                console.log('Geocoded address:', address, '->', latitude, longitude);
                showAlert('Location found!', 'success');
            } else {
                showAlert('Could not find that address. Please check and try again.', 'warning');
                return;
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            showAlert('Error converting address. Please use current location instead.', 'danger');
            return;
        }
    }
    
    // If no coordinates and no address, try to get current location
    if (!hasCoordinates && !hasManualAddress) {
        showAlert('Getting your location...', 'info');
        
        await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    latitude = pos.coords.latitude;
                    longitude = pos.coords.longitude;
                    resolve();
                },
                (err) => {
                    console.error('Location error:', err);
                    showAlert('Could not get location. Please enter address manually.', 'warning');
                    resolve();
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    
    if (!latitude || !longitude) {
        showAlert('Please provide your location (use current location or enter a valid address)!', 'danger');
        return;
    }

   
    const submitBtn = document.querySelector('.submit-btn') || e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Submitting...';
    submitBtn.disabled = true;

    try {
        
        const requestData = {
            service_type: serviceType,
            vehicle_type: vehicleType,
            license_plate: licensePlate,
            location_lat: parseFloat(latitude),
            location_lng: parseFloat(longitude),
            address: address || null
        };

        console.log('Sending request:', requestData);

        const response = await fetch(`${API_BASE_URL}/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        // const data = await response.json();
        const text = await response.text();
    console.log("Raw server response:", text);

    let data;
    try {
    data = JSON.parse(text);
    } catch {
    data = { error: text };
    }

        if (response.ok) {
            // Show success message fdf df
            const confirmationDiv = document.getElementById('confirmation');
            const requestIdSpan = document.getElementById('requestId');
            
            if (confirmationDiv) {
                confirmationDiv.style.display = 'block';
            }
            if (requestIdSpan && data.request) {
                requestIdSpan.textContent = data.request.id;
            }
            
            // Reset form
            e.target.reset();
            document.getElementById('latitude').value = '';
            document.getElementById('longitude').value = '';
            
            showAlert('Request submitted successfully! You can track it in your dashboard.', 'success');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard';
            }, 2000);
        } else {
            showAlert(data.error || 'Request failed: ' + (data.message || 'Unknown error'), 'danger');
        }
    } catch (error) {
        console.error('Request error:', error);
        showAlert('Network error: ' + error.message, 'danger');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// NEW FUNCTION: Geocode address to coordinates using Nominatim
async function geocodeAddress(address) {
    try {
        // Add Philippines context + structured query
        const searchQuery = address.includes('Philippines') 
            ? address 
            : `${address}, Philippines`;
            
        const encodedAddress = encodeURIComponent(searchQuery);
        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodedAddress}` +
            `&format=json` +
            `&limit=5` +              // get top 5 results
            `&countrycodes=ph` +       //  restrict to Philippines only
            `&addressdetails=1`;       //  get structured address back
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TowTheRescue/1.0' // required by Nominatim
            }
        });
        
        const data = await response.json();
        console.log('Nominatim results:', data); // see what it returns
        
        if (data && data.length > 0) {
            // ✅ Pick the result closest to South Cotabato area
            const best = data.find(r => 
                parseFloat(r.lat) >= 6.0 && parseFloat(r.lat) <= 7.0 &&
                parseFloat(r.lon) >= 124.0 && parseFloat(r.lon) <= 126.0
            ) || data[0]; // fallback to first result
            
            console.log('Best match:', best.display_name, best.lat, best.lon);
            return {
                lat: parseFloat(best.lat),
                lng: parseFloat(best.lon),
                displayName: best.display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Get address from coordinates (reverse geocoding)
async function getAddressFromCoords(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return `${lat}, ${lng}`;
    }
}

// Get current location
async function getCurrentLocation() {
    const locationStatus = document.getElementById('locationStatus');
    const locationBtn = document.getElementById('getLocationBtn');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const addressInput = document.getElementById('address');

    if (!locationStatus) return;

    locationStatus.innerHTML = '📍 Getting location...';
    locationStatus.style.color = '#0066cc';
    if (locationBtn) locationBtn.disabled = true;

    if (!navigator.geolocation) {
        locationStatus.innerHTML = '❌ Geolocation is not supported by your browser';
        locationStatus.style.color = '#dc3545';
        if (locationBtn) locationBtn.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            if (latitudeInput) latitudeInput.value = lat;
            if (longitudeInput) longitudeInput.value = lng;

            locationStatus.innerHTML = '📍 Getting address...';
            
            // Get address from coordinates
            const address = await getAddressFromCoords(lat, lng);
            if (addressInput && address) {
                addressInput.value = address;
                locationStatus.innerHTML = '✅ Location captured successfully!';
                locationStatus.style.color = '#28a745';
            } else {
                locationStatus.innerHTML = '✅ Coordinates captured (enter address manually)';
                locationStatus.style.color = '#ffc107';
            }

            if (locationBtn) locationBtn.disabled = false;
        },
        (error) => {
            let errorMessage = 'Unable to get location. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please enable location services.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timeout.';
                    break;
                default:
                    errorMessage += 'Unknown error.';
            }
            locationStatus.innerHTML = `❌ ${errorMessage}`;
            locationStatus.style.color = '#dc3545';
            if (locationBtn) locationBtn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Add a "Search Address" button to manually geocode
function addSearchAddressButton() {
    const manualAddressDiv = document.querySelector('.manual-address');
    if (manualAddressDiv && !document.getElementById('searchAddressBtn')) {
        const searchBtn = document.createElement('button');
        searchBtn.id = 'searchAddressBtn';
        searchBtn.type = 'button';
        searchBtn.className = 'btn-secondary';
        searchBtn.style.marginTop = '10px';
        searchBtn.innerHTML = '🔍 Search Address';
        searchBtn.onclick = async () => {
            const addressInput = document.getElementById('address');
            const address = addressInput?.value;
            
            if (!address || !address.trim()) {
                showAlert('Please enter an address first', 'warning');
                return;
            }
            
            showAlert('Searching for address...', 'info');
            const coords = await geocodeAddress(address);
            
            if (coords) {
                document.getElementById('latitude').value = coords.lat;
                document.getElementById('longitude').value = coords.lng;
                showAlert('Address found! Coordinates saved.', 'success');
                
                const locationStatus = document.getElementById('locationStatus');
                if (locationStatus) {
                    locationStatus.innerHTML = '✅ Address geocoded successfully!';
                    locationStatus.style.color = '#28a745';
                }
            } else {
                showAlert('Address not found. Please try a different address.', 'warning');
            }
        };
        
        manualAddressDiv.appendChild(searchBtn);
    }
}

// Show alert message
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', function() {
    const emergencyForm = document.getElementById('emergencyForm');
    if (emergencyForm) {
        emergencyForm.addEventListener('submit', handleEmergencyRequest);
    }
    
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Add search button for manual address
    addSearchAddressButton();
});