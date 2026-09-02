// formDraft.js
const DRAFT_KEY = 'draftRequest';

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
    if (!raw) return false;

    const draft = JSON.parse(raw);
    if (draft.serviceType) document.getElementById('serviceType').value = draft.serviceType;
    if (draft.latitude) document.getElementById('latitude').value = draft.latitude;
    if (draft.longitude) document.getElementById('longitude').value = draft.longitude;
    if (draft.address) document.getElementById('address').value = draft.address;

    sessionStorage.removeItem(DRAFT_KEY); // one-time use
    return true;
}