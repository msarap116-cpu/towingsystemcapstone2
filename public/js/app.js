// Add app.js content from above (simplified version)
// Global variables

let loggedinUser = null;

// const API_BASE_URL = "http://localhost:3000/api";
const API_BASE_URL = "http://192.168.0.102:3000/api";
const LOCATIONIQ_API_KEY = 'pk.d0c02828c7c455983b75676c45e1f1bd';


// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Emergency request form
    const emergencyForm = document.getElementById('emergencyForm');
    if (emergencyForm) {
        emergencyForm.addEventListener('submit', handleEmergencyRequest);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Get location button
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
}

async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    });

    const data = await response.json();
    console.log(data);
}

// Load dashboard data
async function loadDashboardData() {
    if (!loggedinUser) return;
    
    const loadingDiv = document.getElementById('loading');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'none';
    
    try {
        const token = localStorage.getItem('token');
        
        // Load user's requests
        const response = await fetch(`${API_BASE_URL}/requests/my-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const requests = await response.json();
            displayRequests(requests);
        }
        
        // Load user profile
        const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (profileResponse.ok) {
            const profile = await profileResponse.json();
            updateProfileDisplay(profile);
        }
        
        // Return true to indicate success
        return true;
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Failed to load dashboard data', 'danger');
        throw error; // Re-throw to handle in the calling function
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
    }
}
// changing profile picturefd
const profileImage = document.getElementById("profileImage");
const profileUpload = document.getElementById("profileUpload");
const changePhotoBtn = document.getElementById("changePhotoBtn");

if(profileImage && profileUpload && changePhotoBtn){

    changePhotoBtn.addEventListener("click", () => {
        profileUpload.click();
    });

    profileUpload.addEventListener("change", function(){

        const file = this.files[0];

        if(file){

            const reader = new FileReader();

            reader.onload = function(e){

                profileImage.src = e.target.result;

                localStorage.setItem("profileImage", e.target.result);

            };

            reader.readAsDataURL(file);

        }

    });

    const savedImage = localStorage.getItem("profileImage");

    if(savedImage){
        profileImage.src = savedImage;
    }

}
// Display requests in dashboard
function displayRequests(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;
    
    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 text-muted"></i>
                <h4 class="mt-3">No requests yet</h4>
                <p>When you request assistance, it will appear here</p>
                <a href="emergency" class="btn btn-primary">Request Assistance</a>
            </div>
        `;
        return;
    }
    
    requestsList.innerHTML = requests.map(request => `
        <div class="request-item">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5 class="mb-1">${getServiceName(request.service_type)}</h5>
                    <p class="mb-1"><strong>Vehicle:</strong> ${request.vehicle_type} (${request.license_plate})</p>
                    <p class="mb-1"><strong>Location:</strong> ${request.address || 'Location not specified'}</p>
                    <p class="mb-0"><strong>Requested:</strong> ${formatDate(request.created_at)}</p>
                </div>
                <div class="text-end">
                    <span class="status-badge status-${request.status}">${request.status.replace('_', ' ')}</span>
                    <div class="mt-2">
                        <a href="request-details?id=${request.id}" class="btn btn-sm btn-outline-primary">View Details</a>
                    </div>
                </div>
            </div>
            ${request.driver_name ? `<p class="mt-2 mb-0"><strong>Driver:</strong> ${request.driver_name} (${request.driver_phone})</p>` : ''}
        </div>
    `).join('');
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    // Update navigation
    const loginLinks = document.querySelectorAll('.login-link');
    const logoutLinks = document.querySelectorAll('.logout-link');
    const userInfo = document.querySelectorAll('.user-info');
    
    loginLinks.forEach(link => link.style.display = 'none');
    logoutLinks.forEach(link => link.style.display = 'block');
    
    // Update user info
    userInfo.forEach(element => {
        if (element.id === 'userName') {
            element.textContent = loggedinUser.name;
        } else if (element.id === 'userType') {
            element.textContent = loggedinUser.role.charAt(0).toUpperCase() + loggedinUser.role.slice(1);
        }
    });
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const loginLinks = document.querySelectorAll('.login-link');
    const logoutLinks = document.querySelectorAll('.logout-link');
    
    loginLinks.forEach(link => link.style.display = 'block');
    logoutLinks.forEach(link => link.style.display = 'none');
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        loggedinUser = null;
        updateUIForLoggedOutUser();

        window.localStorage.clear();
        window.sessionStorage.clear();
        window.location.replace('home');
        // window.location.href = 'index';
    }
}


