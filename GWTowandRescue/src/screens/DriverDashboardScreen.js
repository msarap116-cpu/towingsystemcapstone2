import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  FlatList,
  Platform,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LeafletMap from '../components/LeafletMap';
import Geolocation from '@react-native-community/geolocation';
import styles from '../styles/DriverDashboardScreen.styles';

import API_BASE_URL from '../config';

const DRIVER_LOCATION_INTERVAL = 5000;

const DriverDashboardScreen = ({ navigation }) => {
  // ===== STATE =====
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState('');

  // Stats
  const [availableJobs, setAvailableJobs] = useState(0);
  const [activeTrips, setActiveTrips] = useState(0);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Lists
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [completedTripsList, setCompletedTripsList] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);

  // Map state
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.3,
    longitude: 124.7,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [driverLocation, setDriverLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [trackingStatus, setTrackingStatus] = useState('No active job – tracking idle.');

  // Watch ID for GPS
  const watchIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastSentRef = useRef(0);

  // ===== LIFECYCLE =====
  useEffect(() => {
    checkAuth();
    updateClock();
    const clockInterval = setInterval(updateClock, 10000);

    return () => {
      clearInterval(clockInterval);
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'tracking') {
      initDriverMap();
    }
  }, [activeTab]);

  // ===== AUTH FUNCTIONS =====
  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.replace('Login');
      return;
    }

    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      }
      await loadDriverDashboardData();
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            if (watchIdRef.current) {
              Geolocation.clearWatch(watchIdRef.current);
            }
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  // ===== DATA FETCHING =====
  const fetchPendingRequests = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE_URL}/requests/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error('fetchPendingRequests error:', error);
      return [];
    }
  };

  const fetchMyTrips = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE_URL}/requests/my-trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error('fetchMyTrips error:', error);
      return [];
    }
  };

  const fetchEarningsSummary = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return { today: 0, allTime: 0 };

    try {
      const res = await fetch(`${API_BASE_URL}/earnings/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) return { today: 0, allTime: 0 };
      return await res.json();
    } catch (error) {
      console.error('fetchEarningsSummary error:', error);
      return { today: 0, allTime: 0 };
    }
  };

  const loadDriverDashboardData = async () => {
    try {
      const [pending, trips, earnings] = await Promise.all([
        fetchPendingRequests(),
        fetchMyTrips(),
        fetchEarningsSummary()
      ]);

      setPendingRequests(pending);

      const active = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
      const completed = trips.filter(t => t.status === 'completed');

      setMyTrips(active);
      setCompletedTripsList(completed);
      setAvailableJobs(pending.length);
      setActiveTrips(active.length);
      setCompletedTrips(completed.length);
      setTodayEarnings(earnings.today || 0);
      setTotalEarnings(earnings.allTime || 0);

      // Update payment history
      setPaymentHistory(completed.slice(0, 10));

      // Check for active trip for tracking
      const activeTrip = active.find(t => t.status === 'assigned' || t.status === 'in progress');
      if (activeTrip) {
        setActiveRequestId(activeTrip.request_id);
        if (activeTrip.location_lat && activeTrip.location_lng) {
          setCustomerLocation({
            latitude: parseFloat(activeTrip.location_lat),
            longitude: parseFloat(activeTrip.location_lng)
          });
          setTrackingStatus(`Active job #${activeTrip.request_id} – tracking in progress.`);
        }
      } else {
        setActiveRequestId(null);
        setTrackingStatus('No active job – waiting for assignment.');
      }

    } catch (error) {
      console.error('loadDriverDashboardData error:', error);
    }
  };

  // ===== MAP FUNCTIONS =====
  const initDriverMap = async () => {
    // Get current location
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });

        // Start tracking
        startGPSTracking();
      },
      (error) => {
        console.error('Geolocation error:', error);
        Alert.alert('Location Error', 'Unable to get your location. Please enable GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startGPSTracking = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ latitude, longitude });

        if (customerLocation) {
          await drawRoute(latitude, longitude, customerLocation.latitude, customerLocation.longitude);
          sendDriverLocation(latitude, longitude);
        }
      },
      (error) => {
        console.error('GPS watch error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  const drawRoute = async (fromLat, fromLng, toLat, toLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok') {
        const coordinates = data.routes[0].geometry.coordinates;
        const coords = coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRouteCoordinates(coords);
      }
    } catch (error) {
      console.error('Route drawing error:', error);
    }
  };

  const sendDriverLocation = async (lat, lng) => {
    const now = Date.now();
    if (now - lastSentRef.current < DRIVER_LOCATION_INTERVAL) return;
    lastSentRef.current = now;

    const token = await AsyncStorage.getItem('token');
    if (!token || !activeRequestId) return;

    try {
      await fetch(`${API_BASE_URL}/requests/driver-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat, lng, request_id: activeRequestId })
      });
    } catch (error) {
      console.error('Failed to send driver location:', error);
    }
  };

  // ===== JOB ACTIONS =====
  const acceptJob = async (requestId) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/requests/${requestId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Accept failed');
      }

      Alert.alert('Success', `Job #${requestId} accepted!`);
      await loadDriverDashboardData();

      // Switch to tracking tab
      setActiveTab('tracking');
      initDriverMap();

    } catch (error) {
      console.error('Accept error:', error);
      Alert.alert('Error', 'Failed to accept job: ' + error.message);
    }
  };

  const updateTripStatus = async (requestId, newStatus) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    const trip = myTrips.find(t => Number(t.request_id) === Number(requestId));
    if (!trip) {
      Alert.alert('Error', 'Trip not found.');
      return;
    }

    const statusOrder = {
      'assigned': 1,
      'in progress': 2,
      'completed': 3
    };

    const currentStatus = trip.status;
    if (statusOrder[newStatus] < statusOrder[currentStatus]) {
      Alert.alert('Error', `Cannot change from "${currentStatus}" back to "${newStatus}"`);
      return;
    }

    Alert.alert(
      'Update Status',
      `Change request #${requestId} from "${currentStatus}" to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/requests/${requestId}/status`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || data.message || 'Status update failed');
              }

              Alert.alert('Success', `Status updated to ${newStatus}`);
              await loadDriverDashboardData();

              // If completed, stop tracking
              if (newStatus === 'completed' && Number(activeRequestId) === Number(requestId)) {
                setActiveRequestId(null);
                setCustomerLocation(null);
                setRouteCoordinates([]);
                if (watchIdRef.current) {
                  Geolocation.clearWatch(watchIdRef.current);
                }
                setTrackingStatus('No active job – waiting for assignment.');
              }
            } catch (error) {
              console.error('Status update error:', error);
              Alert.alert('Error', 'Failed to update status');
            }
          }
        }
      ]
    );
  };

  const cancelTrip = async (requestId) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    Alert.prompt(
      'Cancel Trip',
      'Please enter a reason for cancellation (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (reason) => {
            try {
              const res = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: reason || 'Cancelled by driver' })
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || 'Cancel failed');
              }

              Alert.alert('Success', `Job #${requestId} cancelled.`);
              await loadDriverDashboardData();

              if (Number(activeRequestId) === Number(requestId)) {
                setActiveRequestId(null);
                setCustomerLocation(null);
                setRouteCoordinates([]);
                if (watchIdRef.current) {
                  Geolocation.clearWatch(watchIdRef.current);
                }
              }
            } catch (error) {
              console.error('Cancel error:', error);
              Alert.alert('Error', 'Failed to cancel trip');
            }
          }
        }
      ]
    );
  };

  // ===== HELPERS =====
  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatPrice = (amount) => {
    return `₱${Number(amount || 0).toFixed(2)}`;
  };
