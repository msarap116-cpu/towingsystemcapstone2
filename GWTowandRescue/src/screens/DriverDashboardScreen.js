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
import { launchCamera } from 'react-native-image-picker';
import API_BASE_URL from '../config';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';



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
  // Add these near your other list states
const [driverPayments, setDriverPayments] = useState([]);
const [paymentsLoading, setPaymentsLoading] = useState(false);
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

  //for the pov
  const prevLocationRef = useRef(null);   // last GPS fix, for bearing calc
  const lastRouteCalcRef = useRef(0);     // throttle for OSRM calls
  const ROUTE_RECALC_INTERVAL = 15000;    // recompute route at most every 15s

  const [driverHeading, setDriverHeading] = useState(null);
  const driverHeadingRef = useRef(null); // mirrors driverHeading, readable inside the GPS callback closure

  const [povMode, setPovMode] = useState(true); // start in POV mode

  //photo verification on bushte
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [completingRequestId, setCompletingRequestId] = useState(null);
  const [completingTargetStatus, setCompletingTargetStatus] = useState('completed');

  useEffect(() => {
    customerLocationRef.current = customerLocation;
  }, [customerLocation]);


  // ===== LIFECYCLE =====
  useEffect(() => {
    checkAuth();

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
      Alert.alert(' Session Expired', 'Na-expire na ang imong session. Palihog pag-log in usab.', [
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
const confirmCashReceived = (paymentId) => {
  Alert.alert(
    'Confirm Cash Payment',
    'Confirm that you received cash payment from the customer?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            Alert.alert('Error', 'Please log in again.');
            return;
          }

          try {
            const response = await fetch(
              `${API_BASE_URL}/payments/${paymentId}/cash-received`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
              Alert.alert('Error', data.message || 'Unable to confirm cash payment.');
              return;
            }

            Alert.alert(
              'Payment Confirmed',
              `Cash payment confirmed.\nReceipt: ${data.receipt_number}`
            );

            // Refresh whatever shows this driver's payments
            await refreshPayments();
          } catch (error) {
            console.error('Cash confirmation error:', error);
            Alert.alert('Error', 'Unable to confirm cash payment.');
          }
        },
      },
    ]
  );
};

