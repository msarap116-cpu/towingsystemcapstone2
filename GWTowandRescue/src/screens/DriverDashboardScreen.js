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
  Image,
  PermissionsAndroid,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LeafletMap from '../components/LeafletMap';
import Geolocation from '@react-native-community/geolocation';
import styles from '../styles/DriverDashboardScreen.styles';
import API_BASE_URL from '../config';
import { SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';



const DRIVER_LOCATION_INTERVAL = 5000;

const DriverDashboardScreen = ({ navigation }) => {
  // ===== STATE OF THE NATION =====
  const [activeTripData, setActiveTripData] = useState(null);
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
  // Cancel-trip modal state
const [cancelModalVisible, setCancelModalVisible] = useState(false);
const [cancelReason, setCancelReason] = useState('');
const [cancelRequestId, setCancelRequestId] = useState(null);

  // Map state
  const [routeInfo, setRouteInfo] = useState({ distanceKm: null, durationMin: null });
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
 const customerLocationRef = useRef(null);

  // Watch ID for GPS
  const watchIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastSentRef = useRef(0);
  const mapInitRef = useRef(false);
 const initRequestRef = useRef(null);





useEffect(() => {
  customerLocationRef.current = customerLocation;
}, [customerLocation]);


  // ===== LIFECYCLE =====
useEffect(() => {
  checkAuth();
  updateClock();

  const clockInterval = setInterval(updateClock, 10000);

  return () => {
    clearInterval(clockInterval);

    stopGPSTracking();

    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    mapInitRef.current = false;
  };
}, []);


useEffect(() => {
  if (activeTab === 'tracking') {
    if (!mapInitRef.current) {
      mapInitRef.current = true;

      initRequestRef.current = initDriverMap();
    }
  } else {
    mapInitRef.current = false;

    // Stop GPS immediately when leaving the tracking tab
    stopGPSTracking();
  }

  return () => {
    // This cleanup runs when activeTab changes
    if (activeTab === 'tracking') {
      stopGPSTracking();
    }
  };
}, [activeTab]);
const stopGPSTracking = () => {
  if (watchIdRef.current !== null) {
    Geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }

  console.log('GPS tracking stopped');
};


  // ===== AUTH FUNCTIONS =====
const checkAuth = async () => {
  const token = await AsyncStorage.getItem('token');
  console.log('🔑 token length:', token?.length);
console.log('🔑 token starts:', token?.slice(0, 30) + '...');
console.log('🔑 token ends:   ...' + token?.slice(-30));
console.log('🌐 API_BASE_URL =', API_BASE_URL);
  if (!token) {
    navigation.replace('Login');
    return;
  }

  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    await loadDriverDashboardData();
  } catch (err) {
    console.error('Auth error:', err);

    //  KUNG SESSION EXPIRED → TANGTANGON ANG TOKEN DAYON PADTO SA LOGIN
    Alert.alert('⚠️ Session Expired', 'Na-expire na ang imong session. Palihog pag-log in usab.', [
      {
        text: 'OK',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          navigation.replace('Login');
        }
      }
    ]);
  } finally {
    setLoading(false);
  }
};

const handleAuthFailure = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  Alert.alert(
    '⚠️ Session expired',
    'Please log in again.',
    [{ text: 'OK', onPress: () => navigation.replace('Login') }]
  );
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
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      if (body.code === 'SESSION_EXPIRED') {
        await handleAuthFailure();
      }
      return [];
    }
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('fetchPendingRequests FAILED:', e.message);
    return [];
  }
};

const fetchMyTrips = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) { console.warn(' trips: no token'); return []; }
  const url = `${API_BASE_URL}/requests/my-trips`;
  try {
    console.log('➡️ GET', url);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log('⬅️ my-trips status:', res.status);
    if (!res.ok) {
      console.warn(' my-trips body:', await res.text());
      return [];
    }
    const data = await res.json();
    console.log(' my-trips data:', data);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(' fetchMyTrips FAILED:', e.message);
    return [];
  }
};

