// myvehicles.js
document.addEventListener("DOMContentLoaded", () => {
    loadVehicles();

    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', handleAddVehicle);
    }
});

async function loadVehicles() {
    const listEl = document.getElementById('vehicleList');
    const emptyEl = document.getElementById('emptyState');

    try {
        const response = await fetch(`${API_BASE_URL}/vehicles`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Failed to load vehicles', 'danger');
            return;
        }

        const vehicles = data.vehicles || [];
        listEl.innerHTML = '';

        if (vehicles.length === 0) {
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';

        vehicles.forEach(v => {
            const card = document.createElement('div');
            card.className = 'vehicle-card' + (v.is_default ? ' is-default' : '');
            card.innerHTML = `
                <div class="vehicle-info">
                    <h4>${v.make} ${v.model} (${v.year || 'N/A'})
                        ${v.is_default ? '<span class="default-badge">Default</span>' : ''}
                    </h4>
                    <p>${v.vehicle_type} • ${v.color} • Plate: ${v.license_plate}</p>
                </div>
                <div class="vehicle-actions">
                    ${!v.is_default ? `<button type="button" data-action="default" data-id="${v.vehicle_id}">Set Default</button>` : ''}
                    <button type="button" class="btn-danger" data-action="delete" data-id="${v.vehicle_id}">Delete</button>
                </div>
            `;
            listEl.appendChild(card);
        });

        listEl.querySelectorAll('button[data-action="default"]').forEach(btn => {
            btn.addEventListener('click', () => setDefaultVehicle(btn.dataset.id));
        });
        listEl.querySelectorAll('button[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteVehicle(btn.dataset.id));
        });

    } catch (error) {
        console.error('loadVehicles error:', error);
        showAlert('Network error while loading vehicles.or login please', 'danger');
    }
}

async function handleAddVehicle(e) {
    e.preventDefault();

    const payload = {
        vehicle_type: document.getElementById('vehicleType').value.trim(),
        make: document.getElementById('make').value.trim(),
        model: document.getElementById('model').value.trim(),
        color: document.getElementById('color').value.trim(),
        year: document.getElementById('year').value || null,
        license_plate: document.getElementById('licensePlate').value.trim(),
        is_default: document.getElementById('isDefault').checked
    };

    try {
        const response = await fetch(`${API_BASE_URL}/vehicles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Vehicle added successfully!', 'success');
            document.getElementById('vehicleForm').reset();
            loadVehicles();
        } else {
            showAlert(data.error || 'Failed to add vehicle', 'danger');
        }
    } catch (error) {
        console.error('handleAddVehicle error:', error);
        showAlert('Network error. Please try again.', 'danger');
    }
}

async function setDefaultVehicle(vehicleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/default`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            loadVehicles();
        } else {
            showAlert(data.error || 'Failed to set default vehicle', 'danger');
        }
    } catch (error) {
        console.error('setDefaultVehicle error:', error);
        showAlert('Network error. Please try again.', 'danger');
    }
}

async function deleteVehicle(vehicleId) {
    if (!confirm('Remove this vehicle?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            loadVehicles();
        } else {
            showAlert(data.error || 'Failed to delete vehicle', 'danger');
        }
    } catch (error) {
        console.error('deleteVehicle error:', error);
        showAlert('Network error. Please try again.', 'danger');
    }
}