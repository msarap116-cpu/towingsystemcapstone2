// ===== WRAP EVERYTHING IN DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function () {

    //  DATA STORE (Will be populated from API)
    let requests = [];
    let drivers = [];
    let customers = [];
    let payments = [];
    let map, markersList = [];
    let admins = [];

    let servicesCache = [];


    //  OVERFLOW DROPDOWN — Google-Drive-style floating menu

    let activeDropdown = null;
    let activeMenu     = null;

function closeAllDropdowns() {
    // Hide EVERY dropdown currently in <body> or inside a menu
    document.querySelectorAll('.overflow-dropdown').forEach(el => {
        el.style.display = 'none';
    });

    // Remove the active class from any open menu
    document.querySelectorAll('.overflow-menu.active').forEach(m => {
        m.classList.remove('active');
    });

    activeDropdown = null;
    activeMenu     = null;
}

function openDropdown(trigger) {
    const menu = trigger.closest('.overflow-menu');
    if (!menu) return;

    const dropdown = menu.querySelector('.overflow-dropdown');
    if (!dropdown) return;

    // 1. Add the active class to make it visible (display: block)
    menu.classList.add('active');

    // 2. Get the exact position of the button
    const rect = trigger.getBoundingClientRect();

    // 3. Calculate position (below the button, aligned to the left)
    // We add 8px so it doesn't touch the button directly
    let top = rect.bottom + 8;
    let left = rect.left;

    // 4. Prevent it from going off the right side of the screen
    // (Assuming max-width is 280px)
    if (left + 280 > window.innerWidth) {
        left = window.innerWidth - 290;
    }

    // 5. Prevent it from going off the bottom of the screen
    // If there's not enough room below, open it upwards instead
    if (top + dropdown.offsetHeight > window.innerHeight) {
        top = rect.top - dropdown.offsetHeight - 8;
    }

    // 6. Apply the calculated positions directly to the element
    dropdown.style.top = top + 'px';
    dropdown.style.left = left + 'px';
}

    // ---------- One delegated click handler for the whole page ----------
    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('.overflow-trigger');
        const item    = e.target.closest('.dropdown-item');

        if (trigger) {
            const menu    = trigger.closest('.overflow-menu');
            const wasOpen = menu && menu.classList.contains('active');

             console.log("Was it open?", wasOpen); // Is this true when it should be false?

            closeAllDropdowns();
            if (!wasOpen) openDropdown(trigger);
            return;
        }

        if (item) {
            setTimeout(closeAllDropdowns, 0);
            return;
        }

        closeAllDropdowns();
    });

    // Close on meaningful scroll or resize
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (Math.abs(window.scrollY - lastScrollY) < 4) return;
        lastScrollY = window.scrollY;
        closeAllDropdowns();
    }, true);
    window.addEventListener('resize', closeAllDropdowns);

    // Remove dropdowns left in <body> whose trigger no longer exists
    function pruneOrphanDropdowns() {
        document.querySelectorAll('body > .overflow-dropdown').forEach(el => {
            const id = el.dataset.menuId;
            if (!id || !document.querySelector(`.overflow-trigger[data-menu-id="${CSS.escape(id)}"]`)) {
                el.remove();
            }
        });
    }
    window.pruneOrphanDropdowns = pruneOrphanDropdowns;


    //  LOAD DATA FUNCTIONS


    window.loadRequests = async function () {
        try {
            const data = await apiFetch("/admin/requests");

            requests = Array.isArray(data)
                ? data
                : data.requests || [];

            renderRequests(requests);

            if (map) {
                updateMapMarkers();
            }

        } catch (err) {
            console.error("Failed to load requests:", err);
        }
    };

    async function loadDrivers() {
        try {
            drivers = await apiFetch("/admin/drivers");
            renderDrivers();
            await loadAdmins();
            if (map) {
                updateMapMarkers();
            }
        } catch (err) {
            console.error("Failed to load drivers:", err);
            showAlert("Could not load drivers", "danger");
        }
    }

    async function loadCustomers() {
        try {
            customers = await apiFetch('/admin/customers');
            renderCustomers(customers);
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    }

    async function loadAdmins() {
        try {
            const result = await apiFetch("/admin/admins");
            admins = result.admins || [];
            renderAdmins();
        } catch (error) {
            console.error("Failed to load admins:", error);
            showAlert("Could not load admins", "danger");
        }
    }

    window.loadPayments = async function () {
        try {
            payments = await apiFetch('/admin/payments');
            renderPayments();
        } catch (err) {
            console.error('Failed to load payments:', err);
            showAlert('Could not load payments', 'danger');
        }
    };

    async function loadPendingPayments() {
        const token = sessionStorage.getItem('token');

        const response = await fetch(
            `${API_BASE_URL}/payments/pending`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!data.success) {
            console.error(data.message);
            return;
        }

        console.log('Pending payments:', data.payments);
    }

    let requestsPollingInterval = null;

    function startRequestsPolling() {
        if (requestsPollingInterval) {
            clearInterval(requestsPollingInterval);
        }

        requestsPollingInterval = setInterval(async () => {
            await loadRequests();
        }, 5000);
    }

    function initMap() {
        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded!');
            return;
        }

        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found!');
            return;
        }

        map = L.map('map').setView([6.5000, 124.8469], 13);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '© TowTrack' }
        ).addTo(map);

        updateMapMarkers();
        loadRequests();
        loadDrivers();
    }

    function updateMapMarkers() {
        if (!map) return;
        markersList.forEach(m => map.removeLayer(m));
        markersList = [];
        const bounds = [];

        const getRequestIconUrl = (status) => {
            switch (status) {
                case 'pending': return 'image/waypoint-red.png';
                case 'assigned': return 'image/waypoint-blue.png';
                case 'in progress': return 'image/waypoint-blue.png';
                default: return 'image/waypoint-red.png';
            }
        };

        const getDriverIconUrl = (map_status) => {
            switch (map_status) {
                case 'online': return 'image/waypoint-green.png';
                case 'busy': return 'image/waypoint-yellow.png';
                default: return 'image/waypoint-green.png';
            }
        };

        const ICON_SIZE = [24, 24];

        // REQUESTS (Customers)
        requests
            .filter(req => ['pending', 'assigned', 'in progress'].includes(req.status))
            .forEach(req => {
                const lat = Number(req.location_lat);
                const lng = Number(req.location_lng);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                const iconUrl = getRequestIconUrl(req.status);

                const markerIcon = L.icon({
                    iconUrl: iconUrl,
                    iconSize: ICON_SIZE,
                    iconAnchor: [12, 24],
                    popupAnchor: [0, -24]
                });

                const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
                marker.bindPopup(`
                    <b>${req.status === 'pending' ? 'Pending Request' : 'Service Request'}</b>
                    <br>Request ID: ${req.request_id}
                    <br>Customer: ${req.customer_name || 'Unknown'}
                    <br>Status: ${req.status}
                `);
                markersList.push(marker);
                bounds.push([lat, lng]);
            });

        // DRIVERS
        drivers
            .filter(d => ['online', 'busy'].includes(d.map_status))
            .forEach(d => {
                const lat = Number(d.lat ?? d.latitude ?? d.driver_lat);
                const lng = Number(d.lng ?? d.longitude ?? d.driver_lng);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                const iconUrl = getDriverIconUrl(d.map_status);

                const markerIcon = L.icon({
                    iconUrl: iconUrl,
                    iconSize: ICON_SIZE,
                    iconAnchor: [12, 24],
                    popupAnchor: [0, -24]
                });

                const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
                marker.bindPopup(`
                    <b>${d.name || 'Driver'}</b>
                    <br>Vehicle: ${d.vehicle || 'N/A'}
                    <br>Status: ${d.status}
                    <br>Rating: ${d.rating || 'N/A'} ⭐
                `);
                markersList.push(marker);
                bounds.push([lat, lng]);
            });

        const KORONADAL = [6.4215, 124.7859];
        if (bounds.length > 0) {
            bounds.push(KORONADAL);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
        } else {
            map.setView(KORONADAL, 12);
        }
    }

    function refreshMapMarkers() {
        loadDrivers();
        loadRequests();
        showAlert("Map updated", "success");
    }


    //  RENDER: DRIVERS

    function renderDrivers() {
        const container = document.getElementById("driversListContainer");
        if (!container) return;

        if (!Array.isArray(drivers) || drivers.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:2rem; color:#666;">No drivers found</p>`;
            return;
        }

        container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Driver</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>

                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${drivers.map(d => `
                        <tr>
                            <td><strong>${d.name || 'Unnamed'}</strong></td>
                            <td>${d.phone || 'No phone'}</td>
                            <td>${d.email || 'No email'}</td>
                            <td>
                                <span class="status-${d.status || 'inactive'}">
                                    ${d.status || 'Inactive'}
                                </span>
                            </td>

                            <td>
                                <button class="btn-delete" onclick="deleteDriver(${d.user_id})" title="Delete driver">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }


    //  RENDER: CUSTOMERS

    function renderCustomers(dataToRender) {
        const tbody = document.getElementById('customersTable');
        if (!tbody) return;

        if (!Array.isArray(dataToRender) || dataToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">No customers found</td></tr>`;
            return;
        }

        tbody.innerHTML = dataToRender.map(c => `<tr>
            <td>${c.id}</td>
            <td>${c.name || '—'}</td>
            <td>${c.phone || '—'}</td>
            <td>${c.email || '—'}</td>
            <td>₱${Number(c.total_spent || 0).toFixed(2)}</td>
            <td>
                <div class="overflow-menu">
                    <button class="btn-icon overflow-trigger" data-menu-id="cust-${c.id}" title="Actions">⋮</button>
                    <div class="overflow-dropdown" data-menu-id="cust-${c.id}">
                        <button class="dropdown-item" onclick="editCustomer(${c.id})" title="Edit Customer"> Edit</button>
                        <button class="dropdown-item" onclick="deleteCustomer(${c.id})" title="Delete Customer" style="color: #dc3545;"> Delete</button>
                    </div>
                </div>
            </td>
        </tr>`).join('');

        pruneOrphanDropdowns();
    }

    function editCustomer(customerId) {
        const customer = customers.find(c => String(c.id) === String(customerId));
        if (!customer) {
            console.error('Customer not found:', customerId);
            return;
        }

        document.getElementById('editCustId').value = customer.id;
        document.getElementById('custName').value = customer.name || '';
        document.getElementById('custPhone').value = customer.phone || '';
        document.getElementById('custEmail').value = customer.email || '';

        document.getElementById('customerModal').style.display = 'flex';
    }

    window.deleteCustomer = async function (customerId) {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        try {
            await apiFetch(`/admin/customers/${customerId}`, { method: 'DELETE' });
            await loadCustomers();
            showAlert('Customer deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            showAlert('Failed to delete customer', 'danger');
        }
    };

    function openCustomerModal() {
        document.getElementById('editCustId').value = '';
        document.getElementById('customerForm').reset();
        document.getElementById('customerModal').style.display = 'flex';
    }

    window.viewCustomer = function (customerId) {
        const customer = customers.find(c => String(c.id) === String(customerId));
        if (!customer) {
            showAlert('Customer not found', 'danger');
            return;
        }

        document.getElementById('editCustId').value = customer.id;
        document.getElementById('custName').value = customer.name || '';
        document.getElementById('custPhone').value = customer.phone || '';
        document.getElementById('custEmail').value = customer.email || '';
        document.getElementById('customerModal').style.display = 'flex';
    };

    async function saveCustomer() {
        const id = document.getElementById('editCustId').value.trim();

        const data = {
            name: document.getElementById('custName').value.trim(),
            phone: document.getElementById('custPhone').value.trim(),
            email: document.getElementById('custEmail').value.trim()
        };

        try {
            if (id) {
                await apiFetch(`/admin/customers/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                await apiFetch('/admin/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }

            await loadCustomers();
            closeModal('customerModal');
            showAlert('Customer saved', 'success');
        } catch (error) {
            console.error('Failed to save customer:', error);
            showAlert('Failed to save customer', 'danger');
        }
    }


    //  RENDER: PAYMENTS

    function renderPayments() {
        const tbody = document.getElementById('paymentsTable');
        if (!tbody) return;

        if (!payments || payments.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:2rem;">
                    No payment records found
                </td>
            </tr>`;
            return;
        }

        tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.receipt || '—'}</td>
            <td>#${p.request_id || '—'}</td>
            <td>${p.customer || '—'}</td>
            <td>₱${Number(p.amount || 0).toFixed(2)}</td>
            <td>${p.payment_method || '—'}</td>
            <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</td>
            <td>
                <span class="status-badge status-${p.status || 'unknown'}">
                    ${p.status || '—'}
                </span>
            </td>
            <td>
                <div class="overflow-menu">
                    <button class="btn-icon overflow-trigger" data-menu-id="pay-${p.payment_id}" title="Actions">⋮</button>
                    <div class="overflow-dropdown" data-menu-id="pay-${p.payment_id}">
                        ${p.payment_method === 'cash'
                            ? `<span class="dropdown-item disabled">Awaiting driver confirmation</span>`
                            : `
                                <button class="dropdown-item" onclick="viewPaymentProof(${p.payment_id})">View Proof</button>
                                ${p.status === 'pending'
                                    ? `<button class="dropdown-item" onclick="approvePayment(${p.payment_id})">Approve</button>
                                       <button class="dropdown-item" onclick="rejectPayment(${p.payment_id})">Reject</button>`
                                    : ''}
                            `
                        }
                        <button class="dropdown-item text-danger" onclick="deletePayment(${p.payment_id})">
                            Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>
        `).join('');

        pruneOrphanDropdowns();
    }

    window.deletePayment = async function (paymentId) {
        if (!confirm('Are you sure you want to delete this payment record? This cannot be undone.')) return;

        try {
            await apiFetch(`/admin/payments/${paymentId}`, { method: 'DELETE' });
            showAlert('Payment deleted', 'success');
            await loadPayments();
        } catch (err) {
            console.error('Failed to delete payment:', err);
            showAlert('Could not delete payment', 'danger');
        }
    };

    const PAYMENT_LABELS = {
        completed: { cls: 'paid', text: 'Paid' },
        pending: { cls: 'pending', text: 'Pending' },
        awaiting_payment: { cls: 'pending', text: 'Awaiting Payment' },
        awaiting_cash: { cls: 'pending', text: 'Awaiting Cash' },
        failed: { cls: 'failed', text: 'Failed' },
        refunded: { cls: 'refunded', text: 'Refunded' },
    };

    function paymentBadge(status) {
        const p = PAYMENT_LABELS[status] || { cls: 'unpaid', text: 'No Payment' };
        return `<span class="payment-status ${p.cls}">${p.text}</span>`;
    }


    //  RENDER: REQUESTS

    function renderRequests(dataToRender) {
        const tbody = document.getElementById("requestsTable");
        if (!tbody) return;

        if (!Array.isArray(dataToRender) || dataToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem;">No service requests found</td></tr>`;
            return;
        }

        tbody.innerHTML = dataToRender.map(r => `
        <tr>
            <td><strong>#${r.request_id}</strong></td>
            <td>
                <div><strong>${r.customer_name || 'Unknown'}</strong></div>
            </td>
            <td style="max-width:300px; white-space:normal; word-wrap:break-word;">${r.location || 'Unknown'}</td>
            <td>${r.driver_name || '—'}</td>
            <td><span class="status-badge status-${r.status || 'pending'}">${r.status || 'pending'}</span></td>
            <td>${paymentBadge(r.payment_status)}</td>
            <td style="color:#666; font-size:0.9em;">${r.created_at || ''}</td>
            <td>
                <div class="overflow-menu">
                    <button class="btn-icon overflow-trigger" data-menu-id="req-${r.request_id}" title="Actions">⋮</button>
                    <div class="overflow-dropdown" data-menu-id="req-${r.request_id}">
                        ${!r.driver_id && r.status === 'pending'
                            ? `<button class="dropdown-item" onclick="openAssignDriverModal(${r.request_id})">Assign Driver</button>`
                            : ''
                        }

                        ${r.completion_photo_url
                            ? `<button
                                    class="dropdown-item view-completion-btn"
                                    data-url="${escapeHtml(r.completion_photo_url)}"
                                    data-request-id="${r.request_id}">
                                    Completion Photo
                               </button>`
                            : ''
                        }

                        <button class="dropdown-item" onclick="editRequest(${r.request_id})" title="Edit Request">
                            Edit Request
                        </button>

                        <button class="dropdown-item" onclick="viewCustomer(${r.user_id})" title="View Customer">
                            View Customer
                        </button>

                        <button class="dropdown-item" onclick="deleteRequest(${r.request_id})" title="Delete Request" style="color:#dc3545;">
                            Delete Request
                        </button>
                    </div>
                </div>
            </td>
        </tr>
        `).join("");

        pruneOrphanDropdowns();
    }


    //  SEARCH

    window.handleGlobalSearch = async function (term) {
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) clearBtn.style.display = term ? 'inline-block' : 'none';

        const matchedRequests = filterRequests(term);
        const matchedUsers = filterUsers(term);

        const activePanel = document.querySelector('.tab-panel.active')?.id;

        if (activePanel === 'requestsPanel') {
            renderRequests(matchedRequests);
        } else if (activePanel === 'usersPanel') {
            renderCustomers(matchedUsers);
        }

        updateSearchHint(term, activePanel, matchedRequests, matchedUsers);
    };

    function updateSearchHint(term, activePanel, matchedRequests, matchedUsers) {
        const hint = document.getElementById('searchHint');
        if (!hint) return;

        if (!term.trim()) {
            hint.style.display = 'none';
            return;
        }

        if (activePanel === 'requestsPanel' && matchedUsers.length > 0) {
            hint.style.display = 'block';
            hint.innerHTML = `${matchedUsers.length} matching customer(s) — <a href="#" onclick="switchPanel('usersPanel', 'Customers'); return false;">view</a>`;
        } else if (activePanel === 'usersPanel' && matchedRequests.length > 0) {
            hint.style.display = 'block';
            hint.innerHTML = `${matchedRequests.length} matching request(s) — <a href="#" onclick="switchPanel('requestsPanel', 'Service Requests'); return false;">view</a>`;
        } else {
            hint.style.display = 'none';
        }
    }

    window.clearGlobalSearch = function () {
        const input = document.getElementById('globalSearch');
        input.value = '';
        handleGlobalSearch('');
        input.focus();
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            document.getElementById('globalSearch').focus();
        }
    });

    function filterRequests(term) {
        term = (term || '').toLowerCase().trim();
        if (!term) return requests;
        return requests.filter(r =>
            String(r.request_id).includes(term) ||
            (r.customer_name || '').toLowerCase().includes(term) ||
            (r.customer_phone || '').toLowerCase().includes(term) ||
            (r.location || '').toLowerCase().includes(term) ||
            (r.driver_name || '').toLowerCase().includes(term) ||
            (r.status || '').toLowerCase().includes(term)
        );
    }

    function filterUsers(term) {
        term = (term || '').toLowerCase().trim();
        if (!term) return customers;
        return customers.filter(u =>
            (u.name || '').toLowerCase().includes(term) ||
            (u.phone || '').toLowerCase().includes(term) ||
            (u.email || '').toLowerCase().includes(term)
        );
    }

    function updateStats() {
        const statRequests = document.getElementById('statRequests');
        const statDrivers = document.getElementById('statDrivers');
        const statCompleted = document.getElementById('statCompleted');
        const statRevenue = document.getElementById('statRevenue');

        if (statRequests) statRequests.innerText = requests.length;
        if (statDrivers) statDrivers.innerText = drivers.filter(d => d.status !== 'offline').length;
        if (statCompleted) statCompleted.innerText = requests.filter(r => r.status === 'completed').length;
        if (statRevenue) {
            let pendingRev = requests
                .filter(r => r.status === 'completed' && r.payment !== 'paid')
                .reduce((s, r) => s + (Number(r.amount) || 0), 0);
            statRevenue.innerText = `$${pendingRev}`;
        }
    }


    //  REQUESTS CRUD

    function openRequestModal() {
        document.getElementById('editReqId').value = '';
        document.getElementById('requestForm').reset();
        document.getElementById('requestModal').style.display = 'flex';
    }

    function editRequest(reqId) {
        const req = requests.find(r => r.request_id === reqId);
        if (!req) return;

        document.getElementById('editReqId').value = req.request_id;
        document.getElementById('reqCustomer').value = req.customer_name || '';
        document.getElementById('reqPhone').value = req.customer_phone || '';
        document.getElementById('reqLocation').value = req.location || '';
        document.getElementById('reqService').value = req.service_type || 'Towing';
        document.getElementById('reqStatus').value = req.status || 'pending';
        document.getElementById('requestModal').style.display = 'flex';
    }

    async function saveRequest() {
        const request_id = document.getElementById('editReqId').value.trim();
        const data = {
            customer_name: document.getElementById('reqCustomer').value.trim(),
            customer_phone: document.getElementById('reqPhone').value.trim(),
            location: document.getElementById('reqLocation').value.trim(),
            service_type: document.getElementById('reqService').value,
            status: document.getElementById('reqStatus').value
        };

        try {
            if (request_id) {
                await apiFetch(`/admin/requests/${request_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showAlert("Request updated successfully", "success");
            } else {
                await apiFetch(`/admin/requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showAlert("New request added", "success");
            }

            await loadRequests();
            closeModal('requestModal');
        } catch (err) {
            console.error("Save error:", err);
            showAlert("Error saving request — check console", "danger");
        }
    }

    async function deleteRequest(reqId) {
        if (!confirm("Are you sure you want to delete this request? This cannot be undone.")) return;

        try {
            await apiFetch(`/admin/requests/${reqId}`, { method: 'DELETE' });
            showAlert("Request deleted successfully", "success");
            await loadRequests();
        } catch (err) {
            console.error("Delete error:", err);
            showAlert("Failed to delete request", "danger");
        }
    }

    async function markPayment(reqId) {
        if (!confirm("Mark this request as paid?")) return;
        try {
            await apiFetch(`/admin/payments/${reqId}/mark-paid`, { method: 'PATCH' });
            showAlert("Payment marked as paid", "success");
            await loadRequests();
            await loadPayments();
        } catch (err) {
            console.error("Failed to update payment:", err);
            showAlert("Error updating payment", "danger");
        }
    }


    //  DRIVERS CRUD

    function openDriverModal() {
        document.getElementById('editDriverId').value = '';
        document.getElementById('driverForm').reset();
        document.getElementById('driverStatusSelect').value = 'offline';
        document.getElementById('driverModal').style.display = 'flex';
    }

    function editDriver(id) {
        const d = drivers.find(x => Number(x.id) === Number(id));
        if (!d) {
            console.error('Driver not found:', id);
            return;
        }

        document.getElementById('editDriverId').value = d.id;
        document.getElementById('driverName').value = d.name || '';
        document.getElementById('driverPhone').value = d.phone || '';
        document.getElementById('driverEmail').value = d.email || '';
        document.getElementById('driverPassword').value = '';
        document.getElementById('driverStatusSelect').value = d.status || 'offline';
        document.getElementById('driverModal').style.display = 'flex';
    }

    async function saveDriver() {
        const id = document.getElementById('editDriverId').value;

        const data = {
            name: document.getElementById('driverName').value.trim(),
            phone: document.getElementById('driverPhone').value.trim(),
            email: document.getElementById('driverEmail').value.trim(),
            password: document.getElementById('driverPassword').value,
            status: document.getElementById('driverStatusSelect').value
        };

        if (!data.name) {
            showAlert('Driver name is required.', 'danger');
            return;
        }

        if (!id && !data.password) {
            showAlert('Password is required for a new driver.', 'danger');
            return;
        }

        try {
            if (id) {
                await apiFetch(`/admin/drivers/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                showAlert('Driver updated successfully.', 'success');
            } else {
                await apiFetch('/admin/drivers', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showAlert('Driver account created successfully.', 'success');
            }

            await loadDrivers();
            closeModal('driverModal');
        } catch (error) {
            console.error('Failed to save driver:', error);
            showAlert(error.message || 'Failed to save driver.', 'danger');
        }
    }

    async function deleteDriver(id) {
        if (!confirm("Remove this driver?")) return;

        try {
            await apiFetch(`/admin/drivers/${id}`, { method: 'DELETE' });
            showAlert("Deleted", "success");
            await loadDrivers();
            updateMapMarkers();
        } catch (error) {
            console.error('Failed to delete driver:', error);
        }
    }


    //  PAYMENTS (demo)

    async function addDemoPayment() {
        try {
            let unpaidRequest = requests.find(r => r.status === 'completed' && r.payment !== 'paid');
            if (unpaidRequest) {
                await markPayment(unpaidRequest.id, unpaidRequest.amount);
            } else {
                showAlert("No completed unpaid requests found", "error");
            }
        } catch (error) {
            console.error('Failed to add demo payment:', error);
        }
    }


    //  UI NAVIGATION

    async function switchPanel(panelId, title) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
        const navLink = document.querySelector(`.nav-item[data-tab="${panelId.replace('Panel', '').toLowerCase()}"]`);
        if (navLink) navLink.classList.add('active');

        if (panelId === 'dashboardPanel') {
            if (map) setTimeout(() => map.invalidateSize(), 100);
            updateMapMarkers();
        }

        if (panelId === 'requestsPanel')   await loadRequests();
        if (panelId === 'driversPanel')    await loadDrivers();
        if (panelId === 'usersPanel')      await loadCustomers();
        if (panelId === 'paymentsPanel')   await loadPayments();
        if (panelId === 'servicePricesPanel') await loadServicePrices();
        if (panelId === 'gcashqrPanel')    await loadGcashQr();

        const term = document.getElementById('globalSearch')?.value || '';
        if (term) handleGlobalSearch(term);
    }


    //  ADMIN CRUD

    window.openAdminModal = function () {
        document.getElementById('editAdminId').value = '';
        document.getElementById('adminName').value = '';
        document.getElementById('adminPhone').value = '';
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminModalTitle').textContent = 'Add Admin';
        document.getElementById('adminModal').style.display = 'flex';
    };

    function editAdmin(id) {
        const admin = admins.find(x => Number(x.id) === Number(id));
        if (!admin) {
            console.error('Admin not found:', id);
            return;
        }

        document.getElementById('editAdminId').value = admin.id;
        document.getElementById('adminName').value = admin.name || '';
        document.getElementById('adminPhone').value = admin.phone || '';
        document.getElementById('adminEmail').value = admin.email || '';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminModalTitle').textContent = 'Edit Admin';
        document.getElementById('adminModal').style.display = 'flex';
    }

    window.saveAdmin = async function () {
        const id = document.getElementById('editAdminId').value;

        const data = {
            name: document.getElementById('adminName').value.trim(),
            phone: document.getElementById('adminPhone').value.trim(),
            email: document.getElementById('adminEmail').value.trim(),
            password: document.getElementById('adminPassword').value
        };

        if (!data.name) {
            showAlert('Admin name is required.', 'danger');
            return;
        }
        if (!data.email) {
            showAlert('Admin email is required.', 'danger');
            return;
        }
        if (!id && !data.password) {
            showAlert('Password is required for a new admin.', 'danger');
            return;
        }

        try {
            if (id) {
                await apiFetch(`/admin/admins/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                showAlert('Admin updated successfully.', 'success');
            } else {
                await apiFetch('/admin/admins', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showAlert('Admin account created successfully.', 'success');
            }

            await loadAdmins();
            closeModal('adminModal');
        } catch (error) {
            console.error('Failed to save admin:', error);
            showAlert(error.message || 'Failed to save admin.', 'danger');
        }
    };

    function renderAdmins() {
        const container = document.getElementById("adminsListContainer");
        if (!container) {
            console.error("adminsListContainer NOT FOUND");
            return;
        }

        if (!Array.isArray(admins) || admins.length === 0) {
            container.innerHTML = `
                <p style="text-align:center; padding:2rem; color:#666;">No admins found</p>
            `;
            return;
        }

        container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Admin</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${admins.map(admin => `
                        <tr>
                            <td>${admin.name || 'Unnamed'}</td>
                            <td>${admin.phone || '--'}</td>
                            <td>${admin.email || '--'}</td>
                            <td>${admin.is_active ? 'Active' : 'Inactive'}</td>
                            <td>${admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '--'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }


    //  INIT

    async function init() {
        let user = JSON.parse(sessionStorage.getItem('user') || '{"name":"Admin User"}');

        const avatar = document.getElementById('avatarInitials');
        if (avatar) {
            avatar.innerText = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        const profileName = document.getElementById('profileName');
        if (profileName) profileName.innerText = user.name;

        initMap();
        await loadRequests();
        await loadDrivers();
        await loadCustomers();
        await loadPayments();

        updateStats();

        setupNavigation();
        setupLogout();
        setupQrUpload();

        console.log('Admin dashboard initialized successfully!');
    }

    function setupNavigation() {
        document.querySelectorAll('.nav-item[data-tab]').forEach(link => {
            link.addEventListener('click', function () {
                const tab = this.getAttribute('data-tab');

                if (tab === 'dashboard')      switchPanel('dashboardPanel', 'Dashboard');
                else if (tab === 'requests')  switchPanel('requestsPanel', 'Service Requests');
                else if (tab === 'drivers')   switchPanel('driversPanel', 'Tow Drivers');
                else if (tab === 'users')     switchPanel('usersPanel', 'Customers');
                else if (tab === 'payments')  switchPanel('paymentsPanel', 'Payments & Receipts');
                else if (tab === 'serviceprices') switchPanel('servicePricesPanel', 'Service Prices');
                else if (tab === 'gcashqr')   switchPanel('gcashqrPanel', 'GCash QR');
            });
        });
    }

    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtnSidebar');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    }


    //  SERVICE PRICES

    async function loadServicePrices() {
        const tbody = document.getElementById('servicePricesTableBody');
        if (!tbody) {
            console.error('servicePricesTableBody not found');
            return;
        }

        tbody.innerHTML = `<tr><td colspan="5">Loading services...</td></tr>`;

        try {
            const data = await apiFetch('/admin/service-types');

            const services = Array.isArray(data.services) ? data.services : [];

            servicesCache = services;

            if (services.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">No service types found.</td></tr>`;
                return;
            }

            tbody.innerHTML = services.map(service => {
                const price = Number(service.base_price || 0);

                return `
                    <tr>
                        <td><strong>${escapeHtml(service.name)}</strong></td>
                        <td>${escapeHtml(service.description || 'No description')}</td>
                        <td><strong>₱${price.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}</strong></td>
                        <td>
                            ${Number(service.is_active) === 1
                                ? '<span class="status active">Active</span>'
                                : '<span class="status inactive">Inactive</span>'}
                        </td>
                        <td>
                            <button
                                class="btn btn-primary edit-service-price-btn"
                                data-service-id="${service.service_type_id}">
                                Edit Price
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Load service prices error:', error);
            tbody.innerHTML = `<tr><td colspan="5">Failed to load service prices.</td></tr>`;
        }
    }

    const servicePricesTableBody = document.getElementById('servicePricesTableBody');
    if (servicePricesTableBody) {
        servicePricesTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.edit-service-price-btn');
            if (!btn) return;

            const id = btn.dataset.serviceId;
            const service = servicesCache.find(s => String(s.service_type_id) === String(id));
            if (!service) return;

            openServicePriceModal(service);
        });
    }

    function openServicePriceModal(service) {
        document.getElementById('editServiceTypeId').value = service.service_type_id;
        document.getElementById('editServiceName').value = service.name || '';
        document.getElementById('editServiceDescription').value = service.description || '';
        document.getElementById('editServicePrice').value = Number(service.base_price || 0).toFixed(2);

        const modal = document.getElementById('servicePriceModal');
        modal.style.display = '';
        modal.classList.add('active');
    }

    async function saveServicePrice() {
        const serviceTypeId = document.getElementById('editServiceTypeId').value;
        const priceInput = document.getElementById('editServicePrice');
        const basePrice = Number(priceInput.value);

        if (!serviceTypeId) {
            alert('Invalid service type.');
            return;
        }

        if (!Number.isFinite(basePrice) || basePrice < 0) {
            alert('Please enter a valid price.');
            priceInput.focus();
            return;
        }

        try {
            await apiFetch(`/admin/service-types/${serviceTypeId}/price`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base_price: basePrice })
            });

            closeModal('servicePriceModal');
            await loadServicePrices();
            alert('Service price updated successfully.');
        } catch (error) {
            console.error('Save service price error:', error);
            alert(error.message || 'Failed to update service price.');
        }
    }


    //  GCASH QR
async function loadGcashQr() {
    const qrImg = document.getElementById('currentQr');
    const placeholder = document.getElementById('qrPlaceholder');
    const msg = document.getElementById('qrMsg');

    if (!qrImg || !placeholder) return;

    try {
        const r = await fetch('/api/settings/gcash-qr');
        const data = await r.json();

        if (data.success && data.image_path) {
            const raw = data.image_path;
            qrImg.src = raw.startsWith('http') || raw.startsWith('data:')
                ? raw
                : raw + '?t=' + Date.now();
            qrImg.alt = 'Current GCash QR';

            // Show image, hide placeholder
            qrImg.style.display = 'block';
            placeholder.style.display = 'none';

            if (msg) {
                msg.textContent = '';
                msg.className = 'qr-message'; // Reset classes
            }
        } else {
            // No QR code set
            qrImg.removeAttribute('src');
            qrImg.alt = 'No QR set';

            // Hide broken image, show placeholder
            qrImg.style.display = 'none';
            placeholder.style.display = 'flex';

            if (msg) {
                msg.textContent = 'No QR set yet — upload one below.';
                msg.className = 'qr-message info'; // Use CSS class for styling
            }
        }
    } catch (e) {
        console.error('Failed to load QR:', e);

        // Hide image, show placeholder on error
        qrImg.style.display = 'none';
        placeholder.style.display = 'flex';

        if (msg) {
            msg.textContent = 'Failed to load current QR.';
            msg.className = 'qr-message error'; // Use CSS class for styling
        }
    }
}

function setupQrUpload() {
    const form = document.getElementById('qrUploadForm');
    const qrImg = document.getElementById('currentQr');
    const placeholder = document.getElementById('qrPlaceholder');
    const msg = document.getElementById('qrMsg');

    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (msg) {
            msg.textContent = 'Uploading...';
            msg.className = 'qr-message info'; // Use CSS class
        }

        const formData = new FormData(form);

        try {
            const r = await fetch('/api/settings/gcash-qr', {
                method: 'POST',
                body: formData
            });
            const data = await r.json();

            if (data.success) {
                if (msg) {
                    msg.textContent = 'QR updated!';
                    msg.className = 'qr-message success'; // Use CSS class
                }

                const raw = data.image_path;
                qrImg.src = raw.startsWith('http') || raw.startsWith('data:')
                    ? raw
                    : raw + '?t=' + Date.now();

                // Show image, hide placeholder
                qrImg.style.display = 'block';
                placeholder.style.display = 'none';

                form.reset();
            } else {
                if (msg) {
                    msg.textContent = 'Error: ' + (data.message || 'Unknown error');
                    msg.className = 'qr-message error'; // Use CSS class
                }
            }
        } catch (err) {
            if (msg) {
                msg.textContent = 'Upload failed: ' + err.message;
                msg.className = 'qr-message error'; // Use CSS class
            }
        }
    });
}


    //  EXPOSE FUNCTIONS TO GLOBAL SCOPE

    window.refreshMapMarkers   = refreshMapMarkers;
    window.openRequestModal    = openRequestModal;
    window.editRequest         = editRequest;
    window.saveRequest         = saveRequest;
    window.markPayment         = markPayment;
    window.openDriverModal     = openDriverModal;
    window.editDriver          = editDriver;
    window.saveDriver          = saveDriver;
    window.deleteDriver        = deleteDriver;
    window.openCustomerModal   = openCustomerModal;
    window.editCustomer        = editCustomer;
    window.saveCustomer        = saveCustomer;
    window.addDemoPayment      = addDemoPayment;
    window.closeModal          = closeModal;
    window.switchPanel         = switchPanel;
    window.deleteRequest       = deleteRequest;
    window.loadServicePrices     = loadServicePrices;
    window.openServicePriceModal = openServicePriceModal;
    window.saveServicePrice      = saveServicePrice;
    window.loadGcashQr           = loadGcashQr;

    // Start everything
    init();

}); // end DOMContentLoaded wrapper


//  GLOBAL HELPERS (outside wrapper)


window.viewPaymentProof = async function (paymentId) {
    console.log('View payment proof:', paymentId);

    const token = sessionStorage.getItem('token');
    if (!token) {
        alert('Authentication required.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load payment.');
        }

        const payment = data.payment;

        if (!payment.proof_image_path) {
            alert('This payment has no uploaded proof.');
            return;
        }

        const proof = payment.proof_image_path || '';
        const imageUrl = /^https?:\/\//i.test(proof)
            ? proof
            : `${API_BASE_URL.replace(/\/api\/?$/, '')}/${proof.replace(/^\/+/, '')}`;

        document.getElementById('proofImage').src = imageUrl;
        document.getElementById('proofMeta').textContent =
            `Reference: ${payment.reference_number || '—'} · ₱${Number(payment.amount || 0).toFixed(2)}`;

        document.getElementById('proofModal').classList.add('show');
    } catch (error) {
        console.error('View payment proof error:', error);
        alert(error.message);
    }
};

window.viewCompletionProof = function (photoUrl, requestId) {
    if (!photoUrl) {
        alert('This request has no completion photo.');
        return;
    }

    const resolved = /^https?:\/\//i.test(photoUrl)
        ? photoUrl
        : `${API_BASE_URL.replace(/\/api\/?$/, '')}/${photoUrl.replace(/^\/+/, '')}`;

    document.getElementById('completionProofImage').src = resolved;
    document.getElementById('completionProofMeta').textContent = `Request #${requestId}`;
    document.getElementById('completionProofModal').classList.add('show');
};

window.closeCompletionProofModal = function () {
    document.getElementById('completionProofModal').classList.remove('show');
};

function closeProofModal() {
    document.getElementById('proofModal').classList.remove('show');
    document.getElementById('proofImage').src = '';
}

const proofImageEl = document.getElementById('proofImage');
if (proofImageEl) {
    proofImageEl.onerror = function () {
        this.onerror = null;
        document.getElementById('proofMeta').textContent = 'Proof image could not be loaded.';
    };
}

const proofModalEl = document.getElementById('proofModal');
if (proofModalEl) {
    proofModalEl.addEventListener('click', function (e) {
        if (e.target === this) closeProofModal();
    });
}

window.approvePayment = async function (paymentId) {
    const token = sessionStorage.getItem('token');
    if (!token) {
        alert('Authentication required.');
        return;
    }

    const confirmed = confirm(
        `Approve payment #${paymentId}?\n\n` +
        `This will mark the payment as COMPLETED and generate a receipt.`
    );
    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/payments/${paymentId}/approve`,
            {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to approve payment.');
        }

        alert(`Payment approved!\n\nReceipt: ${data.receipt_number}`);
        await loadPayments();
    } catch (error) {
        console.error('Approve payment error:', error);
        alert(error.message);
    }
};

window.rejectPayment = async function (paymentId) {
    const token = sessionStorage.getItem('token');
    if (!token) {
        alert('Authentication required.');
        return;
    }

    const reason = prompt('Why are you rejecting this payment proof?');
    if (reason === null) return;
    if (!reason.trim()) {
        alert('Please provide a rejection reason.');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/payments/${paymentId}/reject`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: reason.trim() })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to reject payment.');
        }

        alert('Payment proof rejected.\n\nThe customer can now resubmit their proof.');
        await loadPayments();
    } catch (error) {
        console.error('Reject payment error:', error);
        alert(error.message);
    }
};

window.openAssignDriverModal = async function (requestId) {
    const modal = document.getElementById('assignDriverModal');
    const requestInput = document.getElementById('assignRequestId');
    const requestDisplay = document.getElementById('assignRequestDisplay');
    const driverSelect = document.getElementById('assignDriverSelect');

    if (!modal || !requestInput || !driverSelect) {
        console.error('Assign driver modal elements not found.');
        return;
    }

    requestInput.value = requestId;
    requestDisplay.value = `Request #${requestId}`;
    driverSelect.innerHTML = `<option value="">Loading drivers...</option>`;
    modal.style.display = 'flex';

    try {
        const drivers = await apiFetch('/admin/drivers/available');

        const driverList = Array.isArray(drivers) ? drivers : drivers.drivers || [];

        if (driverList.length === 0) {
            driverSelect.innerHTML = `<option value="">No available drivers</option>`;
            return;
        }

        driverSelect.innerHTML = `
            <option value="">-- Select Driver --</option>
            ${driverList.map(driver => `
                <option value="${driver.user_id}">
                    ${driver.name}${driver.phone ? ` - ${driver.phone}` : ''}
                </option>
            `).join('')}
        `;
    } catch (err) {
        console.error('Failed to load drivers:', err);
        driverSelect.innerHTML = `<option value="">Failed to load drivers</option>`;
    }
};

window.closeAssignDriverModal = function () {
    const modal = document.getElementById('assignDriverModal');
    if (modal) modal.style.display = 'none';
};

window.confirmAssignDriver = async function () {
    const requestId = document.getElementById('assignRequestId').value;
    const driverId = document.getElementById('assignDriverSelect').value;

    if (!requestId) {
        alert('Request ID is missing.');
        return;
    }
    if (!driverId) {
        alert('Please select a driver.');
        return;
    }

    try {
        const data = await apiFetch(`/admin/requests/${requestId}/assign-driver`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driver_id: Number(driverId) })
        });

        console.log('Driver assigned:', data);
        showToast(`Driver assigned to Request #${requestId}`);

        closeAssignDriverModal();
        await loadRequests();
    } catch (err) {
        console.error('Assign driver error:', err);
        alert(err.message || 'Failed to assign driver.');
    }
};

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}