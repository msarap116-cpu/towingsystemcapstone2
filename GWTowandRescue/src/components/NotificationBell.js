// src/components/NotificationBell.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native';
import styles from '../styles/NotificationBell.styles';
import { fetchUnreadCount, fetchNotifications } from '../services/notificationService';

// ─── Helper: outside the component ─────────────────────────────
async function setupNotifications() {
  try {
    await notifee.requestPermission();
    const id = await notifee.createChannel({
      id: 'gwtow-notifications',
      name: 'GoodWrench Notifications',
      importance: AndroidImportance.HIGH,
    });
    return id;
  } catch (e) {
    console.warn('[Bell] notifee setup failed:', e.message);
    return null;
  }
}

// ─── Component ─────────────────────────────────────────────────
export default function NotificationBell({ navigation }) {
  const [count, setCount] = useState(0);

  // ─── Refs: INSIDE the component, before refresh ─────────────
  const previousCountRef = useRef(null);
  const channelIdRef = useRef(null);

  const refresh = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    console.log('[Bell] token:', token ? token.slice(0, 20) + '…' : 'NULL');
    if (!token) return;

    try {
      const newCount = await fetchUnreadCount();

      if (previousCountRef.current === null) {
        previousCountRef.current = newCount;
        setCount(newCount);
        if (!channelIdRef.current) {
          channelIdRef.current = await setupNotifications();
        }
        return;
      }

      if (newCount > previousCountRef.current && channelIdRef.current) {
        try {
          const recent = await fetchNotifications(1, 0);
          const latest = Array.isArray(recent) && recent[0];
          if (latest) {
            await notifee.displayNotification({
              title: `New ${latest.type === 'order' ? 'Service Request' : 'Update'}!`,
              body: latest.message,
              android: {
                channelId: channelIdRef.current,
                smallIcon: 'ic_launcher',
                pressAction: { id: 'default' },
              },
            });
          }
        } catch (notifErr) {
          console.warn('[Bell] tray notify failed:', notifErr.message);
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
    const id = setInterval(refresh, 20000);
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