const fetchEarningsSummary = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) { console.warn(' earnings: no token'); return { today: 0, allTime: 0 }; }
  const url = `${API_BASE_URL}/earnings/summary`;
  try {
    console.log('➡️ GET', url);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log('⬅️ earnings status:', res.status);
    if (!res.ok) {
      console.warn(' earnings body:', await res.text());
      return { today: 0, allTime: 0 };
    }
    const data = await res.json();
    console.log(' earnings data:', data);
    return data || { today: 0, allTime: 0 };
  } catch (e) {
    console.error(' fetchEarningsSummary FAILED:', e.message);
    return { today: 0, allTime: 0 };
  }
};

const loadDriverDashboardData = async () => {
  console.log('🌐 API_BASE_URL =', API_BASE_URL);
  console.log('🔄 loadDriverDashboardData called');
  try {
    console.log('📡 Fetching dashboard data...');
    const [pending, trips, earnings] = await Promise.all([
      fetchPendingRequests(),
      fetchMyTrips(),
      fetchEarningsSummary()
    ]);
    console.log(' Dashboard data received:', { pending, trips, earnings }); // fixed

    setPendingRequests(pending);
    const active = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    console.log('active trips:', active);
    const completed = trips.filter(t => t.status === 'completed');
    setMyTrips(active);
    setCompletedTripsList(completed);
   setPaymentHistory(completed.slice(0, 10));
    setAvailableJobs(pending.length);
    setActiveTrips(active.length);
    setCompletedTrips(completed.length);
    setTodayEarnings(earnings.today || 0);
    setTotalEarnings(earnings.allTime || 0);

    //  FIX: use completedTripsList, not `completed` (which is .length!)
    // setPaymentHistory(completedTripsList.slice(0, 10));
    // ⚠️ note: completedTripsList here is still the OLD state value (stale closure) —
    // setCompletedTripsList(completed) above hasn't applied yet. Consider using
    // `completed.slice(0, 10)` directly instead.

    // Check for active trip for tracking
    const activeTrip = active.find(t => t.status === 'assigned' || t.status === 'in progress');
    console.log('activeTrip:', activeTrip);
    if (activeTrip) {
      setActiveRequestId(activeTrip.request_id);
      setActiveTripData(activeTrip);

      console.log('lat/lng:', activeTrip.location_lat, activeTrip.location_lng);
      if (activeTrip.location_lat && activeTrip.location_lng) {
        setCustomerLocation({
          latitude: parseFloat(activeTrip.location_lat),
          longitude: parseFloat(activeTrip.location_lng)
        });
        setTrackingStatus(`Active job #${activeTrip.request_id} – tracking in progress.`);
      }
    } else {
      setActiveRequestId(null);
      setActiveTripData(null);
      setTrackingStatus('No active job – waiting for assignment.');
    }
  } catch (error) {
    console.error('loadDriverDashboardData error:', error);
  }
};

  // ===== MAP FUNCTIONS =====
const initDriverMap = async () => {
  try {
    // Use the extracted helper instead of inline PermissionsAndroid calls
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission denied',
        'Please allow location access for live tracking.'
      );
      return;
    }

    let position;
    try {
      position = await getInitialLocation();
    } catch (error) {
      console.warn('High-accuracy location failed. Trying network location:', error);
      position = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 300000,
        });

      });
    }

    // Do not update state if the tracking tab was already closed
    if (activeTab !== 'tracking') {
      return;
    }

    const { latitude, longitude } = position.coords;

    setDriverLocation({
      latitude,
      longitude,
    });

    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });

    // Start watching only after the initial location succeeds
    startGPSTracking();
  } catch (error) {
    console.error('Unable to obtain initial location:', error);
      if (error?.code === 2) {
    promptEnableLocation();
  } else {
    Alert.alert('Location error', 'Unable to get your current location.');
  }
  }
};


const getInitialLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000,
      }
    );
  });
};