// Show alert message
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert-dismissible');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Utility functions
function getServiceName(serviceType) {
    const services = {
        'towing': 'Towing Service',
        'flat_tire': 'Flat Tire Change',
        'jump_start': 'Jump Start',
        'fuel': 'Fuel Delivery',
        'lockout': 'Lockout Service'
    };
    return services[serviceType] || serviceType;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function updateProfileDisplay(profile) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    
    if (profileName) profileName.textContent = profile.name;
    if (profileEmail) profileEmail.textContent = profile.email;
    if (profilePhone) profilePhone.textContent = profile.phone;
}

//get current location
function getCurrentLocation() {
    const status = document.getElementById('locationStatus');

    if (!navigator.geolocation) {
        status.textContent = "Geolocation not supported";
        return;
    }

    status.textContent = "Getting location...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('latitude').value = position.coords.latitude;
            document.getElementById('longitude').value = position.coords.longitude;

            status.textContent = "Location captured ✅";
        },
        () => {
            status.textContent = "Failed to get location ❌";
        }
    );
}
// // usermap in dashboard
// async function loadUserMap() {
//     try {
//         const token = localStorage.getItem('token');
//         console.log("Token from loadUserMap:",token);

//         console.log(JSON.stringify(localStorage));
//         // or loop through it:
//           for (let i = 0; i < localStorage.length; i++) {
//           const key = localStorage.key(i);
//              console.log(key, ":", localStorage.getItem(key));
//             }

//         if (!token) {
//             console.error("No token found. User might not be logged in.");
//              return;
//                }

//         const response = await fetch(`${API_BASE_URL}/requests/latest`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
            
//         });

//         // console.log("API_BASE_URL:", API_BASE_URL); // Add this temporarily
       
//         if (!response.ok) {
//              const errBody = await response.text(); // or response.json()
//                 throw new Error(`Failed to fetch location: ${response.status} - ${errBody}`);
//         }

//         const data = await response.json();

//         //  No data case
//         if (!data || !data.location_lat || !data.location_lng) {
//             console.log("No location data found");
//             return;
//         }
        
//         const lat = parseFloat(data.location_lat);
//         const lng = parseFloat(data.location_lng);

//         //  Initialize map
//         const map = L.map('map').setView([lat, lng], 15);

//         //  LocationIQ tiles
//         L.tileLayer(`https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_API_KEY}`, {
//             attribution: '&copy; OpenStreetMap contributors'
//         }).addTo(map);

//         // Marker (user request location)
//         L.marker([lat, lng])
//             .addTo(map)
//             .bindPopup(data.address || "Request Location")
//             .openPopup();
       
    
//         } catch (error) {
//         console.error('Map load error:', error);
//     }
// }


// //  DOMContentLoaded
// document.addEventListener('DOMContentLoaded', function () {
//     // checkAuthStatus();
//     setupEventListeners();

//     if (
//         window.location.pathname.includes('dashboard') ||
//         window.location.pathname.includes('admin-dashboard') 
//     ) {
//         // First load dashboard data, THEN load the map
//         loadDashboardData().then(() => {
//             displayUserInfo(); // show username in sidebar
            
//             // if (document.getElementById('map'));
//             if (document.getElementById('map') && !window.location.pathname.includes('driver-dashboard')) {
//                 loadUserMap();
                
//             }
//         }).catch(error => {
//             console.error('Failed to load dashboard:', error);
//         });
//     }
// });

// how it works modal
const howBtn = document.getElementById("howItWorksBtn");
const modal = document.getElementById("howItWorksModal");
const closeBtn = document.querySelector(".close-btn");

if (howBtn && modal && closeBtn) {
    howBtn.onclick = function () {
        modal.style.display = "block";
    };

    closeBtn.onclick = function () {
        modal.style.display = "none";
    };

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };
}

