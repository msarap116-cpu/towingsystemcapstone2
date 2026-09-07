import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getToken, removeToken } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = await getToken();
    if (token) {
      try {
        const userData = await apiFetch('/users/profile');
        setUser(userData);
      } catch (error) {
        console.error('Auth check failed:', error);
        await removeToken();
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const response = await apiFetch('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.token) {
        await AsyncStorage.setItem('token', response.token);
        await checkAuthStatus();
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    const token = await getToken();
    if (token) {
      try {
        await apiFetch('/users/logout', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    await removeToken();
    setUser(null);
  };

  return { user, loading, login, logout };
};