const startGPSTracking = () => {
  stopGPSTracking();

  console.log('Starting driver GPS tracking...');

  watchIdRef.current = Geolocation.watchPosition(
    async position => {
      const {
        latitude,
        longitude,
        accuracy,
      } = position.coords;

      console.log(
        `LIVE DRIVER GPS: ${latitude}, ${longitude} | Accuracy: ${accuracy}m`
      );

      setDriverLocation({
        latitude,
        longitude,
      });

      // Read the latest customer location
      const destination = customerLocationRef.current;

      if (destination) {
        try {
          await drawRoute(
            latitude,
            longitude,
            destination.latitude,
            destination.longitude
          );

          sendDriverLocation(latitude, longitude);
        } catch (error) {
          console.error('Route drawing or location sending failed:', error);
        }
      }
    },

  error => { console.error('GPS watch error:', error); },
  {
    enableHighAccuracy: false, // relaxed to match your fallback behavior
    maximumAge: 10000,
    timeout: 30000, // shorter, since network location is faster
    distanceFilter: 5,
    interval: 5000,
    fastestInterval: 3000,
  }
);
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

  //  FIXED OSRM URL — proper format: lon,lat;lon,lat
const drawRoute = async (fromLat, fromLng, toLat, toLng) => {
  try {
    console.log('drawRoute called with:', fromLat, fromLng, toLat, toLng);
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    console.log('OSRM response status:', response.status);
    const data = await response.json();
    console.log('OSRM response code:', data.code, 'routes found:', data.routes?.length);

    if (data.code === 'Ok') {
      const coordinates = data.routes[0].geometry.coordinates;
      console.log('Route points:', coordinates.length);
      const coords = coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      setRouteCoordinates(coords);

      const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
      const durationMin = Math.ceil(data.routes[0].duration / 60);
      setRouteInfo({ distanceKm, durationMin });
    } else {
      console.warn('OSRM returned non-Ok code:', data.code, data.message);
      const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
      setRouteInfo({ distanceKm: straightDistance, durationMin: null });
      setRouteCoordinates([
        { latitude: fromLat, longitude: fromLng },
        { latitude: toLat, longitude: toLng }
      ]);
    }
  } catch (error) {
    console.error('Route drawing error:', error);
    const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
    setRouteInfo({ distanceKm: straightDistance, durationMin: null });
    setRouteCoordinates([
      { latitude: fromLat, longitude: fromLng },
      { latitude: toLat, longitude: toLng }
    ]);
  }
};

const requestLocationPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Tow the Rescue needs your location for live driver tracking.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    const coarse = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    );
    return (
      fine === PermissionsAndroid.RESULTS.GRANTED ||
      coarse === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.error('Location permission error:', error);
    return false;
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
      setActiveTab('tracking');

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
              if (newStatus === 'completed' && Number(activeRequestId) === Number(requestId)) {
                setActiveRequestId(null);
                setCustomerLocation(null);
                setActiveTripData(null);
                setRouteCoordinates([]);
setRouteInfo({ distanceKm: null, durationMin: null });   // add this
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

// ===== CANCEL TRIP (uses Modal, not Alert.prompt) =====
const openCancelModal = (requestId) => {
  setCancelRequestId(requestId);
  setCancelReason('');
  setCancelModalVisible(true);
};

const confirmCancelTrip = async () => {
  const requestId = cancelRequestId;
  if (!requestId) return;

  const token = await AsyncStorage.getItem('token');
  if (!token) {
    Alert.alert('Error', 'Please log in again.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: cancelReason || 'Cancelled by driver' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cancel failed');

    Alert.alert('Success', `Job #${requestId} cancelled.`);
    setCancelModalVisible(false);
    setCancelRequestId(null);
    setCancelReason('');

    await loadDriverDashboardData();

    if (Number(activeRequestId) === Number(requestId)) {
      setActiveRequestId(null);
      setCustomerLocation(null);
      setRouteCoordinates([]);
      setRouteInfo({ distanceKm: null, durationMin: null });   // add this
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTrackingStatus('No active job – waiting for assignment.');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    Alert.alert('Error', 'Failed to cancel trip: ' + error.message);
  }
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

const promptEnableLocation = () => {
  Alert.alert(
    'Location is turned off',
    'Please turn on Location to enable live tracking.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'android') {
            Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
          } else {
            Linking.openURL('app-settings:');
          }
        },
      },
    ]
  );
};
const onRefresh = async () => {
  setRefreshing(true);
  try { await loadDriverDashboardData(); }
  finally { setRefreshing(false); }
};
  // ===== RENDER FUNCTIONS — BOTTOM TAB BAR =====
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

