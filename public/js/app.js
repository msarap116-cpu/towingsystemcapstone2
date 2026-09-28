
//D:towing_system1/public/js/app.js
let loggedinUser = null;

// const API_BASE_URL = "http://localhost:3000/api";
const API_BASE_URL = "https://goodwrench-towing-rescue.onrender.com/api";

async function apiFetch(endpoint, options = {}) {
    try {
        const token = sessionStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            cache: 'no-store'
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));

            if (error.code === 'SESSION_REPLACED' || error.code === 'SESSION_EXPIRED') {
                sessionStorage.removeItem('token');
                showAlert('You have been logged out because this account was signed in elsewhere.', 'error');
                window.location.replace('login');
                return;
            }

            throw new Error(error.message || 'API request failed');
        }

        const text = await response.text();
        if (!text.trim()) return [];
        return JSON.parse(text);
    } catch (error) {
        console.error('API Error:', error);
        showAlert(error.message, 'error');
        throw error;
    }
}

function setupEventListeners() {

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

// async function loginUser(email, password) {
//     const response = await fetch(`${API_BASE_URL}/users/login`, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             email,
//             password
//         })
//     });

//     const data = await response.json();
//     console.log(data);
// }

// Load dashboard data
async function loadDashboardData(silent = false) {
    if (!loggedinUser) return;

    const loadingDiv = document.getElementById('loading');
    const dashboardContent = document.getElementById('dashboardContent');

    // Only show loading screen if NOT silent
    if (!silent) {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }

    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/requests/my-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
         cache: 'no-store'

        if (response.ok) {
            const requests = await response.json();
            displayRequests(requests);
        }
        // ... rest of your profile fetch code ...
        return true;
    } catch (error) {
        console.error('Dashboard load error:', error);
    } finally {
        if (!silent) {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (dashboardContent) dashboardContent.style.display = 'block';
        }
    }
}

// changing profile picturefd
const profileImage = document.getElementById("profileImage");
const profileUpload = document.getElementById("profileUpload");
const changePhotoBtn = document.getElementById("changePhotoBtn");

if (profileImage && profileUpload && changePhotoBtn) {

    changePhotoBtn.addEventListener("click", () => {
        profileUpload.click();
    });

    profileUpload.addEventListener("change", function () {

        const file = this.files[0];

        if (file) {

            const reader = new FileReader();

            reader.onload = function (e) {

                profileImage.src = e.target.result;

                sessionStorage.setItem("profileImage", e.target.result);

            };

            reader.readAsDataURL(file);

        }

    });

    const savedImage = sessionStorage.getItem("profileImage");

    if (savedImage) {
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
async function handleLogout() {

    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    const token = sessionStorage.getItem('token');

    try {

        if (token) {

            const response = await fetch(
                `${API_BASE_URL}/users/logout`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }, cache: 'no-store'
                }

            );

            const data = await response.json();

            console.log(
                'Logout:',
                response.status,
                data
            );
        }

    } catch (error) {

        console.error(
            'Logout request failed:',
            error
        );

    } finally {

        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');

        loggedinUser = null;

        updateUIForLoggedOutUser();

        sessionStorage.clear();

        window.location.replace('/home');
    }
}