const refreshPayments = async () => {
  setPaymentsLoading(true);
  try {
    const payments = await fetchDriverPayments();
    setDriverPayments(payments);
  } finally {
    setPaymentsLoading(false);
  }
};
 const loadDriverDashboardData = async () => {
  try {
    console.log('📡 Fetching dashboard data...');
    const [pending, trips, earnings, payments] = await Promise.all([   // 👈 add payments
      fetchPendingRequests(),
      fetchMyTrips(),
      fetchEarningsSummary(),
      fetchDriverPayments(),   // 👈 add this call
    ]);
    console.log(' Dashboard data received:', { pending, trips, earnings, payments });

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

    setDriverPayments(payments);   //now `payments` exists

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
        const { latitude, longitude, accuracy, heading: gpsHeading, speed } = position.coords;
        const prev = prevLocationRef.current;

        // ---- 1. Determine the raw heading ----
        let rawHeading = driverHeadingRef.current ?? 0;

        if (gpsHeading != null && gpsHeading >= 0 && speed != null && speed > 1.5) {
          // Trust the device compass when moving > ~5.4 km/h
          rawHeading = gpsHeading;
        } else if (prev && accuracy <= 50) {
          const movedMeters =
            parseFloat(calculateDistance(prev.latitude, prev.longitude, latitude, longitude)) * 1000;
          if (movedMeters > 10) {
            rawHeading = calculateBearing(prev.latitude, prev.longitude, latitude, longitude);
          }
          // else: keep rawHeading = last known (prevents jitter at stoplights)
        }

        // ---- 2. Smooth the heading (handles 359° -> 1° wrap-around) ----
        let smoothedHeading = rawHeading;
        if (driverHeadingRef.current != null) {
          const delta = ((rawHeading - driverHeadingRef.current + 540) % 360) - 180;
          smoothedHeading = (driverHeadingRef.current + delta * 0.35 + 360) % 360;
        }

        // ---- 3. Update refs ----
        prevLocationRef.current = { latitude, longitude };
        driverHeadingRef.current = smoothedHeading;

        console.log(
          `LIVE GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} | ` +
          `acc: ${accuracy}m | speed: ${speed} | heading: ${smoothedHeading.toFixed(1)}°`
        );

        // ---- 4. Push to state (this triggers LeafletMap rotation) ----
        setDriverLocation({ latitude, longitude });
        setDriverHeading(smoothedHeading);

        // ---- 5. Route + upload (UNCHANGED from your original) ----
        const destination = customerLocationRef.current;
        if (destination) {
          try {
            const now = Date.now();
            if (now - lastRouteCalcRef.current > ROUTE_RECALC_INTERVAL) {
              lastRouteCalcRef.current = now;
              await drawRoute(latitude, longitude, destination.latitude, destination.longitude);
            }
            sendDriverLocation(latitude, longitude);
          } catch (error) {
            console.error('Route drawing or location sending failed:', error);
          }
        }
      },
      error => { console.error('GPS watch error:', error); },
      {
        enableHighAccuracy: false,
        maximumAge: 10000,
        timeout: 30000,
        distanceFilter: 5,
        interval: 5000,
        fastestInterval: 3000,
      }
    );
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const calculateBearing = (lat1, lng1, lat2, lng2) => {
    const toRad = deg => deg * Math.PI / 180;
    const toDeg = rad => rad * 180 / Math.PI;
    const dLng = toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
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
      'completed': 2
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

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;

    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (alreadyGranted) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'We need camera access to verify job completion.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      }
    );

    console.log('📷 Camera permission result:', result);

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Camera Permission Needed',
        'Camera access was permanently denied. Please enable it in Settings to complete this job.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    Alert.alert('Permission required', 'Camera access is needed to complete this job.');
    return false;
  };

  const openCompletionCamera = async (requestId, targetStatus = 'completed') => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Camera access is needed to complete this job.');
      return;
    }

    setCompletingRequestId(requestId);
    setCompletingTargetStatus(targetStatus); // new state, see below

    launchCamera(
      { mediaType: 'photo', cameraType: 'back', saveToPhotos: false, quality: 0.7 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets && response.assets[0];
        if (asset) {
          setCapturedPhoto(asset);
          setPhotoModalVisible(true);
        }
      }
    );
  };

  const uploadCompletionPhoto = async () => {
    if (!capturedPhoto || !completingRequestId) return;
    setUploadingPhoto(true);

    try {
      const token = await AsyncStorage.getItem('token'); // fixed key

      const formData = new FormData();
      formData.append('photo', {
        uri: capturedPhoto.uri,
        type: capturedPhoto.type || 'image/jpeg',
        name: capturedPhoto.fileName || `completion_${Date.now()}.jpg`,
      });
      formData.append('request_id', completingRequestId);
      formData.append('status', completingTargetStatus || 'completed');

      const res = await fetch(`${API_BASE_URL}/driver/trips/${completingRequestId}/complete-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const rawText = await res.text();
      console.log('📦 status:', res.status);
      console.log('📦 raw response:', rawText.slice(0, 500));

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON (status ${res.status}). See console for raw response.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      Alert.alert('Job Completed', 'Completion photo uploaded successfully.');
      setPhotoModalVisible(false);
      setCapturedPhoto(null);
      setCompletingRequestId(null);
      loadDriverDashboardData(); // your existing refresh — confirm this is the real function name
    } catch (err) {
      console.error('uploadCompletionPhoto error:', err);
      Alert.alert('Upload Failed', err.message || 'Could not upload completion photo.');
    } finally {
      setUploadingPhoto(false);
    }
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
          <Text style={styles.roleText}> Driver</Text>
        </View>
      </View>
    </View>
  );

  const renderBottomTabBar = () => (
    <View style={styles.bottomBar}>
      {renderTabItem('dashboard', '📊', 'Dashboard')}
      {renderTabItem('tracking', '📍', 'Tracking')}
      {renderTabItem('trips', '🚗', 'Trips')}
      {renderTabItem('earnings', '💰', 'Earnings')}
      {renderTabItem('logout', '🚪', 'Logout')}
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
  // TRACKING
const renderTracking = () => (
  <View style={styles.trackingWrapper}>
    {/* Map — fills the whole tab as background */}
    <View style={styles.mapBackground}>
      <LeafletMap
        driverLocation={driverLocation}
        customerLocation={customerLocation}
        routeCoordinates={routeCoordinates}
        heading={driverHeading}
        povMode={povMode}
        customerName={activeTripData?.customer_name}
        driverName={user?.name}
        address={activeTripData?.location}
        distanceKm={routeInfo.distanceKm}
        durationMin={routeInfo.durationMin}
      />
    </View>

    {/* Floating top-left: title + status */}
    <View style={styles.trackingOverlayTopLeft} pointerEvents="box-none">
      <View style={styles.trackingInfoCard}>
        <Text style={styles.trackingTitle}>Route Tracking</Text>
        <Text style={styles.trackingStatusText}>
          {trackingStatus || 'No active job – tracking idle.'}
        </Text>
      </View>
    </View>

    {/* Floating top-right: POV toggle */}
    <View style={styles.trackingOverlayTopRight} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.povButton}
        onPress={() => setPovMode(prev => !prev)}
      >
        <Text style={styles.povButtonText}>
          {povMode ? '🧭 POV' : '⬆️ North'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);
  const tripStatusStyle = (status) => {
    switch (status) {
      case 'assigned': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'in progress': return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'completed': return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'cancelled': return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default: return { backgroundColor: '#e2e8f0', color: '#334155' };
    }
  };
  const renderTrips = () => {

    const allTrips = [...(myTrips || []), ...(completedTripsList || [])];
    return (
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Work History</Text>
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
                      {/* {status === 'assigned' && (
                        <TouchableOpacity
                          style={[styles.tripBtn, styles.tripBtnPrimary]}
                          onPress={() => updateTripStatus(item.request_id, 'in progress')}
                        >
                          <Text style={styles.tripBtnPrimaryText}>update</Text>
                        </TouchableOpacity>
                      )} */}

                      {status === 'assigned' && (
                        <TouchableOpacity
                          style={[styles.tripBtn, styles.tripBtnSuccess]}
                          // onPress={() => updateTripStatus(item.request_id, 'completed')}
                          onPress={() => openCompletionCamera(item.request_id, 'completed')}
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
    <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Earnings</Text>

    <View style={styles.gridRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Trips</Text>
        <Text style={styles.statValue}>
          {(completedTrips || 0) + (activeTrips || 0)}
        </Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total Revenue</Text>
        <Text style={styles.statValue}>{formatPrice(totalEarnings ?? 0)}</Text>
      </View>
    </View>

    <View style={[styles.whiteCard, { flex: 1, marginTop: 16 }]}>
      <Text style={styles.cardTitle}>Payment History</Text>

      {paymentsLoading && driverPayments.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : driverPayments?.length ? (
        <FlatList
          data={driverPayments}
          keyExtractor={(item) => String(item.payment_id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const badge = paymentStatusStyle(item.status);
            return (
              <View
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontWeight: '600' }}>#{item.request_id}</Text>
                  <Text>{formatPrice(item.amount)}</Text>
                  <Text
                    style={[
                      {
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: '600',
                        overflow: 'hidden',
                      },
                      badge,
                    ]}
                  >
                    {item.status}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    {item.payment_method}
                  </Text>
                </View>

                {item.payment_method === 'cash' &&
                  item.status === 'awaiting_cash' && (
                    <TouchableOpacity
                      style={[styles.acceptBtn, { marginTop: 8, alignSelf: 'flex-start' }]}
                      onPress={() => confirmCashReceived(item.payment_id)}
                    >
                      <Text style={styles.acceptBtnText}>Mark Cash Received</Text>
                    </TouchableOpacity>
                  )}
              </View>
            );
          }}
        />
      ) : (
        <Text style={styles.emptyMsg}>No payments yet</Text>
      )}
    </View>
  </View>
);
  // ===== MAIN RENDER =====
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
          <Text style={styles.headerTitle}> <Text style={styles.headerGreen}>GoodWrench</Text></Text>
          <View style={styles.headerRight}>
          </View>
        </View>

        {activeTab === 'dashboard' && renderProfileHeader()}

        {/*  MAIN CONTENT — flex:1 ang naa sa styles */}
        <View style={styles.contentArea}>
          {activeTab === 'dashboard' && renderDashboard()}
          <View style={{ flex: 1,marginHorizontal: -16, display: activeTab === 'tracking' ? 'flex' : 'none' }}>
            {renderTracking()}
          </View>
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

        <Modal visible={photoModalVisible} transparent animationType="slide" onRequestClose={() => setPhotoModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm Completion Photo</Text>
              {capturedPhoto && (
                <Image
                  source={{ uri: capturedPhoto.uri }}
                  style={{ width: '100%', height: 250, borderRadius: 8, marginVertical: 12 }}
                />
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={() => setPhotoModalVisible(false)}
                  disabled={uploadingPhoto}
                >
                  <Text style={styles.modalBtnGhostText}>Retake / Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSuccess || styles.tripBtnSuccess]}
                  onPress={uploadCompletionPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? <ActivityIndicator /> : <Text style={styles.modalBtnDangerText || {}}>Confirm & Complete</Text>}
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