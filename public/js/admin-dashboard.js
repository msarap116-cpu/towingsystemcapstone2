// ===== WRAP EVERYTHING IN DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function () {

    // ========== DATA STORE (Will be populated from API) ==========
    let requests = [];
    let drivers = [];
    let customers = [];
    let payments = [];
    let map, markersList = [];
    let admins = [];


    // let customerMarkers = [];
    // let driverMarkers = [];


    // ========== LOAD DATA FUNCTIONS ==========
    // async function loadMapData() {

    //     try {

    //         const token = sessionStorage.getItem('token');

    //         const response = await fetch(
    //             `${API_BASE_URL}/admin/map-data`,
    //             {
    //                 headers: {
    //                     Authorization: `Bearer ${token}`
    //                 },
    //
    //             }
    //         );

    //         if (!response.ok) {
    //             throw new Error(`HTTP ${response.status}`);
    //         }

    //         const data = await response.json();

    //         console.log('Map data:', data);

    //         // displayMapData(data);

    //     } catch (error) {

    //         console.error('Failed to load map data:', error);

    //     }
    // }



    window.loadRequests = async function () {
        try {
            const data = await apiFetch("/admin/requests");

            requests = Array.isArray(data)
                ? data
                : data.requests || [];

            console.log("Admin fetched fresh requests:", requests);

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

        console.log("Drivers loaded:", drivers);

        renderDrivers();

        await loadAdmins();

        if (map) {
            updateMapMarkers();
        }

    } catch (err) {

        console.error("Failed to load drivers:", err);

        showAlert(
            "Could not load drivers",
            "danger"
        );
    }
}
    async function loadCustomers() {
        try {
            customers = await apiFetch('/admin/customers');
            renderCustomers();
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    }
async function loadAdmins() {
    try {
        const result = await apiFetch("/admin/admins");

        console.log("FULL ADMIN API RESULT:", result);
        console.log("result.admins:", result.admins);
        console.log("Is result.admins an array?", Array.isArray(result.admins));

        admins = result.admins || [];

        console.log("FINAL admins variable:", admins);
        console.log("Is admins an array?", Array.isArray(admins));
        console.log("Number of admins:", admins.length);

        renderAdmins();

    } catch (error) {
        console.error("Failed to load admins:", error);
        showAlert("Could not load admins", "danger");
    }
}
    window.loadPayments = async function () {
        try {
            payments = await apiFetch('/admin/payments');

            console.log('Payments loaded:', payments);
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

        // render your table here
    }

    let requestsPollingInterval = null;

    function startRequestsPolling() {
        if (requestsPollingInterval) {
            clearInterval(requestsPollingInterval);
        }

        requestsPollingInterval = setInterval(async () => {
            await loadRequests();
        }, 5000); // every 5 seconds
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
            {
                attribution: '© TowTrack'
            }
        ).addTo(map);

        // Render whatever data is already available
        updateMapMarkers();

        // Load fresh data
        loadRequests();
        loadDrivers();
    }


    function updateMapMarkers() {
        if (!map) return;
        markersList.forEach(m => map.removeLayer(m));
        markersList = [];
        const bounds = [];

        // SEPARATE mappings for REQUESTS vs DRIVERS to avoid confusion
        const getRequestIconUrl = (status) => {
            switch (status) {
                case 'pending': return 'image/waypoint-red.png';    // Pending Customer
                case 'assigned': return 'image/waypoint-blue.png';   // Customer In Progress
                case 'in progress': return 'image/waypoint-blue.png';   // Customer In Progress
                default: return 'image/waypoint-red.png';
            }
        };

        const getDriverIconUrl = (map_status) => {
            switch (map_status) {
                case 'online': return 'image/waypoint-green.png';  // Driver Available
                case 'busy': return 'image/waypoint-yellow.png'; // Busy Driver
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

                const iconUrl = getDriverIconUrl(d.map_status); // SEPARATE function!

                const markerIcon = L.icon({
                    iconUrl: iconUrl,
                    iconSize: ICON_SIZE,
                    iconAnchor: [12, 24],
                    popupAnchor: [0, -24]
                });

                const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
                marker.bindPopup(`
                <b>🚛 ${d.name || 'Driver'}</b>
                <br>Vehicle: ${d.vehicle || 'N/A'}
                <br>Status: ${d.status}
                <br>Rating: ${d.rating || 'N/A'} ⭐
            `);
                markersList.push(marker);
                bounds.push([lat, lng]);
            });


        // Map View

        const KORONADAL = [6.4215, 124.7859];
        if (bounds.length > 0) {
            bounds.push(KORONADAL);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
        } else {
            map.setView(KORONADAL, 12);
        }
    }

    function refreshMapMarkers() {
        // In production, this would update with real location data
        loadDrivers();
        loadRequests();
        showAlert("Map updated", "success");
    }

    function renderDrivers() {
        console.log('driver data:', drivers);
        const container = document.getElementById("driversListContainer");
        if (!container) return;

        if (!Array.isArray(drivers) || drivers.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:2rem; color:#666;">No drivers found</p>`;
            return;
        }

       container.innerHTML = `
    <div class="table-responsive">
        <table class="drivers-table">
            <thead>
                <tr>
                    <th>Driver</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Vehicle Plate</th>
                    <th>Status</th>
                    <th>Performance</th>
                    <th>Trips</th>
                    <th>Earnings (30d)</th>
                    <th>Actions</th>  <!-- NEW -->
                </tr>
            </thead>

            <tbody>
                ${drivers.map(d => `
                    <tr>
                        <td><strong>${d.name || 'Unnamed'}</strong></td>
                        <td>${d.phone || 'No phone'}</td>
                        <td>${d.email || 'No email'}</td>
                        <td>${d.vehicle_plate || 'No plate'}</td>
                        <td>
                            <span class="status-${d.status || 'inactive'}">
                                ${d.status || 'Inactive'}
                            </span>
                        </td>
                        <td>
                            ${d.rating
                                ? Number(d.rating).toFixed(1) + ' ⭐'
                                : 'No rating'}
                        </td>
                        <td>${d.total_completed || 0}</td>
                        <td>₱${Number(d.earnings_30d || 0).toFixed(2)}</td>
                        <td>
                            <button
                                class="btn-delete"
                                onclick="deleteDriver(${d.user_id})"
                                title="Delete driver"
                            >
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

    function renderCustomers() {
        console.log('Customers data:', customers);
        const tbody = document.getElementById('customersTable');
        if (!tbody) return;

        if (!Array.isArray(customers) || customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">No customers found</td></tr>`;
            return;
        }

        tbody.innerHTML = customers.map(c => `<tr>
        <td>${c.id}</td>
        <td>${c.name || '—'}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.email || 0}</td>
        <td>₱${Number(c.total_spent || 0).toFixed(2)}</td>
        <td>
            <!-- Overflow Menu: Edit + Delete -->
            <div class="overflow-menu">
                <button class="btn-icon overflow-trigger" title="Actions">⋮</button>
                <div class="overflow-dropdown">
                    <button class="dropdown-item" onclick="editCustomer(${c.id})" title="Edit Customer">✏️ Edit</button>
                    <button class="dropdown-item" onclick="deleteCustomer(${c.id})" title="Delete Customer" style="color: #dc3545;">🗑️ Delete</button>
                </div>
            </div>
        </td>
    </tr>`).join('');
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
        if (!confirm('Are you sure you want to delete this customer?')) {
            return;
        }

        try {
            await apiFetch(`/admin/customers/${customerId}`, {
                method: 'DELETE'
            });

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
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            } else {
                await apiFetch('/admin/customers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
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






    function renderPayments() {
        console.log('payments data:', payments);

        const tbody = document.getElementById('paymentsTable');

        if (!tbody) return;

        if (!payments || payments.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:2rem;">
                    No payment records found
                </td>
            </tr>
        `;
            return;
        }

        tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.receipt_number || '—'}</td>

            <td>#${p.request_id || '—'}</td>

            <td>${p.customer || '—'}</td>

            <td>₱${Number(p.amount || 0).toFixed(2)}</td>

            <td>${p.payment_method || '—'}</td>

            <td>
                ${p.payment_date
                ? new Date(p.payment_date).toLocaleDateString()
                : '—'}
            </td>

            <td>
                <span class="status-badge status-${p.status || 'unknown'}">
                    ${p.status || '—'}
                </span>
            </td>

            <td>
                <div class="overflow-menu">

                    <button
                        class="btn-icon overflow-trigger"
                        title="Actions"
                    >
                        ⋮
                    </button>

                    <div class="overflow-dropdown">

                        <button
                            class="dropdown-item"
                            onclick="viewPaymentProof(${p.payment_id})"
                        >
                            View Proof
                        </button>

                        <button
                            class="dropdown-item"
                            onclick="approvePayment(${p.payment_id})"
                        >
                            Approve
                        </button>

                        <button
                            class="dropdown-item"
                            onclick="rejectPayment(${p.payment_id})"
                        >
                            Reject
                        </button>

                    </div>

                </div>
            </td>
        </tr>
    `).join('');
    }


    function renderRequests(dataToRender) { // <--- Accept data as a parameter
        const tbody = document.getElementById("requestsTable");
        if (!tbody) return;

        // Use dataToRender instead of the global 'requests' variable
        if (!Array.isArray(dataToRender) || dataToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">No service requests found</td></tr>`;
            return;
        }

        tbody.innerHTML = dataToRender.map(r => `
       <tr>
        <td><strong>#${r.request_id}</strong></td>
        <td>
            <div><strong>${r.customer_name || 'mark toto'}</strong></div>
            <div style="font-size:0.9em; color:#666;">${r.customer_phone || '123'}</div>
        </td>
        <td style="max-width:300px; white-space:normal; word-wrap:break-word;">${r.location || 'Unknown'}</td>
        <td>${r.driver_name || '—'}</td>
        <td><span class="status-badge status-${r.status || 'pending'}">${r.status || 'pending'}</span></td>
        <td><span class="payment-status ${r.payment_status === 'paid' ? 'paid' : 'pending'}">${r.payment_status === 'paid' ? ' Paid' : '⌛ Pending'}</span></td>
        <td style="color:#666; font-size:0.9em;">${r.created_at || ''}</td>
       <td>
    <div class="overflow-menu">
        <button class="btn-icon overflow-trigger" title="Actions">⋮</button>

        <div class="overflow-dropdown">

            ${!r.driver_id && r.status === 'pending'
                ? `<button
                        class="dropdown-item"
                        onclick="openAssignDriverModal(${r.request_id})">
                        🚛 Assign Driver
                    </button>`
                : ''
            }

            <button
                class="dropdown-item"
                onclick="editRequest(${r.request_id})"
                title="Edit Request">
                ✏️ Edit Request
            </button>

            <button
                class="dropdown-item"
                onclick="openCustomerModal(${r.user_id})"
                title="View Customer">
                👤 View Customer
            </button>

            <button
                class="dropdown-item"
                onclick="deleteRequest(${r.request_id})"
                title="Delete Request"
                style="color:#dc3545;">
                🗑️ Delete Request
            </button>

        </div>
    </div>
</td>

    </tr>
    `).join("");
    }

    document.addEventListener('click', function (e) {
        const menu = e.target.closest('.overflow-menu');
        if (menu && e.target.classList.contains('overflow-trigger')) {
            menu.classList.toggle('active');
        } else if (!menu) {
            document.querySelectorAll('.overflow-menu').forEach(m => m.classList.remove('active'));
        } else if (menu && e.target.classList.contains('dropdown-item')) {
            menu.classList.remove('active');
        }
    });



    function updateStats() {
        const statRequests = document.getElementById('statRequests');
        const statDrivers = document.getElementById('statDrivers');
        const statCompleted = document.getElementById('statCompleted');
        const statRevenue = document.getElementById('statRevenue');

        if (statRequests) statRequests.innerText = requests.length;
        if (statDrivers) statDrivers.innerText = drivers.filter(d => d.status !== 'offline').length;
        if (statCompleted) statCompleted.innerText = requests.filter(r => r.status === 'completed').length;
        if (statRevenue) {
            let pendingRev = requests.filter(r => r.status === 'completed' && r.payment !== 'paid')
                .reduce((s, r) => s + r.amount, 0);
            statRevenue.innerText = `$${pendingRev}`;
        }
    }


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
    //make request?
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
                // Update existing
                await apiFetch(`/admin/requests/${request_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                showAlert("Request updated successfully", "success");
            } else {
                // Create new
                await apiFetch(`/admin/requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                showAlert("New request added", "success");
            }

            await loadRequests(); // Refresh list
            closeModal('requestModal');
        } catch (err) {
            console.error("Save error:", err);
            showAlert("Error saving request — check console", "danger");
            console.log('check and r.id kag ang sa getrequests matulog nko');
        }
    }
    // delete request
    async function deleteRequest(reqId) {
        if (!confirm("Are you sure you want to delete this request? This cannot be undone.")) return;

        try {
            await apiFetch(`/admin/requests/${reqId}`, {
                method: 'DELETE'
            });

            showAlert("Request deleted successfully", "success");
            await loadRequests(); // Refresh list after delete
        } catch (err) {
            console.error("Delete error:", err);
            showAlert("Failed to delete request", "danger");
        }
    }

    // update the payment status
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

    async function assignDriverPrompt(reqId) {
        let freeDrivers = drivers.filter(d => d.status !== 'busy');
        if (freeDrivers.length === 0) {
            alert("No available drivers");
            return;
        }
        let input = prompt(`Enter driver ID (${freeDrivers.map(d => `${d.id}: ${d.name}`).join(', ')})`);
        let driver = drivers.find(d => d.id == input);
        if (driver) {
            try {
                await apiFetch(`/requests/${reqId}/assign`, {
                    method: 'POST',
                    body: JSON.stringify({ driver_id: driver.id })
                });
                showAlert(`Assigned to ${driver.name}`, "success");
                await loadRequests();
                await loadDrivers();
                updateMapMarkers();

            } catch (error) {
                console.error('Failed to assign driver:', error);
            }
        }
    }

    // async function markPayment(reqId, amt) {
    //     let req = requests.find(r => r.id === reqId);
    //     if (req && req.payment !== 'paid') {
    //         try {
    //             await apiFetch(`/requests/${reqId}/pay`, {
    //                 method: 'POST',
    //                 body: JSON.stringify({
    //                     amount: amt,
    //                     payment_method: 'cash'
    //                 })
    //             });
    //             showAlert(`Payment recorded: $${amt}`, "success");
    //             await loadRequests();
    //             await loadPayments();
    //             updateStats();
    //         } catch (error) {
    //             console.error('Failed to record payment:', error);
    //         }
    //     }
    // }

    // ========== CRUD: DRIVERS ==========
    function openDriverModal() {
        document.getElementById('editDriverId').value = '';

        document.getElementById('driverForm').reset();

        document.getElementById('driverStatusSelect').value =
            'offline';

        document.getElementById('driverModal').style.display =
            'flex';
    }

    function editDriver(id) {
        const d = drivers.find(
            x => Number(x.id) === Number(id)
        );

        if (!d) {
            console.error('Driver not found:', id);
            return;
        }

        document.getElementById('editDriverId').value = d.id;

        document.getElementById('driverName').value =
            d.name || '';

        document.getElementById('driverPhone').value =
            d.phone || '';

        document.getElementById('driverEmail').value =
            d.email || '';

        document.getElementById('driverPassword').value =
            '';

        document.getElementById('driverStatusSelect').value =
            d.status || 'offline';

        document.getElementById('driverModal').style.display =
            'flex';
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

        // Only require password when creating a driver
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


                showAlert(
                    'Driver updated successfully.',
                    'success'
                );

            } else {

                await apiFetch('/admin/drivers', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });


                showAlert(
                    'Driver account created successfully.',
                    'success'
                );
            }

            await loadDrivers();

            closeModal('driverModal');

        } catch (error) {
            console.error('Failed to save driver:', error);

            showAlert(
                error.message || 'Failed to save driver.',
                'danger'
            );
        }
    }

    async function deleteDriver(id) {
        if (confirm("Remove this driver?")) {
            try {
                await apiFetch(`/drivers/${id}`, {
                    method: 'DELETE'
                });
                showAlert("Deleted", "success");
                await loadDrivers();
                updateMapMarkers();

            } catch (error) {
                console.error('Failed to delete driver:', error);
            }
        }
    }


    // GETTING THE MODAL ID'S


    // ========== PAYMENTS ==========
    async function addDemoPayment() {
        try {
            // Find a completed request without payment
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

    // // ========== UI NAVIGATION ==========
    // ========== UI NAVIGATION ==========
    function switchPanel(panelId, title) {

        // Hide all panels
        document.querySelectorAll('.tab-panel')
            .forEach(p => p.classList.remove('active'));

        // Show selected panel
        const panel = document.getElementById(panelId);

        if (panel) {
            panel.classList.add('active');
        }

        // Update active sidebar item
        document.querySelectorAll('.nav-item')
            .forEach(link => link.classList.remove('active'));

        const navLink = document.querySelector(
            `.nav-item[data-tab="${panelId.replace('Panel', '').toLowerCase()}"]`
        );

        if (navLink) {
            navLink.classList.add('active');
        }

        // Dashboard
        if (panelId === 'dashboardPanel') {

            if (map) {
                setTimeout(() => map.invalidateSize(), 100);
            }

            updateMapMarkers();
        }

        // Requests
        if (panelId === 'requestsPanel') {
            loadRequests();
        }

        // Drivers
        if (panelId === 'driversPanel') {
            loadDrivers();
        }

        // Customers
        if (panelId === 'usersPanel') {
            loadCustomers();
        }

        // Payments
        if (panelId === 'paymentsPanel') {
            loadPayments();
        }

        // Service Prices
        if (panelId === 'servicePricesPanel') {
            loadServicePrices();
        }
    }


    // ========== SEARCH ==========
    function setupSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (!searchInput) return;

        searchInput.addEventListener('input', function (e) {
            let term = e.target.value.toLowerCase();
            let requestsPanel = document.getElementById('requestsPanel');
            if (!requestsPanel) return;

            if (requestsPanel.classList.contains('active')) {
                let filtered = requests.filter(r =>
                    r.customer.toLowerCase().includes(term) ||
                    r.location.toLowerCase().includes(term) ||
                    r.service.toLowerCase().includes(term)
                );
                const tbody = document.getElementById('requestsTable');
                if (!tbody) return;

                tbody.innerHTML = filtered.map(r => {
                    let driver = drivers.find(d => d.id === r.driverId);
                    return `<tr>
                        <td>#${r.id}</td>
                        <td><strong>${r.customer}</strong><br><small>${r.phone}</small></td>
                        <td>${r.location}</td>
                        <td>${driver ? driver.name : '—'}</td>
                        <td><span class="status-badge status-${r.status.replace(' ', '')}">${r.status}</span></td>
                        <td>${r.payment === 'paid' ? '  Paid' : '⏳ Pending'}</td>
                        <td>
                            <button class="btn btn-outline" style="padding:4px 10px; margin:2px;" onclick="editRequest(${r.id})">✏️</button>
                            <button class="btn btn-outline" style="padding:4px 10px; margin:2px;" onclick="assignDriverPrompt(${r.id})">👤</button>
                            ${r.status === 'completed' && r.payment !== 'paid' ? `<button class="btn btn-success" style="padding:4px 10px; margin:2px;" onclick="markPayment(${r.id},${r.amount})">💳</button>` : ''}
                        </td>
                    </tr>`;
                }).join('');
            }
        });
    }

    // ========== EXPOSE FUNCTIONS TO GLOBAL SCOPE ==========
    window.refreshMapMarkers = refreshMapMarkers;
    window.openRequestModal = openRequestModal;
    window.editRequest = editRequest;
    window.saveRequest = saveRequest;
    window.assignDriverPrompt = assignDriverPrompt;
    window.markPayment = markPayment;
    window.openDriverModal = openDriverModal;
    window.editDriver = editDriver;
    window.saveDriver = saveDriver;
    window.deleteDriver = deleteDriver;
    window.openCustomerModal = openCustomerModal;
    window.editCustomer = editCustomer;
    window.saveCustomer = saveCustomer;
    window.addDemoPayment = addDemoPayment;
    window.closeModal = closeModal;
    window.switchPanel = switchPanel;
    window.deleteRequest = deleteRequest;

    // ========== EVENT LISTENERS ==========
    function setupNavigation() {

        document.querySelectorAll('.nav-item[data-tab]').forEach(link => {

            link.addEventListener('click', function (e) {

                const tab = this.getAttribute('data-tab');

                if (tab === 'dashboard') {
                    switchPanel('dashboardPanel', 'Dashboard');

                } else if (tab === 'requests') {
                    switchPanel('requestsPanel', 'Service Requests');

                } else if (tab === 'drivers') {
                    switchPanel('driversPanel', 'Tow Drivers');

                } else if (tab === 'users') {
                    switchPanel('usersPanel', 'Customers');

                } else if (tab === 'payments') {
                    switchPanel('paymentsPanel', 'Payments & Receipts');

                } else if (tab === 'serviceprices') {
                    switchPanel('servicePricesPanel', 'Service Prices');
                }

            });

        });
    }

    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtnSidebar');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
    window.openAdminModal = function () {

        document.getElementById('editAdminId').value = '';

        document.getElementById('adminName').value = '';
        document.getElementById('adminPhone').value = '';
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';

        document.getElementById('adminModalTitle').textContent =
            'Add Admin';

        document.getElementById('adminModal').style.display = 'flex';
    };

    function editAdmin(id) {

        const admin = admins.find(
            x => Number(x.id) === Number(id)
        );

        if (!admin) {
            console.error('Admin not found:', id);
            return;
        }

        document.getElementById('editAdminId').value = admin.id;

        document.getElementById('adminName').value =
            admin.name || '';

        document.getElementById('adminPhone').value =
            admin.phone || '';

        document.getElementById('adminEmail').value =
            admin.email || '';

        document.getElementById('adminPassword').value = '';

        document.getElementById('adminModalTitle').textContent =
            'Edit Admin';

        document.getElementById('adminModal').style.display = 'flex';
    }

   window.saveAdmin = async function () {

        const id =
            document.getElementById('editAdminId').value;

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

        // Password required only when creating
        if (!id && !data.password) {
            showAlert(
                'Password is required for a new admin.',
                'danger'
            );
            return;
        }

        try {

            if (id) {

                await apiFetch(`/admin/admins/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });

                showAlert(
                    'Admin updated successfully.',
                    'success'
                );

            } else {

                await apiFetch('/admin/admins', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                showAlert(
                    'Admin account created successfully.',
                    'success'
                );
            }

            await loadAdmins();

            closeModal('adminModal');

        } catch (error) {

            console.error(
                'Failed to save admin:',
                error
            );

            showAlert(
                error.message || 'Failed to save admin.',
                'danger'
            );
        }
    }

function renderAdmins() {
    console.log("admin data:", admins);

    const container = document.getElementById("adminsListContainer");

    if (!container) {
        console.error("❌ adminListContainer NOT FOUND");
        return;
    }

    console.log("✅ Admin container found");

    if (!Array.isArray(admins) || admins.length === 0) {
        container.innerHTML = `
            <p style="text-align:center; padding:2rem; color:#666;">
                No admins found
            </p>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="drivers-table">
                <thead>
                    <tr>
                        <th>Name</th>
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
                            <td>
                                ${admin.is_active ? 'Active' : 'Inactive'}
                            </td>
                            <td>
                                ${admin.created_at
                                    ? new Date(admin.created_at).toLocaleDateString()
                                    : '--'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};

    async function init() {
        // Load user from sessionStorage (set during login)
        let user = JSON.parse(sessionStorage.getItem('user') || '{"name":"Admin User"}');

        const avatar = document.getElementById('avatarInitials');
        if (avatar) {
            avatar.innerText = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        const profileName = document.getElementById('profileName');
        if (profileName) {
            profileName.innerText = user.name;
        }

        // Initialize everything
        initMap();
        // await loadDashboardStats();
        await loadRequests();
        await loadDrivers();
        await loadCustomers();
        await loadPayments();
        setupSearch();
        setupNavigation();
        setupLogout();

        console.log('Admin dashboard initialized successfully!');
    }

    // Start everything
    init();

});
window.viewPaymentProof = async function (paymentId) {

    console.log('View payment proof:', paymentId);

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('Authentication required.');
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/payments/${paymentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to load payment.'
            );
        }

        const payment = data.payment;

        console.log('Payment:', payment);

        if (!payment.proof_image_path) {
            alert('This payment has no uploaded proof.');
            return;
        }

        let proofPath =
            payment.proof_image_path.replace(/\\/g, '/');

        // Remove leading slash if present
        proofPath = proofPath.replace(/^\/+/, '');

        const backendBase =
            API_BASE_URL.replace(/\/api\/?$/, '');

        const imageUrl =
            `${backendBase}/${proofPath}`;

        console.log('Proof image:', imageUrl);

        window.open(imageUrl, '_blank');

    } catch (error) {

        console.error(
            'View payment proof error:',
            error
        );

        alert(error.message);

    }



};


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

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/admin/payments/${paymentId}/approve`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to approve payment.'
            );
        }

        alert(
            `Payment approved!\n\n` +
            `Receipt: ${data.receipt_number}`
        );

        // Reload admin payment table
        await loadPayments();

    } catch (error) {

        console.error(
            ' Approve payment error:',
            error
        );

        alert(error.message);
    }
};


window.rejectPayment = async function (paymentId) {

    const token = sessionStorage.getItem('token');

    if (!token) {
        alert('Authentication required.');
        return;
    }

    const reason = prompt(
        'Why are you rejecting this payment proof?'
    );

    if (reason === null) {
        return;
    }

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

                body: JSON.stringify({
                    reason: reason.trim()
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Failed to reject payment.'
            );
        }

        alert(
            'Payment proof rejected.\n\n' +
            'The customer can now resubmit their proof.'
        );

        await loadPayments();

    } catch (error) {

        console.error(
            'Reject payment error:',
            error
        );

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

    driverSelect.innerHTML = `
        <option value="">Loading drivers...</option>
    `;

    modal.style.display = 'flex';

    try {

        const drivers = await apiFetch('/admin/drivers/available');

        const driverList =
            Array.isArray(drivers)
                ? drivers
                : drivers.drivers || [];

        if (driverList.length === 0) {

            driverSelect.innerHTML = `
                <option value="">
                    No available drivers
                </option>
            `;

            return;
        }

        driverSelect.innerHTML = `
            <option value="">-- Select Driver --</option>

            ${driverList.map(driver => `
                <option value="${driver.user_id}">
                    ${driver.name}
                    ${driver.phone ? ` - ${driver.phone}` : ''}
                </option>
            `).join('')}
        `;

    } catch (err) {

        console.error('Failed to load drivers:', err);

        driverSelect.innerHTML = `
            <option value="">
                Failed to load drivers
            </option>
        `;
    }
};
window.closeAssignDriverModal = function () {

    const modal = document.getElementById('assignDriverModal');

    if (modal) {
        modal.style.display = 'none';
    }
};
window.confirmAssignDriver = async function () {

    const requestId =
        document.getElementById('assignRequestId').value;

    const driverId =
        document.getElementById('assignDriverSelect').value;

    if (!requestId) {
        alert('Request ID is missing.');
        return;
    }

    if (!driverId) {
        alert('Please select a driver.');
        return;
    }

    try {

        const data = await apiFetch(
            `/admin/requests/${requestId}/assign-driver`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    driver_id: Number(driverId)
                })
            }
        );

        console.log('Driver assigned:', data);

        showToast(
            `Driver assigned to Request #${requestId}`
        );

        closeAssignDriverModal();

        // Refresh admin requests
        await loadRequests();

    } catch (err) {

        console.error('Assign driver error:', err);

        alert(
            err.message ||
            'Failed to assign driver.'
        );
    }
};
function escapeHtml(value) {

    const div = document.createElement('div');

    div.textContent = value ?? '';

    return div.innerHTML;
}
async function loadServicePrices() {

    const tbody = document.getElementById('servicePricesTableBody');

    if (!tbody) {
        console.error('servicePricesTableBody not found');
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="5">Loading services...</td>
        </tr>
    `;

    try {

        const data = await apiFetch('/admin/service-types');

        console.log('🔎 Service Types API response:', data);
        console.log('🔎 data.services:', data.services);

        const services = Array.isArray(data.services)
            ? data.services
            : [];

        if (services.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No service types found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = services.map(service => {

            const price = Number(service.base_price || 0);

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(service.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                service.description || 'No description'
            )}
                    </td>

                    <td>
                        <strong>
                            ₱${price.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}
                        </strong>
                    </td>

                    <td>
                        ${Number(service.is_active) === 1
                    ? '<span class="status active">Active</span>'
                    : '<span class="status inactive">Inactive</span>'
                }
                    </td>

                    <td>

                        <button
                            class="btn btn-primary"
                            onclick='openServicePriceModal(${JSON.stringify(service)})'>
                            Edit Price
                        </button>

                    </td>

                </tr>
            `;

        }).join('');

    } catch (error) {

        console.error(
            'Load service prices error:',
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Failed to load service prices.
                </td>
            </tr>
        `;
    }
};

function openServicePriceModal(service) {

    document.getElementById('editServiceTypeId').value =
        service.service_type_id;

    document.getElementById('editServiceName').value =
        service.name || '';

    document.getElementById('editServiceDescription').value =
        service.description || '';

    document.getElementById('editServicePrice').value =
        Number(service.base_price || 0).toFixed(2);

    document.getElementById('servicePriceModal').classList.add('active');
};

async function saveServicePrice() {

    const serviceTypeId =
        document.getElementById('editServiceTypeId').value;

    const priceInput =
        document.getElementById('editServicePrice');

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

        const data = await apiFetch(
            `/admin/service-types/${serviceTypeId}/price`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    base_price: basePrice
                })
            }
        );

        console.log('Price updated:', data);

        closeModal('servicePriceModal');

        await loadServicePrices();

        alert('Service price updated successfully.');

    } catch (error) {

        console.error('Save service price error:', error);

        alert(
            error.message ||
            'Failed to update service price.'
        );
    }
};
