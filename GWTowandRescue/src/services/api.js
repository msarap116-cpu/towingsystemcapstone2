// api.js
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// Token management
export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

export const setToken = async (token) => {
  await AsyncStorage.setItem('token', token);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem('token');
};

// API fetch function with better error handling
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = await getToken();
    const url = `${API_BASE_URL}${endpoint}`;

    // Log the full URL for debugging
    console.log('📡 Fetching:', url);

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));

      if (error.code === 'SESSION_REPLACED' || error.code === 'SESSION_EXPIRED') {
        await removeToken();
        return { error: 'session_expired' };
      }

      throw new Error(error.message || 'API request failed');
    }

    const text = await response.text();
    if (!text.trim()) return [];
    return JSON.parse(text);
  } catch (error) {
    // Enhanced error logging
    console.error('❌ API Error:', {
      endpoint: endpoint,
      fullUrl: `${API_BASE_URL}${endpoint}`,
      message: error.message,
      name: error.name,
      // Additional info for network errors
      ...(error.name === 'TypeError' && {
        hint: 'This is likely a network connectivity issue. Check: 1) Server is running 2) URL is correct 3) Device has internet'
      })
    });
    throw error;
  }
};

// Add a health check function
export const checkApiHealth = async () => {
  try {
    console.log('🔍 Checking API health at:', API_BASE_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log(' API Health Status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ API Health Check Failed:', error.message);
    return false;
  }
};