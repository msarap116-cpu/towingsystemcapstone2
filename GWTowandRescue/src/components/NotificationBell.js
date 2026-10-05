// src/components/NotificationBell.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import styles from '../styles/NotificationBell.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { fetchNotifications, fetchUnreadCount } from '../services/notificationService';

export default function NotificationBell({ navigation }) {
  const [count, setCount] = useState(0);

  // Store the previous count to detect changes
  const previousCountRef = React.useRef(null);
  const channelIdRef = React.useRef(null);


const refresh = useCallback(async () => {
  const token = await AsyncStorage.getItem('token');
  console.log('[Bell] token:', token ? token.slice(0, 20) + '…' : 'NULL');
  if (!token) return;

  try {
    const newCount = await fetchUnreadCount();   // ← renamed c → newCount

    // First load — seed the counter, don't fire a tray notification
    if (previousCountRef.current === null) {
      previousCountRef.current = newCount;
      setCount(newCount);
      if (!channelIdRef.current) {
        channelIdRef.current = await setupNotifications();
      }
      return;
    }

    // A new notification arrived → show in tray
    if (newCount > previousCountRef.current) {
      const recentNotifications = await fetchNotifications(1, 0);
      const latest = recentNotifications[0];

      if (latest && channelIdRef.current) {
        try {
          await notifee.displayNotification({
            title: `New ${latest.type === 'order' ? 'Service Request' : 'Update'}!`,
            body: latest.message,
            android: {
              channelId: channelIdRef.current,
              smallIcon: 'ic_launcher',
              pressAction: { id: 'default' },
            },
          });
        } catch (notifErr) {
          console.warn('[Bell] tray notify failed:', notifErr.message);
        }
      }
    }

    previousCountRef.current = newCount;
    setCount(newCount);
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