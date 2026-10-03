// services/notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://your-api.com'; // <-- use your existing API base

async function authHeaders() {
  const token = await AsyncStorage.getItem('token'); // match your existing key
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchNotifications(limit = 20, offset = 0) {
  const res = await fetch(
    `${BASE_URL}/notifications?limit=${limit}&offset=${offset}`,
    { headers: await authHeaders() }
  );
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function fetchUnreadCount() {
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load unread count');
  const data = await res.json();
  return data.count;
}

export async function markNotificationRead(id) {
  const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark as read');
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
  return res.json();
}