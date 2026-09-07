// API Service for React Native
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000/api',
  android: 'http://10.0.2.2:3000/api', // Android emulator
  web: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api'
});

// const API_BASE_URL = 'https://goodwrench-towing-rescue.onrender.com/api';

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

// API fetch function (replaces your web apiFetch)
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = await getToken();
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
        await removeToken();
        // You can use navigation to redirect
        return { error: 'session_expired' };
      }

      throw new Error(error.message || 'API request failed');
    }

    const text = await response.text();
    if (!text.trim()) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};