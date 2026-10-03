// components/NotificationBell.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // or react-native-vector-icons
import styles from '../styles';
import { fetchUnreadCount } from '../services/notificationService';

export default function NotificationBell({ navigation }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const c = await fetchUnreadCount();
      setCount(c);
    } catch (e) { /* ignore */ }
  }, []);

  // refresh whenever screen is focused
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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