// screens/NotificationsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, SafeAreaView,
} from 'react-native';
import styles from '../styles/DriverDashboardScreen.styles'; // your existing styles file
import {
  fetchNotifications, fetchUnreadCount,
  markNotificationRead, markAllNotificationsRead,
} from '../services/notificationService';

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchNotifications(50, 0);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setItems(prev =>
        prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n)
      );
    } catch (e) {
      console.warn(e);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.warn(e);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0046a8" />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, styles.headerGreen]}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAll}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {error && <Text style={styles.emptyMsg}>{error}</Text>}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.notification_id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyMsg}>No notifications yet</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => !item.is_read && handleMarkRead(item.notification_id)}
              style={[
                styles.notifItem,
                !item.is_read && styles.notifItemUnread,
              ]}
            >
              <View style={styles.notifRow}>
                <Text style={styles.notifType}>{item.type}</Text>
                {!item.is_read && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0046a8' }} />
                )}
              </View>
              <Text style={styles.notifMessage}>{item.message}</Text>
              <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}