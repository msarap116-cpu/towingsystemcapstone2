//js/notifications.js

(function () {
  const typeToPath = {
    order: '/requests',
    payment: '/payments',
    system: '/admin/alerts'
  };

  async function refreshUnreadCount() {
    try {
      const { count } = await apiFetch('/notifications/unread-count');
      const dot = document.querySelector('.notification-badge .badge-dot');
      if (dot) dot.style.display = count > 0 ? 'block' : 'none';
    } catch (err) {
      // apiFetch already alerts on error; just avoid crashing the poll loop
    }
  }

  async function loadNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    list.innerHTML = '<div class="notif-empty">Loading...</div>';

    try {
      const items = await apiFetch('/notifications?limit=20');

      if (!items.length) {
        list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
        return;
      }

      list.innerHTML = items.map(n => `
  <div class="notif-item ${n.is_read ? '' : 'unread'}"
       data-id="${n.notification_id}"
       data-request-id="${n.request_id || ''}"
       data-type="${n.type}">
    ${!n.is_read ? '<span class="unread-dot"></span>' : ''}
    <p>${n.message}</p>
    <small>${new Date(n.created_at).toLocaleString()}</small>
  </div>
`).join('');

      list.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', async () => {
          try {
            await apiFetch(`/notifications/${el.dataset.id}/read`, { method: 'PATCH' });
          } catch (err) {
            // already alerted
          }
          const basePath = typeToPath[el.dataset.type];
          if (basePath && el.dataset.requestId) {
            window.location.href = `${basePath}/${el.dataset.requestId}`;
          }
          refreshUnreadCount();
        });
      });
    } catch (err) {
      list.innerHTML = '<div class="notif-empty">Failed to load</div>';
    }
  }

  function initNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (!badge) return;

    let panel = document.getElementById('notifPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'notifPanel';
      panel.className = 'notification-panel';
      panel.style.display = 'none';
      panel.innerHTML = `
        <div class="notif-panel-header">
          <span>Notifications</span>
          <button id="markAllReadBtn" type="button">Mark all read</button>
        </div>
        <div id="notifList"></div>
      `;
      badge.style.position = 'relative';
      badge.appendChild(panel);
    }

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.style.display === 'block';
      panel.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) loadNotifications();
    });

    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => { panel.style.display = 'none'; });

    document.getElementById('markAllReadBtn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await apiFetch('/notifications/read-all', { method: 'PATCH' });
        loadNotifications();
        refreshUnreadCount();
      } catch (err) {
        // already alerted
      }
    });

    refreshUnreadCount();
    setInterval(refreshUnreadCount, 20000);
  }

  document.addEventListener('DOMContentLoaded', initNotificationBadge);
})();