// Show alert message
function showAlert(msg, type = 'info') {
    let container = document.getElementById('alertContainer');

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';
        document.body.appendChild(container);

        // Position container at TOP CENTER with margin from the top
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 90%;
            max-width: 200px;
            pointer-events: none;
        `;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = ` ${msg}`;

    // Alert box styling
    alertDiv.style.cssText = `
        padding: 10px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 500;
        text-align: left;
    `;

    // Correct colors with good contrast
    switch (type) {
        case 'success':
            alertDiv.style.backgroundColor = '#d4edda';
            alertDiv.style.color = '#155724';
            break;
        case 'danger':
            alertDiv.style.backgroundColor = '#f8d7da';
            alertDiv.style.color = '#721c24';
            break;
        case 'warning':
            alertDiv.style.backgroundColor = '#fff3cd';
            alertDiv.style.color = '#856404';
            break;
        default: // info
            alertDiv.style.backgroundColor = '#e2f3fd';
            alertDiv.style.color = '#0c5460';
            break;
    }

    container.appendChild(alertDiv);

    // Auto remove after 2.8 seconds
    setTimeout(() => {
        alertDiv.remove();
        // Remove container when empty
        if (container.children.length === 0) container.remove();
    }, 2800);
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

            status.textContent = "Location captured  ";
        },
        () => {
            status.textContent = "Failed to get location ";
        }
    );
}

//here is the Modal opening and closing functionnnnnnnnnn!!!!

//open any modal by its ID
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

//close any modal by its ID
// function hideModal(modalId){
//     const modal = document.getElementById(modalId);
//     if(hideModal) modal.style.display = 'none';
// }

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');   // correct class
    modal.style.display = '';           // clear any leftover inline style
}

//Optional dw ni kung gusto mo lang e reuse tong existing code mow
function closeModal(modalId) {
    hideModal(modalId);
}

const howBtn = document.getElementById('howItWorksNav');
const closeBtn = document.getElementById('closeModalBtn');
if (howBtn) {
    howBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showModal('howModal');
    })
}
if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('howModal');
    })
}


function showToast(message, isError = false) {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;
    toast.style.backgroundColor = isError ? '#b91c1c' : '#0f5c6e';
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2800);
}

const emergencyNav = document.getElementById('emergencyNavBtn');
if (emergencyNav) {
    emergencyNav.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('🆘 24/7 emergency towing: our nearest driver is being located. Please share your location for immediate dispatch.');
    });
}

const heroDesc = document.querySelector('.hero-description');
if (heroDesc) {
    heroDesc.innerHTML = 'Colossians 3:23 –<strong> "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters".</strong>.';
}

// smooth scroll for
document.querySelectorAll('a[href="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        if (anchor.getAttribute('href') === '#') {
            if (anchor.innerText.includes('Services') || anchor.innerText.includes('services')) {
                e.preventDefault();
                document.getElementById('servicesSection')?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});

(function setupSessionProtection() {

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {

        const response = await originalFetch.apply(this, args);

        if (response.status !== 401) {
            return response;
        }

        try {

            const data = await response.clone().json();

            // ONLY handle another-login situation
            if (data.code === 'SESSION_REPLACED') {

                console.warn(
                    'Session replaced by another login.'
                );

                if (
                    !sessionStorage.getItem('sessionRedirecting')
                ) {

                    sessionStorage.setItem(
                        'sessionRedirecting',
                        'true'
                    );

                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');

                    window.dispatchEvent(
                        new CustomEvent('sessionReplaced')
                    );

                    alert(
                        'Your account was logged in on another browser or device. You have been logged out.'
                    );

                    window.location.href = '/login';
                }
            }

        } catch (error) {

            console.warn(
                'Could not read authentication response:',
                error
            );
        }

        return response;
    };


})();

//uploading the pictuere
window.uploadProfilePicture = async function(file) {

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('You are not logged in.');
        return;
    }

    const formData = new FormData();

    formData.append('profile_picture', file);

    try {

        const response = await fetch(
            `${API_BASE_URL}/users/profile-picture`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to upload profile picture.'
            );
        }

        console.log('Profile picture uploaded:', data);

        const avatarImage =
            document.getElementById('avatarImage');

        const avatarInitials =
            document.getElementById('avatarInitials');

        if (data.profile_picture) {

            avatarImage.src =
                `${API_BASE_URL.replace('/api', '')}/${data.profile_picture}`;

            avatarImage.style.display = 'block';
            avatarInitials.style.display = 'none';
        }

        alert('Profile picture updated successfully.');

    } catch (error) {

        console.error(
            'Profile picture upload error:',
            error
        );

        alert(error.message);
    }
};
window.initializeProfilePicture = function() {

    const avatarEditButton =
        document.getElementById('avatarEditButton');

    const profilePictureInput =
        document.getElementById('profilePictureInput');

    const profileAvatar =
        document.getElementById('profileAvatar');

    if (
        !avatarEditButton ||
        !profilePictureInput ||
        !profileAvatar
    ) {
        return;
    }

    avatarEditButton.addEventListener('click', (e) => {
        e.stopPropagation();
        profilePictureInput.click();
    });

    profileAvatar.addEventListener('click', () => {
        profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', async () => {

        const file = profilePictureInput.files[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            alert('Please select a JPG, PNG, or WEBP image.');
            profilePictureInput.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be smaller than 5 MB.');
            profilePictureInput.value = '';
            return;
        }

        await window.uploadProfilePicture(file);

        profilePictureInput.value = '';
    });
};
window.loadUserProfile = async function () {

    try {

        const user = await apiFetch('/users/profile');

        console.log('👤 Loaded user profile:', user);

        const nameElement =
            document.getElementById('profileName');

        const avatarImage =
            document.getElementById('avatarImage');

        const avatarInitials =
            document.getElementById('avatarInitials');


        // NAME


        if (nameElement && user.name) {
            nameElement.textContent = user.name;
        }


        // PROFILE PICTURE


        if (avatarImage && avatarInitials) {

            if (user.profile_picture) {

                const imageUrl =
                    `${API_BASE_URL.replace('/api', '')}/${user.profile_picture}`;

                // console.log(
                //     '🖼️ Profile picture URL:',
                //     imageUrl
                // );

                avatarImage.src = imageUrl;

                avatarImage.style.display = 'block';
                avatarInitials.style.display = 'none';

            } else {

                avatarImage.style.display = 'none';
                avatarInitials.style.display = 'block';

                avatarInitials.textContent =
                    getInitials(user.name);
            }
        }

    } catch (error) {

        console.error(
            '❌ Error loading user profile:',
            error
        );
    }
};
function getInitials(name) {

    if (!name) {
        return 'AD';
    }

    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
}
document.addEventListener('DOMContentLoaded', () => {

    const token = sessionStorage.getItem('token');

    // Only initialize profile features when logged in
    if (token) {
        loadUserProfile();
        initializeProfilePicture();
    }

});