// ===== RENDER FUNCTIONS — BOTTOM TAB BAR =====
// Profile Header (moved from sidebar to top)
const renderProfileHeader = () => (
  <View style={styles.profileHeader}>
    <View style={styles.avatarContainer}>
      <Text style={styles.avatarInitials}>
        {user ? getInitials(user.name) : 'AD'}
      </Text>
    </View>
    <View style={styles.profileInfo}>
      <Text style={styles.profileName}>{user?.name || 'Driver'}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>🚛 Driver</Text>
      </View>
    </View>
  </View>
);

// BOTTOM TAB BAR — replaces sidebar, ALL IDs & onPress UNCHANGED
const renderBottomTabBar = () => (
  <View style={styles.bottomTabBar}>
    <TouchableOpacity
      style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
      onPress={() => setActiveTab('dashboard')}
    >
      <Text style={styles.tabIcon}>📊</Text>
      <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabItem, activeTab === 'tracking' && styles.tabItemActive]}
      onPress={() => setActiveTab('tracking')}
    >
      <Text style={styles.tabIcon}>📍</Text>
      <Text style={[styles.tabText, activeTab === 'tracking' && styles.tabTextActive]}>Tracking</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabItem, activeTab === 'trips' && styles.tabItemActive]}
      onPress={() => setActiveTab('trips')}
    >
      <Text style={styles.tabIcon}>🚗</Text>
      <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>Trips</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabItem, activeTab === 'earnings' && styles.tabItemActive]}
      onPress={() => setActiveTab('earnings')}
    >
      <Text style={styles.tabIcon}>💰</Text>
      <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>Earnings</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabItem, styles.tabLogout]}
      onPress={handleLogout}
    >
      <Text style={styles.tabIcon}>🚪</Text>
      <Text style={styles.logoutTabText}>Logout</Text>
    </TouchableOpacity>
  </View>
);

