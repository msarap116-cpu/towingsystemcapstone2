// src/services/notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

async function authHeaders() {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchNotifications(limit = 20, offset = 0) {
  const res = await fetch(
    `${API_BASE_URL}/notifications?limit=${limit}&offset=${offset}`,
    { headers: await authHeaders() }
  );
  if (!res.ok) throw new Error(`Notifications failed: ${res.status}`);
  return res.json();
}

export async function fetchUnreadCount() {
  const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Unread count failed: ${res.status}`);
  const { count } = await res.json();
  return count;
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Mark read failed: ${res.status}`);
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Mark all read failed: ${res.status}`);
  return res.json();
}