// admin-dashboard.js
// const API_BASE_URL = 'http://localhost:3000/'; // Replace with your actual API URL
let currentPage = 1;
const itemsPerPage = 5;
let currentDeleteId = null;
let requests = []; // Will be populated from database
let filteredRequests = [];
let requestToDelete = null; // track which ID is pending deletion

// Call this from your table button
function confirmDelete(request_id) {
    requestToDelete = request_id;
    document.getElementById('deleteModal').style.display = 'flex'; // show your confirm modal
}

// This fires when the user clicks the confirm button 1
async function deleteRequest() {
    if (!requestToDelete) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/requests/${requestToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to delete request');

        document.getElementById('deleteModal').style.display = 'none';
        requestToDelete = null;
        showAlert('Request deleted successfully', 'success');
        loadRequests(); // refresh your table
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Failed to delete request', 'error');
    }
}

document.getElementById('confirmDeleteBtn').addEventListener('click', deleteRequest);
// Fetch requests from database
async function fetchRequests() {
    showLoading(true);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/requests`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        
        const data = await response.json();
        requests = data.requests; // Assuming your API returns { requests: [...] }
        filteredRequests = [...requests];
        // document.getElementById('tableContainer').style.display = 'block';
        
        console.log("fetch data(admin-dashboard):", data);
        console.log("requests array:", data.requests);
        console.log("is array?", Array.isArray(data.requests));
        
        displayRequests();
        updateStatistics();
    } catch (error) {
        console.error('Error fetching requests:', error);
        showAlert('Failed to load requests', 'error');
    } finally {
        showLoading(false);
    }
}

// Filter requests locally (you can also implement server-side filtering)
function filterRequests() {
    const term = document.getElementById('searchInput').value.toLowerCase();

    filteredRequests = requests.filter(request =>
        (request.request_id && request.request_id.toString().includes(term)) ||
        (request.customer_name && request.customer_name.toLowerCase().includes(term)) ||
        (request.customer_phone && request.customer_phone.toLowerCase().includes(term)) ||
        (request.service_type && request.service_type.toLowerCase().includes(term)) ||
        (request.vehicle_type && request.vehicle_type.toLowerCase().includes(term)) ||
        (request.location && request.location.toLowerCase().includes(term))
    );

    console.log("Filtered:", filteredRequests);

    currentPage = 1;
    displayRequests();
}

// Display requests in table
function displayRequests() {
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedRequests = filteredRequests.slice(start, end);

    const tableBody = document.getElementById('tableBody');
    const loading = document.getElementById('loading');
    const tableContainer = document.getElementById('tableContainer');
    const noData = document.getElementById('noData');
console.log("AT DISPLAY:", filteredRequests);
    if (filteredRequests.length === 0) {
        loading.style.display = 'none';
        tableContainer.style.display = 'none';
        noData.style.display = 'block';
        return;
    }
    tableContainer.style.display = 'block';
    noData.style.display = 'none';
    loading.style.display = 'none';

    loading.style.display = 'none';
    tableContainer.style.display = 'block';
    noData.style.display = 'none';

    tableBody.innerHTML = paginatedRequests.map(request => `
    <tr>
        <td>#${request.request_id}</td>
        <td>${request.customer_name || 'N/A'}</td>
        <td>${request.customer_phone || 'N/A'}</td>
        <td>${formatServiceType(request.service_type)}</td>
        <td>${request.location || 'N/A'}</td>
        <td>
            <span class="status-badge status-${request.status}">
                ${request.status.toUpperCase()}
            </span>
        </td>
        <td>${formatDate(request.created_at)}</td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-view" onclick="viewRequest(${request.request_id})">View</button>
                <button class="btn btn-edit" onclick="editRequest(${request.request_id})">Edit</button>
                <button class="btn btn-delete" onclick="confirmDelete(${request.request_id})">Delete</button>
            </div>
        </td>
    </tr>
`).join('');
       
    displayPagination();
     console.log("Paginated requests:", paginatedRequests);
        console.log("filtered:", filteredRequests.length);
        console.log("start:", start, "end:", end);
        console.log("paginated:", paginatedRequests);
        console.log("RAW REQUESTS:", requests);
}

// Format service type
function formatServiceType(type) {
    const types = {
        'towing': 'Towing',
        'jumpstart': 'Jump Start',
        'tire': 'Tire Change',
        'fuel': 'Fuel Delivery',
        'lockout': 'Lockout'
    };
    return types[type] || type;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Display pagination
function displayPagination() {
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let buttons = '';
    
    // Previous button
    buttons += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons += `<button disabled>...</button>`;
        }
    }
    
    // Next button
    buttons += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    
    pagination.innerHTML = buttons;
}

// Change page
function changePage(page) {
    currentPage = page;
    displayRequests();
}

// Show/hide loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    const tableContainer = document.getElementById('tableContainer');
    const noData = document.getElementById('noData');
    
    if (show) {
        loading.style.display = 'block';
        tableContainer.style.display = 'none';
        noData.style.display = 'none';
    } else {
        loading.style.display = 'none';

        // ✅ ADD THIS
        if (filteredRequests && filteredRequests.length > 0) {
            tableContainer.style.display = 'block';
        }
    }
}

// Update statistics (local update, but you can also refetch from server)
function updateStatistics() {
    // You can either update locally or refetch from server
    document.getElementById('totalRequests').textContent = requests.length;
    document.getElementById('activeRequests').textContent =
    requests.filter(r =>
        r.status === 'assigned' || r.status === 'in progress'
    ).length;
    document.getElementById('pendingRequests').textContent = requests.filter(r => r.status === 'pending').length;
    
    // For server data, call fetchStatistics() instead
}

// View request details
async function viewRequest(request_id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/requests/${request_id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch request details');
        }
        
        const request = await response.json();
        
        const details = document.getElementById('viewDetails');
        details.innerHTML = `
            <p><strong>ID:</strong> #${request.request_id}</p>
            <p><strong>Customer:</strong> ${request.customer_name}</p>
            <p><strong>Phone:</strong> ${request.customer_phone}</p>
            <p><strong>Service:</strong> ${formatServiceType(request.service_type)}</p>
            <p><strong>Location:</strong> ${request.location}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span></p>
    
            <p><strong>Created:</strong> ${formatDate(request.created_at)}</p>
        `;
        document.getElementById('viewModal').style.display = 'flex';
    } catch (error) {
        console.error('Error fetching request details:', error);
        showAlert('Failed to load request details', 'error');
    }
}

// Open add modal
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Request';
    document.getElementById('requestForm').reset();
    document.getElementById('requestId').value = '';
    document.getElementById('requestModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('requestModal').style.display = 'none';
}

// Close view modal
function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

// Edit request
async function editRequest(request_id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/requests/${request_id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch request details');
        }
        
        const request = await response.json();
        
        document.getElementById('modalTitle').textContent = 'Edit Request';
 //Now these will all work correctly
document.getElementById('requestId').value      = request.request_id;
document.getElementById('customerName').value   = request.customer_name;
document.getElementById('customerPhone').value  = request.customer_phone;
document.getElementById('serviceType').value    = request.service_type;
document.getElementById('location').value       = request.location;
document.getElementById('status').value         = request.status;   // sr.status

        document.getElementById('requestModal').style.display = 'flex';
    } catch (error) {
        console.error('Error fetching request details:', error);
        showAlert('Failed to load request details', 'error');
    }
}

// Save request (Create or Update)
async function saveRequest() {
    const id = document.getElementById('requestId').value;
    const requestData = {
        customer_name: document.getElementById('customerName').value,
        customer_phone: document.getElementById('customerPhone').value,
        service_type: document.getElementById('serviceType').value,
        location: document.getElementById('location').value,
        status: document.getElementById('status').value,
    };

    try {
        const token = localStorage.getItem('token');
        const url = id ? `${API_BASE_URL}/requests/${id}` : `${API_BASE_URL}/requests`; // ✅ fixed
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error('Failed to save request');

        showAlert(id ? 'Request updated successfully!' : 'Request added successfully!', 'success');

       await fetchRequests();    // reloads just the requests table    // ✅ replace fetchRequests() with your actual function name
        // await fetchStatistics();  // ✅ fix or remove this too

        closeModal();
    } catch (error) {
        console.error('Error saving request:', error);
        showAlert('Failed to save request', 'error');
    }
}

// Confirm delete
function confirmDelete(user_id) {
    currentDeleteId = user_id;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    currentDeleteId = null;
}

// Delete request
// async function deleteRequest() {
//     if (!currentDeleteId) return;
    
//     try {
//         const token = localStorage.getItem('token');
//         const response = await fetch(`${API_BASE_URL}/requests/${currentDeleteId}`, {
//             method: 'DELETE',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         if (!response.ok) {
//             throw new Error('Failed to delete request');
//         }

//         showAlert('Request deleted successfully!', 'success');
        
//         // Refresh data
//         await fetchRequests();
//         await fetchStatistics();
        
//         closeDeleteModal();
//     } catch (error) {
//         console.error('Error deleting request:', error);
//         showAlert('Failed to delete request', 'error');
//     }
// }
// //load the users into table
// async function loadUsers() {

//     const token = localStorage.getItem('token');

//     try {
        
//         console.log("token",token);//debug fatasm

//         const res = await fetch('/api/users', {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });

//         if (!res.ok) {
//             throw new Error('Failed to fetch users');
//         }

//         const users = await res.json();
//         console.log("Users:", users);

//         const tbody = document.getElementById('usersTableBody');
//         tbody.innerHTML = '';

//         users.forEach(user => {

//             const row = `
//             <tr>
//                 <td>${user.id}</td>
//                 <td>${user.name}</td>
//                 <td>${user.email}</td>
//                 <td>${user.phone}</td>
//                 <td>${user.role}</td>
//                 <td>
//                     <button onclick="editUser(${user.id})" class="btn btn-primary">Edit</button>
//                     <button onclick="deleteUser(${user.id})" class="btn btn-delete">Delete</button>
//                 </td>
//             </tr>
//             `;

//             tbody.innerHTML += row;
//         });

//     } catch (error) {
//         console.error("Error loading users:", error);
//     }
// }
//save users ngain
async function saveUser() {

    const id = document.getElementById('userId').value;

    const data = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        role: document.getElementById('userRole').value,
        password:document.getElementById('password').value
    };

    const url = id ? `/api/users/${id}` : `/api/users`;
    const method = id ? 'PUT' : 'POST';

    // await fetch(url, {
    //     method: method,
    //     headers: {
    //         'Content-Type':'application/json',
    //         'Authorization':`Bearer ${localStorage.getItem('token')}`
    //     },
    //     body: JSON.stringify(data)
    // });
    const response = await fetch(url, {
    method: method,
    headers: {
        'Content-Type':'application/json',
        'Authorization':`Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(data)
});

const result = await response.json();
console.log("Server response:", result);

if (!response.ok) {
    throw new Error(result.error || "Update failed");
}

    closeUserModal();
    loadUsers();
}
//edit user daw
async function editUser(id) {
    try {
        const res = await fetch(`/api/users/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const user = await res.json();

        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userPhone').value = user.phone;
        document.getElementById('userRole').value = user.role;

        openUserModal();

    } catch (error) {
        console.error("Error fetching user:", error);
    }
}
// Show alert
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}
async function deleteUser(id){

    if(!confirm("Delete this user?")) return;

    await fetch(`/api/users/${id}`,{
        method:'DELETE',
        headers:{
            'Authorization':`Bearer ${localStorage.getItem('token')}`
        }
    });

    loadUsers();
}
//open and close modal
function openUserModal(){
    document.getElementById('userModal').style.display='block';
}

function closeUserModal(){
    document.getElementById('userModal').style.display='none';
}
// Logout
function logout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    window.location.replace('login');
}


