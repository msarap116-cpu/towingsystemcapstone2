// src/components/NotificationBell.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import styles from '../styles/NotificationBell.styles';
import { fetchUnreadCount } from '../services/notificationService';

export default function NotificationBell({ navigation }) {
  const [count, setCount] = useState(0);

 const refresh = useCallback(async () => {
  const token = await AsyncStorage.getItem('token');
  console.log('[Bell] token:', token ? token.slice(0, 20) + '…' : 'NULL');
  try {
    const c = await fetchUnreadCount();
    console.log('[Bell] unread:', c);
    setCount(c);
  } catch (e) {
    console.warn('[Bell] failed:', e.message);
  }
}, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={styles.notifBellWrap}
    >
      <Ionicons name="notifications-outline" size={24} color="#fff" />
      {count > 0 && (
        <View style={styles.notifBadge}>
          <Text style={styles.notifBadgeText}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}