// ===== RENDER TABS — ✅ ALL UNCHANGED (Dashboard, Tracking, Trips, Earnings) =====
const renderDashboard = () => (
  <View style={styles.tabContent}>
    {/* Stats */}
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Available Jobs</Text>
        <Text style={styles.statNumber}>{availableJobs}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>My Active Trips</Text>
        <Text style={styles.statNumber}>{activeTrips}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Trips Completed</Text>
        <Text style={styles.statNumber}>{completedTrips}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Today's Earnings</Text>
        <Text style={styles.statNumber}>{formatPrice(todayEarnings)}</Text>
      </View>
    </View>
    {/* Two Columns */}
    <View style={styles.twoCol}>
      {/* Available Requests */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Available Requests</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingRequests.length}</Text>
          </View>
        </View>
        {pendingRequests.length === 0 ? (
          <Text style={styles.emptyText}>No pending requests right now.</Text>
        ) : (
          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => String(item.request_id)}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <View style={styles.requestTop}>
                  <Text style={styles.customerName}>{item.customer_name || 'Customer'}</Text>
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceText}>{item.service_type || 'Service'}</Text>
                  </View>
                </View>
                <Text style={styles.locationText}>📍 {item.location || 'No address'}</Text>
                <View style={styles.requestBottom}>
                  <Text style={styles.priceText}>{formatPrice(item.amount)}</Text>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptJob(item.request_id)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      {/* My Active Trips */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>My Active Trips</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{myTrips.length}</Text>
          </View>
        </View>
        {myTrips.length === 0 ? (
          <Text style={styles.emptyText}>No active trips</Text>
        ) : (
          <FlatList
            data={myTrips}
            keyExtractor={(item) => String(item.request_id)}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <View style={styles.requestTop}>
                  <Text style={styles.customerName}>{item.customer_name || 'Customer'}</Text>
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceText}>{item.service_type || 'Service'}</Text>
                  </View>
                </View>
                <Text style={styles.locationText}>📍 {item.location || 'No address'}</Text>
                <View style={styles.requestBottom}>
                  <View style={[styles.statusBadge,
                    {
                      backgroundColor: item.status === 'assigned' ? '#dbeafe' :
                        item.status === 'in progress' ? '#e0f2fe' : '#d1fae5'
                    }
                    ]}>
                    <Text style={[styles.statusText,
                      {
                        color: item.status === 'assigned' ? '#1e40af' :
                          item.status === 'in progress' ? '#0369a1' : '#065f46'
                      }
                      ]}>
                      {item.status || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={styles.priceText}>{formatPrice(item.amount)}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <View style={styles.statusSelect}>
                    {['assigned', 'in progress', 'completed'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          item.status === status && styles.statusOptionActive
                        ]}
                        onPress={() => updateTripStatus(item.request_id, status)}
                      >
                        <Text style={[
                          styles.statusOptionText,
                          item.status === status && styles.statusOptionTextActive
                        ]}>
                          {status === 'in progress' ? 'In Progress' :
                            status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelTrip(item.request_id)}
                  >
                    <Text style={styles.cancelButtonText}>🗑️ Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  </View>
);

const renderTracking = () => (
  <View style={styles.tabContent}>
    <View style={styles.trackingHeader}>
      <Text style={styles.tabTitle}>📍 Live Tracking</Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => {
          initDriverMap();
          Alert.alert('Success', 'Map refreshed');
        }}
      >
        <Text style={styles.refreshText}>⟳ Refresh</Text>
      </TouchableOpacity>
    </View>
    <View style={styles.mapCard}>
      <View style={styles.mapContainer}>
        <LeafletMap
          customerLocation={customerLocation}
          driverLocation={driverLocation}
          routeCoordinates={routeCoordinates}
          address={latestRequest?.address}
        />
      </View>
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#d85a30' }]} />
          <Text style={styles.legendText}>Customer pickup</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#1d9e75' }]} />
          <Text style={styles.legendText}>Your location</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Route</Text>
        </View>
      </View>
    </View>
    <View style={styles.trackingInfo}>
      <Text style={styles.trackingStatus}>{trackingStatus}</Text>
    </View>
  </View>
);

const renderTrips = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>My Trips</Text>
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>All Trips</Text>
      </View>
      {myTrips.length === 0 && completedTripsList.length === 0 ? (
        <Text style={styles.emptyText}>No trips yet</Text>
      ) : (
        <FlatList
          data={[...myTrips, ...completedTripsList]}
          keyExtractor={(item) => String(item.request_id)}
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <View style={styles.requestTop}>
                <Text style={styles.customerName}>#{item.request_id}</Text>
                <View style={[styles.statusBadge,
                  {
                    backgroundColor: item.status === 'completed' ? '#d1fae5' :
                      item.status === 'assigned' ? '#dbeafe' : '#e0f2fe'
                  }
                  ]}>
                  <Text style={[styles.statusText,
                    {
                      color: item.status === 'completed' ? '#065f46' :
                        item.status === 'assigned' ? '#1e40af' : '#0369a1'
                    }
                    ]}>
                    {item.status || 'Unknown'}
                  </Text>
                </View>
              </View>
              <Text style={styles.locationText}>📍 {item.location || 'No address'}</Text>
              <Text style={styles.priceText}>{formatPrice(item.amount)}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  </View>
);

const renderEarnings = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Earnings</Text>
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Trips</Text>
        <Text style={styles.statNumber}>{completedTrips + activeTrips}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Revenue</Text>
        <Text style={styles.statNumber}>{formatPrice(totalEarnings)}</Text>
      </View>
    </View>
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>🧾 Payment History</Text>
      </View>
      {paymentHistory.length === 0 ? (
        <Text style={styles.emptyText}>No payments yet</Text>
      ) : (
        <FlatList
          data={paymentHistory}
          keyExtractor={(item) => String(item.request_id)}
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <View style={styles.requestTop}>
                <Text style={styles.customerName}>#{item.request_id}</Text>
                <Text style={styles.priceText}>{formatPrice(item.amount)}</Text>
              </View>
              <Text style={styles.locationText}>{item.service_type || 'Service'}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  </View>
);

// ===== MAIN RENDER — UPDATED =====
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1a4b6d" />
      <Text style={styles.loadingText}>Loading Dashboard...</Text>
    </View>
  );
}
return (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

    {/* Navbar — ✅ UNCHANGED */}
    <View style={styles.navbar}>
      <View style={styles.navbarContent}>
        <TouchableOpacity style={styles.brand}>
          <Text style={styles.brandText}>🚛 Towing <Text style={styles.brandSpan}>system</Text></Text>
        </TouchableOpacity>
        <View style={styles.navbarRight}>
          <View style={styles.onlineStatus}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          <Text style={styles.clockText}>{currentTime}</Text>
        </View>
      </View>
    </View>

    {/* Profile Header — replaces sidebar profile */}
    {renderProfileHeader()}

    {/* Main Content — FULL WIDTH, NO SIDEBAR */}
    <ScrollView
      style={styles.mainPanel}
      contentContainerStyle={styles.mainContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadDriverDashboardData();
            setRefreshing(false);
          }}
        />
      }
    >
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'tracking' && renderTracking()}
      {activeTab === 'trips' && renderTrips()}
      {activeTab === 'earnings' && renderEarnings()}
    </ScrollView>

    {/* BOTTOM TAB BAR — replaces sidebar */}
    {renderBottomTabBar()}
  </View>
);
};
export default DriverDashboardScreen;