let allUsers = []; // store users globally

async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/users', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const users = await res.json();

        allUsers = users; // store globally for filtering
        displayUsers(users);
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    users.forEach(user => {
        tbody.innerHTML += `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.role}</td>
            <td>
                <button onclick="editUser(${user.id})" class="btn btn-primary">Edit</button>
                <button onclick="deleteUser(${user.id})" class="btn btn-delete">Delete</button>
            </td>
        </tr>
        `;
    });
}

// New function to filter users
function filterUsers() {
    const term = document.getElementById('userSearch').value.toLowerCase();

    const filtered = allUsers.filter(user =>
        (user.user_id && user.user_id.toString().includes(term)) || // ✅ ID search
        (user.name && user.name.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.phone && user.phone.toLowerCase().includes(term)) ||
        (user.role && user.role.toLowerCase().includes(term))
    );

    displayUsers(filtered);
}
// Make functions global for onclick events
window.openAddModal = openAddModal;
window.closeModal = closeModal;
window.viewRequest = viewRequest;
window.closeViewModal = closeViewModal;
window.editRequest = editRequest;
window.saveRequest = saveRequest;
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.filterRequests = filterRequests;
window.changePage = changePage;


// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    //userSearch
    const userSearchInput = document.getElementById('userSearch');
    userSearchInput.addEventListener('input', filterUsers);
    if (!token || user.role !== 'admin') {
        window.location.replace('login');
        return;
    }
    
    // Set admin info from localStorage
    if (user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('userInitials').textContent = initials || 'A';
        document.getElementById('adminName').textContent = user.name;
        document.getElementById('adminEmail').textContent = user.email || '';
    }

    // Load data from database
    fetchRequests();
    // fetchStatistics();
    
    // Add event listeners
    document.getElementById('searchInput').addEventListener('input', filterRequests);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteRequest);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Close modals when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('requestModal');
        const viewModal = document.getElementById('viewModal');
        const deleteModal = document.getElementById('deleteModal');
        
        if (event.target === modal) {
            closeModal();
        }
        if (event.target === viewModal) {
            closeViewModal();
        }
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    }
});

// loadUsers();
document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
});
//for profile
const savedImage = localStorage.getItem("profileImage");

if(savedImage){
    document.getElementById("profileImage").src = savedImage;
}