const renderBottomTabBar = () => (
  <View style={styles.bottomBar}>
    {renderTabItem('dashboard', '📊', 'Dashboard')}
    {renderTabItem('tracking',  '📍', 'Tracking')}
    {renderTabItem('trips',     '🚗', 'Trips')}
    {renderTabItem('earnings',  '💰', 'Earnings')}
    {renderTabItem('logout',    '🚪', 'Logout')}
  </View>
);
  // ===== RENDER TABS =====
const renderDashboard = () => (
  <View style={{ flex: 1 }}>
    <View style={styles.gridRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Available Jobs</Text>
        <Text style={styles.statValue}>{availableJobs ?? 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>My Active Trips</Text>
        <Text style={styles.statValue}>{activeTrips ?? 0}</Text>
      </View>
    </View>

    <View style={styles.gridRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Trips Completed</Text>
        <Text style={styles.statValue}>{completedTrips ?? 0}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Today's Earnings</Text>
        <Text style={styles.statValue}>{formatPrice(todayEarnings ?? 0)}</Text>
      </View>
    </View>

    <View style={styles.whiteCard}>
      <Text style={styles.cardTitle}>Available Requests</Text>

      {pendingRequests?.length ? (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => String(item.request_id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadDriverDashboardData}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestName}>{item.customer_name}</Text>
                {!!item.location && (
                  <Text style={styles.requestLocation}>📍 {item.location}</Text>
                )}
                {!!item.amount && (
                  <Text style={styles.requestAmount}>
                    {formatPrice(item.amount)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => acceptJob(item.request_id)}
              >
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <Text style={styles.emptyMsg}>No pending requests</Text>
      )}
    </View>
  </View>
);

// Helper for bottom bar tabs
const renderTabItem = (tabKey, icon, label) => {
  const isActive = activeTab === tabKey;
  return (
    <TouchableOpacity
      style={[styles.tabItem, isActive && styles.tabItemActive]}
      onPress={() => {
        if (tabKey === 'logout') handleLogout();
        else setActiveTab(tabKey);
      }}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[
        styles.tabText,
        isActive && styles.tabTextActive,
        tabKey === 'logout' && styles.logoutText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

  //  FIXED: removed undefined `latestRequest?.address` reference
 // TRACKING
const renderTracking = () => (
  <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
    <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Live Tracking</Text>
    <Text style={{ color: '#64748b', marginBottom: 12 }}>
      {trackingStatus || 'No active job – tracking idle.'}
    </Text>
    {/* INCREASED MAP HEIGHT — pick one option below */}
    <View style={[
      styles.mapContainer,
      {
        // Option A: Fixed height (easy control)
        height: 500, // change from 300 → 450 / 500 / 550 / 600

        // Option B: Fill available space (BEST for React Native)
        // flex: 1, // uncomment this, remove height above

        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0'
      }
    ]}>
<LeafletMap
  driverLocation={driverLocation}
  customerLocation={customerLocation}
  routeCoordinates={routeCoordinates}
  mapRegion={mapRegion}
  customerName={activeTripData?.customer_name}
  driverName={user?.name}
  address={activeTripData?.location}
  distanceKm={routeInfo.distanceKm}
  durationMin={routeInfo.durationMin}
/>
    </View>
  </View>
);
  const tripStatusStyle = (status) => {
  switch (status) {
    case 'assigned':    return { backgroundColor: '#dbeafe', color: '#1e40af' };
    case 'in progress': return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'completed':   return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'cancelled':   return { backgroundColor: '#fee2e2', color: '#991b1b' };
    default:            return { backgroundColor: '#e2e8f0', color: '#334155' };
  }
};
const renderTrips = () => {

  const allTrips = [...(myTrips || []), ...(completedTripsList || [])];
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20 }}>My Trips</Text>
      <View style={{ flex: 1 }}>
        {allTrips.length === 0 ? (
          <View style={styles.whiteCard}>
            <Text style={styles.emptyMsg}>No trips yet</Text>
          </View>
        ) : (
          <FlatList
            data={allTrips}
            keyExtractor={(item) => String(item.request_id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadDriverDashboardData} />
            }
            renderItem={({ item }) => {
  const status = item.status;
  return (
    <View style={styles.whiteCard}>
      <View style={styles.tripHeaderRow}>
        <Text style={styles.tripId}>#{item.request_id}</Text>
        <Text style={[styles.tripStatusPill, tripStatusStyle(status)]}>
          {status}
        </Text>
      </View>
      <Text style={styles.tripLocation}>📍 {item.location || '—'}</Text>
      <Text style={styles.tripAmount}>{formatPrice(item.amount)}</Text>

      <View style={styles.tripActions}>
        {status === 'assigned' && (
          <TouchableOpacity
            style={[styles.tripBtn, styles.tripBtnPrimary]}
            onPress={() => updateTripStatus(item.request_id, 'in progress')}
          >
            <Text style={styles.tripBtnPrimaryText}>Start Trip</Text>
          </TouchableOpacity>
        )}

        {status === 'in progress' && (
          <TouchableOpacity
            style={[styles.tripBtn, styles.tripBtnSuccess]}
            onPress={() => updateTripStatus(item.request_id, 'completed')}
          >
            <Text style={styles.tripBtnSuccessText}>Complete</Text>
          </TouchableOpacity>
        )}

        {(status === 'assigned' || status === 'in progress') && (
          <TouchableOpacity
            style={[styles.tripBtn, styles.tripBtnDanger]}
            onPress={() => openCancelModal(item.request_id)}
          >
            <Text style={styles.tripBtnDangerText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}}
          />
        )}
      </View>
    </View>
  );
};
const renderEarnings = () => (
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20 }}>Earnings</Text>
    <View style={styles.gridRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Trips</Text>
        <Text style={styles.statValue}>{(completedTrips||0) + (activeTrips||0)}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Revenue</Text>
        <Text style={styles.statValue}>{formatPrice(totalEarnings ?? 0)}</Text>
      </View>
    </View>
    <View style={[styles.whiteCard, { flex: 1, marginTop: 16 }]}>
      <Text style={styles.cardTitle}>Payment History</Text>
      {paymentHistory?.length ? (
        <FlatList
          data={paymentHistory}
          keyExtractor={(item) => String(item.request_id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadDriverDashboardData} />
          }
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <Text>#{item.request_id} — {formatPrice(item.amount)}</Text>
            </View>
          )}
        />
      ) : <Text style={styles.emptyMsg}>No payments yet</Text>}
    </View>
  </View>
);
  // ===== MAIN RENDER =====
  // ===== MAIN RENDER — FIXED NESTED SCROLLVIEW WARNING =====
if (loading) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a4b6d" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

return (
  <SafeAreaProvider>
    {/*  Gamit ang SafeAreaView gikan sa bag-ong library, dili View */}
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header / Navbar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>🚛 Towing <Text style={styles.headerGreen}>system</Text></Text>
        <View style={styles.headerRight}>
          <View style={styles.onlineRow}>
            <View style={styles.greenDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
      </View>

{renderProfileHeader()}

      {/*  MAIN CONTENT — flex:1 ang naa sa styles */}
      <View style={styles.contentArea}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'tracking' && renderTracking()}
        {activeTab === 'trips' && renderTrips()}
        {activeTab === 'earnings' && renderEarnings()}
      </View>

      {/* Bottom Tab Bar */}
{renderBottomTabBar()}
      {/* Cancel Trip Modal */}
<Modal
  visible={cancelModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setCancelModalVisible(false)}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Cancel Trip</Text>
      <Text style={styles.modalSubtitle}>
        Job #{cancelRequestId} — enter a reason (optional)
      </Text>
      <TextInput
        style={styles.modalInput}
        placeholder="Reason for cancellation"
        value={cancelReason}
        onChangeText={setCancelReason}
        multiline
      />
      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalBtn, styles.modalBtnGhost]}
          onPress={() => setCancelModalVisible(false)}
        >
          <Text style={styles.modalBtnGhostText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalBtn, styles.modalBtnDanger]}
          onPress={confirmCancelTrip}
        >
          <Text style={styles.modalBtnDangerText}>Confirm Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  </SafeAreaProvider>
);


};

export default DriverDashboardScreen;