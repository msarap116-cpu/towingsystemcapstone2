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
  Image,
  FlatList,
  Platform,
  PermissionsAndroid,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LeafletMap from '../components/LeafletMap';
import styles from '../styles/DashboardScreen.styles';
import Geolocation from '@react-native-community/geolocation';
import { launchImageLibrary } from 'react-native-image-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import FileViewer from 'react-native-file-viewer';
import Pdf from 'react-native-pdf';
import API_BASE_URL from '../config';

// Import icons (you can use react-native-vector-icons or emojis)
// For now using emojis, replace with your actual icons

const DashboardScreen = ({ navigation, route }) => {
  // ===== STATE =====
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState('');

  // Map state
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.1167,
    longitude: 124.9,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [customerLocation, setCustomerLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [eta, setEta] = useState('');
  const [distance, setDistance] = useState('');

  // Request state
  const [latestRequest, setLatestRequest] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [requestId, setRequestId] = useState(null);

  // Payment state

  const [paymentAmount, setPaymentAmount] = useState('₱0.00');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [gcashReference, setGcashReference] = useState('');
  const [gcashProof, setGcashProof] = useState(null);
  // const [showGcashForm, setShowGcashForm] = useState(false);

  // Replace:
  //   const [showGcashForm, setShowGcashForm] = useState(false);
  // With for the future adding methods:
  const [activePaymentMethod, setActivePaymentMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [gcashProofType, setGcashProofType] = useState('image/jpeg');
  const [gcashProofName, setGcashProofName] = useState('proof.jpg');
  const PAYMENT_DRAFT_KEY = 'payment_draft';

  // Edit address state

  const [editAddress, setEditAddress] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);

  // Pin modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinName, setPinName] = useState('');
  const [savedPins, setSavedPins] = useState([]);

  // Polling
  const pollingInterval = useRef(null);

  // ===== LIFECYCLE =====
  useEffect(() => {
    if (isPaid) {
      setActivePaymentMethod(null);
      setGcashReference('');
      setGcashProof(null);
    }
  }, [isPaid]);

  useEffect(() => {
    checkAuth();
    updateClock();

    const clockInterval = setInterval(updateClock, 10000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
  if (activeTab === 'editaddress' && latestRequest) {
    setEditAddress(latestRequest.address || '');
    setEditLat(String(latestRequest.location_lat || ''));
    setEditLng(String(latestRequest.location_lng || ''));
  }
}, [activeTab, latestRequest]);

useEffect(() => {
    const payId = route?.params?.pay;
    if (!payId || !latestRequest) return;

    if (String(latestRequest.request_id) === String(payId)) {
        setPaymentAmount(`₱${Number(latestRequest.amount || 0).toFixed(2)}`);
        setActiveTab('payment');
    }
}, [route?.params?.pay, latestRequest]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !latestRequest) {
      return;
    }

    loadUserMap();
    startPolling();

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [activeTab, latestRequest]);
  useEffect(() => {
    if (!requestId) {
      return;
    }












    let cancelled = false;

    async function restoreDraft() {
      try {
        const raw = await AsyncStorage.getItem(PAYMENT_DRAFT_KEY);

        if (!raw || cancelled) {
          return;
        }

        const draft = JSON.parse(raw);

        if (draft.request_id === requestId) {
          setActivePaymentMethod(draft.activePaymentMethod || null);
          setGcashReference(draft.gcashReference || '');
          setGcashProof(draft.gcashProof || null);
          setPaymentMessage(draft.paymentMessage || '');
        } else {
          await AsyncStorage.removeItem(PAYMENT_DRAFT_KEY);
        }
      } catch (error) {
        console.warn('Failed to load payment draft', error);
      }
    }

    restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [requestId]);
  useEffect(() => {
    const hasDraft =
      activePaymentMethod ||
      gcashReference ||
      gcashProof ||
      paymentMessage;

    if (!hasDraft || !requestId) {
      return;
    }

    const draft = {
      request_id: requestId,
      activePaymentMethod,
      gcashReference,
      gcashProof,
      paymentMessage,
    };

    AsyncStorage
      .setItem(PAYMENT_DRAFT_KEY, JSON.stringify(draft))
      .catch(error => {
        console.warn('Failed to save payment draft', error);
      });
  }, [
    activePaymentMethod,
    gcashReference,
    gcashProof,
    paymentMessage,
    requestId,
  ]);



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
        setUser(JSON.parse(userData));
      }
      await loadDashboardData();
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    if (AppState.currentState !== 'active') {
      // Activity not attached — bail or queue the alert
      return;
    }
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.replace('Login', { logoutMessage: 'Logout successful!' });
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ===== DASHBOARD DATA =====
  const loadDashboardData = async (silent = false) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Load latest request
      const res = await fetch(`${API_BASE_URL}/requests/latest`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        const request = Array.isArray(data) ? data[0] : data;
        console.log('POLL RESULT:', request?.id, request?.status);
        console.log('RENDERING WITH STATUS:', latestRequest?.status);

        setLatestRequest(request);
        if (request) {
          setRequestId(request.request_id);
          setCustomerLocation({
            latitude: parseFloat(request.location_lat),
            longitude: parseFloat(request.location_lng)
          });
          if (request.driver_lat && request.driver_lng) {
            setDriverLocation({
              latitude: parseFloat(request.driver_lat),
              longitude: parseFloat(request.driver_lng)
            });
          }
        }
      }

      // Load recent activities
      await loadRecentActivity();

      // Load receipts
      await loadMyReceipts();

    } catch (error) {
      console.error('Dashboard load error:', error);
      if (!silent) {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    }
  };

  // ===== MAP FUNCTIONS =====
  const loadUserMap = async () => {
    if (!latestRequest) return;

    const lat = parseFloat(latestRequest.location_lat);
    const lng = parseFloat(latestRequest.location_lng);

    setMapRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });

    setCustomerLocation({ latitude: lat, longitude: lng });

    if (latestRequest.driver_lat && latestRequest.driver_lng) {
      const dLat = parseFloat(latestRequest.driver_lat);
      const dLng = parseFloat(latestRequest.driver_lng);
      setDriverLocation({ latitude: dLat, longitude: dLng });
      await drawRoute(dLat, dLng, lat, lng);
    }
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

        const distKm = (data.routes[0].distance / 1000).toFixed(1);
        const durMin = Math.ceil(data.routes[0].duration / 60);
        setDistance(`${distKm} km`);
        setEta(`${durMin} min`);
      }
    } catch (error) {
      console.error('Route drawing error:', error);
    }
  };

  const startPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          const request = Array.isArray(data) ? data[0] : data; // <-- request is defined HERE
          console.log('POLL RESULT:', request?.id, request?.status);
          console.log('RENDERING WITH STATUS:', latestRequest?.status);
          setLatestRequest(request); // <-- so this call has to live HERE too, same scope

          if (request?.driver_lat && request?.driver_lng) {
            const dLat = parseFloat(request.driver_lat);
            const dLng = parseFloat(request.driver_lng);
            setDriverLocation({ latitude: dLat, longitude: dLng });
            if (customerLocation) {
              await drawRoute(dLat, dLng, customerLocation.latitude, customerLocation.longitude);
            }
          }

          if (request?.status === 'completed') {
            clearInterval(pollingInterval.current);
            setDriverLocation(null);   // remove the marker
            drawRoute([]);        // or whatever state holds your polyline — clear it too
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000);
  };

  // ===== RECENT ACTIVITY =====
  const loadRecentActivity = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/requests/latest`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        setRecentActivities(Array.isArray(data) ? data : [data]);
      }
    } catch (error) {
      console.error('Recent activity error:', error);
    }
  };

  // ===== RECEIPTS =====
  const loadMyReceipts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/payments/mine`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setReceipts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Receipts error:', error);
    }
  };

  // ===== PAYMENT FUNCTIONS =====
  // const openPaymentModal = () => {
  //   if (!latestRequest) {
  //     Alert.alert('No Request', 'No active request for payment');
  //     return;
  //   }
  //   setPaymentAmount(`₱${Number(latestRequest.amount || 0).toFixed(2)}`);
  //   setPaymentMessage('');
  //   setShowGcashForm(false);
  //   setPaymentModalVisible(true);
  // };

  // ---------- MAIN PAYMENT HANDLER ----------
  const processPaymentMethod = async (method) => {


    if (isPaid) {
      setPaymentMessage('This request is already paid.');
      return;
    }
    console.log('processPaymentMethod called:', method);
    setActivePaymentMethod(method);

    if (!latestRequest || !latestRequest.request_id) {
      setPaymentMessage('No service request is available for payment.');
      return;
    }

    const requestId = latestRequest.request_id;
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      setPaymentMessage('Please log in again.');
      return;
    }

    try {
      // 1. Check existing payment status (like the web app)
      const statusRes = await fetch(
        `${API_BASE_URL}/payments/request/${requestId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const statusData = await statusRes.json();

      if (!statusRes.ok) {
        throw new Error(statusData.message || 'Failed to check payment status.');
      }

      const payment = statusData.payment;
      console.log('Existing payment:', payment);

      // 2. CASH
      if (method === 'cash') {
        setActivePaymentMethod('cash');
        if (payment) {
          if (payment.status === 'completed') {
            setPaymentMessage('This request has already been paid.');
            return;
          }
          if (payment.status === 'awaiting_cash') {
            setPaymentMessage('Cash payment is selected. Please pay the driver.');
            return;
          }
          if (payment.status === 'refunded') {
            setPaymentMessage('This payment was refunded.');
            return;
          }
        }
        await selectCashPayment(requestId, token);
        return;
      }

      // 3. GCASH
      if (method === 'gcash') {
        if (payment) {
          if (payment.status === 'awaiting_payment') {
            await startGCashPayment(requestId, token);
            return;
          }
          if (payment.status === 'pending') {
            setPaymentMessage('Proof already submitted, awaiting verification.');
            return;
          }
          if (payment.status === 'completed') {
            setPaymentMessage('This request has already been paid.');
            return;
          }
          if (payment.status === 'failed') {
            setPaymentMessage('Previous proof rejected. You may submit again.');
            await startGCashPayment(requestId, token);
            return;
          }
          if (payment.status === 'refunded') {
            setPaymentMessage('This payment was refunded.');
            return;
          }
        }
        await startGCashPayment(requestId, token);
      }
      console.log('latestRequest:', latestRequest);
    } catch (error) {
      console.error('Payment status check failed:', error);
      setPaymentMessage(error.message || 'Unable to check payment status.');
    }
  };

  const isPaid =
    latestRequest?.status === 'completed' ||
    latestRequest?.payment_status === 'paid' ||
    latestRequest?.payment_status === 'completed' ||
    latestRequest?.is_paid === true;

  // ---------- GCASH START ----------
  const startGCashPayment = async (requestId, token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/gcash/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to start payment.');

      const payment = data.payment;

      if (payment.status === 'completed') {
        setPaymentMessage('This request has already been paid.');
        return;
      }
      if (payment.status === 'pending') {
        setPaymentMessage('Proof already submitted, awaiting verification.');
        return;
      }

      setActivePaymentMethod('gcash');
      setPaymentMessage('Pay the displayed amount through GCash, then upload your receipt.');
    } catch (err) {
      console.error('Start GCash payment error:', err);
      setPaymentMessage(err.message);
    }
  };

  // ---------- CASH ----------
  const selectCashPayment = async (requestId, token) => {
    return new Promise((resolve) => {
      Alert.alert(
        'Cash Payment',
        'Do you want to pay in cash to the driver?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                const res = await fetch(`${API_BASE_URL}/payments/cash`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ request_id: requestId }),
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                  setPaymentMessage(data.message || 'Unable to select cash payment.');
                  return resolve();
                }

                setPaymentMessage(
                  'Cash payment selected. Please pay the driver when service is completed.'
                );
                console.log('Cash payment created:', data.payment);
                resolve();
              } catch (err) {
                console.error('Cash payment error:', err);
                setPaymentMessage('Unable to select cash payment.');
                resolve();
              }
            },
          },
        ]
      );
    });
  };

  // ---------- SUBMIT GCASH PROOF ----------
  const submitGcashProof = async () => {
    if (!gcashReference.trim() || !gcashProof) {
      Alert.alert('Missing info', 'Please enter a reference number and upload a receipt.');
      return;
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setPaymentMessage('Please log in again.');
      return;
    }

    setSubmitting(true);
    setPaymentMessage('');

    try {
      const formData = new FormData();
      formData.append('request_id', String(latestRequest.request_id));
      formData.append('reference_number', gcashReference.trim());

      // Normalize URI for Android
      const uri =
        gcashProof.startsWith('file://') || gcashProof.startsWith('content://')
          ? gcashProof
          : `file://${gcashProof}`;

      formData.append('proof_image', {
        uri,
        type: 'image/jpeg',
        name: 'proof.jpg',
      });

      const res = await fetch(`${API_BASE_URL}/payments/gcash/submit-proof`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },  // ⚠️ don't set Content-Type
        body: formData,
      });

      const data = await res.json();
      setPaymentMessage(data.message || 'Proof submitted.');

      if (data.success) {
        setActivePaymentMethod(null);
        setGcashReference('');
        setGcashProof(null);
        setPaymentMessage('');
        await AsyncStorage.removeItem(PAYMENT_DRAFT_KEY);   //  clear persisted draft
        Alert.alert('Success', 'Payment proof submitted!');
      }
    } catch (err) {
      console.error('Proof submission error:', err);
      setPaymentMessage('Unable to submit proof of payment.');
    } finally {
      setSubmitting(false);
    }
  };
  const pickProofImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',      // 'photo' | 'video' | 'mixed'
        quality: 0.8,
        includeBase64: false,
      },
      (response) => {
        // User cancelled the picker
        if (response.didCancel) {
          console.log('User cancelled image picker');
          return;
        }

        // Picker returned an error
        if (response.errorCode) {
          console.error('ImagePicker Error:', response.errorMessage);
          Alert.alert('Error', response.errorMessage || 'Could not open picker.');
          return;
        }

        // Success — grab the first asset
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          console.log('Picked image:', asset.uri, asset.type, asset.fileName);

          setGcashProof(asset.uri);
          setGcashProofType(asset.type || 'image/jpeg');
          setGcashProofName(asset.fileName || 'proof.jpg');
        }
      }
    );
  };

  const downloadReceipt = async (paymentId) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Authentication required', 'Please log in again.');
      return;
    }

    try {
      const url = `${API_BASE_URL}/payments/${paymentId}/receipt`;
      const path = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/receipt_${paymentId}.pdf`;

      const res = await ReactNativeBlobUtil.config({
        fileCache: true,
        path,
      }).fetch('GET', url, {
        Authorization: `Bearer ${token}`,
      });

      const status = res.info().status;
      if (status !== 200) {
        throw new Error(`Failed to download receipt (status ${status})`);
      }
      <Pdf
        source={{ uri: filePath }}
        onError={(error) => console.log('PDF render error:', error)}
        style={{ flex: 1 }}
      />

      const filePath = res.path();
      const exists = await ReactNativeBlobUtil.fs.exists(filePath);
      console.log('Receipt saved to:', filePath, 'exists:', exists);


      if (!exists) {
        throw new Error('Downloaded file not found on disk');
      }

      Alert.alert(
        'Receipt Downloaded',
        'Open or save the receipt?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open / Save',
            onPress: () => {
              navigation.navigate('PdfViewer', {
                filePath,
                title: `Receipt ${paymentId}`,
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Download receipt error:', error);
      Alert.alert('Error', error.message || 'Failed to download receipt.');
    }
  };
  // ===== EDIT ADDRESS =====
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const GEO_HEADERS = {
    Accept: 'application/json',
  };

  // debounce wrapper (called from onChangeText)
  const searchAddress = (query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(query), 600);
  };

  // actual fetch
  const runSearch = async (query) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url =
        `${API_BASE_URL}/geocode/search?` +
        `q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: GEO_HEADERS,
      });

      const text = await response.text();
      console.log('LocationIQ search status:', response.status);
      console.log('LocationIQ search body:', text.slice(0, 300));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned non-JSON: ' + text.slice(0, 120));
      }

      setAddressSuggestions(Array.isArray(data) ? data : []);
      setShowSuggestions(Array.isArray(data) && data.length > 0);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Address search failed:', err.message);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };
  const selectAddress = (result) => {
    setEditAddress(result.display_name);
    setEditLat(result.lat);
    setEditLng(result.lon);
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const useCurrentLocation = async () => {
    try {
      setLocating(true);

      // ---- 1. Ask for permission (Android only) ----
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to set your address.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Please allow location access.');
          return;
        }
      }

      // ---- 2. Get GPS coords ----
      Geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setEditLat(lat.toFixed(6));
          setEditLng(lng.toFixed(6));
          setEditAddress('Finding your address...');

          // ---- 3. Reverse geocode via YOUR backend (LocationIQ) ----
          try {
            const url =
              `${API_BASE_URL}/geocode/reverse?` +
              `lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;

            const res = await fetch(url, { headers: GEO_HEADERS });
            const text = await res.text();

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
            }

            const data = JSON.parse(text);
            setEditAddress(
              data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            );
          } catch (err) {
            console.warn('Reverse geocode failed:', err.message);
            setEditAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          } finally {
            setLocating(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocating(false);
          switch (error.code) {
            case 1:
              Alert.alert('Permission denied', 'Location access was denied.');
              break;
            case 2:
              Alert.alert('Unavailable', 'Your location is unavailable.');
              break;
            case 3:
              Alert.alert('Timeout', 'Getting your location took too long.');
              break;
            default:
              Alert.alert('Error', 'Unable to determine your location.');
          }
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
      );
    } catch (err) {
      console.error('useCurrentLocation error:', err);
      setLocating(false);
      Alert.alert('Error', 'Something went wrong getting your location.');
    }
  };

const saveAddress = async () => {
  if (!editAddress || !editLat || !editLng) {
    Alert.alert('Error', 'Please select a valid address');
    return;
  }

  const token = await AsyncStorage.getItem('token');

  try {
    const response = await fetch(
      `${API_BASE_URL}/requests/${latestRequest?.request_id}/address`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: editAddress,
          location_lat: parseFloat(editLat),
          location_lng: parseFloat(editLng),
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      Alert.alert('Success', 'Address updated successfully!');
      setActiveTab('dashboard');   // 👈 tab switch instead of closing modal
      loadDashboardData();
    } else {
      Alert.alert('Error', data.error || 'Failed to update address');
    }
  } catch (error) {
    console.error('Save address error:', error);
    Alert.alert('Error', 'Failed to update address');
  }
};

  // ===== HELPERS =====
  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const cancelRequest = (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            const token = await AsyncStorage.getItem('token');
            try {
              const response = await fetch(`${API_BASE_URL}/requests/${requestId}/cancel`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: 'Cancelled by customer' })
              });

              if (response.ok) {
                Alert.alert('Success', 'Request cancelled');
                loadDashboardData();
              }
            } catch (error) {
              console.error('Cancel error:', error);
            }
          }
        }
      ]
    );
  };


  // ===== RENDER FUNCTIONS — BOTTOM TAB BAR =====
  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarInitials}>
          {user ? getInitials(user.name) : 'U'}
        </Text>
      </View>
      <View style={styles.profileInfo}>
        {/*  REMOVED the bad {username} line — kept only the good one */}
        <Text numberOfLines={1} style={styles.profileName}>
          {user?.name || 'User'}
        </Text>
        <Text style={styles.userType}>⭐ Customer</Text>
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
        style={[styles.tabItem, activeTab === 'request' && styles.tabItemActive]}
        onPress={() => navigation.navigate('RequestForm')}
      >
        <Text style={styles.tabIcon}>🆕</Text>
        <Text style={[styles.tabText, activeTab === 'request' && styles.tabTextActive]}>Request</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'payment' && styles.tabItemActive]}
        onPress={() => setActiveTab('payment')}
      >
        <Text style={styles.tabIcon}>💵</Text>
        <Text style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}>
          Payment
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'editaddress' && styles.tabItemActive]}
        onPress={() => setActiveTab('editaddress')}
      >
        <Text style={styles.tabIcon}>📍</Text>
        <Text style={[styles.tabText, activeTab === 'editaddress' && styles.tabTextActive]}>
          Address
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'receipts' && styles.tabItemActive]}
        onPress={() => setActiveTab('receipts')}
      >
        <Text style={styles.tabIcon}>🧾</Text>
        <Text style={[styles.tabText, activeTab === 'receipts' && styles.tabTextActive]}>Receipts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'recent' && styles.tabItemActive]}
        onPress={() => setActiveTab('recent')}
      >
        <Text style={styles.tabIcon}>📋</Text>
        <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>Activity</Text>
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

  // ===== RENDER TABS — UNCHANGED =====
  const renderDashboard = () => (
    <View style={styles.dashboardWrapper}>
      {/* Map as full-bleed background */}
      <View style={styles.mapBackground}>
        <LeafletMap
          mode="customer"
          customerLocation={customerLocation}
          driverLocation={driverLocation}
          routeCoordinates={routeCoordinates}
          address={latestRequest?.address}
          customerName={user?.name}
          driverName={latestRequest?.driver_name}
          distanceKm={distance}
          durationMin={eta}
        />
      </View>

      {/* Floating overlay: request id + status + ETA (right aligned, no bg) */}
      <View style={styles.overlayTop} pointerEvents="box-none">
        <View style={styles.requestBadge}>
          <Text style={styles.trackingNumber}>
            #{latestRequest?.request_id || 'N/A'}
          </Text>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  latestRequest?.status === 'completed' ? '#28a745' : '#ffc107',
              },
            ]}
          >
            <Text style={styles.statusText}>
              {latestRequest?.status || 'No Active Request'}
            </Text>
          </View>

          {eta && (
            <View style={styles.etaBox}>
              <Text style={styles.etaText}>ETA {eta}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
  const renderRecentActivity = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Recent Activity</Text>
      {recentActivities.length === 0 ? (
        <Text style={styles.emptyText}>No recent activity</Text>
      ) : (
        <FlatList
          contentContainerStyle={styles.tabContentPadding}
          data={recentActivities}
          keyExtractor={(item) => String(item.request_id)}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <Text style={styles.historyId}>#{item.request_id}</Text>
              <Text style={styles.historyService}>{item.service_type || 'Service'}</Text>
              <View style={[styles.historyStatus,
              { backgroundColor: item.status === 'completed' ? '#28a745' : '#ffc107' }
              ]}>
                <Text style={styles.historyStatusText}>{item.status || 'Unknown'}</Text>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => cancelRequest(item.request_id)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );

  const formatAmount = (val) => {
    const n = typeof val === 'string'
      ? Number(val.replace(/[^0-9.-]/g, ''))
      : Number(val || 0);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  const renderReceipts = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>My Receipts</Text>

      {receipts.length === 0 ? (
        <Text style={styles.emptyText}>No receipts found</Text>
      ) : (
        <FlatList

          data={receipts}
          keyExtractor={(item) => String(item.payment_id)}
          contentContainerStyle={styles.tabContentPadding}
          renderItem={({ item }) => (
            <View style={styles.receiptItem}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt #</Text>
                <Text style={styles.receiptValue}>{item.receipt_number || '—'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Request #</Text>
                <Text style={styles.receiptValue}>{item.request_id || '—'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount</Text>
                <Text style={styles.receiptAmount}>
                  ₱{formatAmount(item.amount)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date</Text>
                <Text style={styles.receiptValue}>
                  {formatDate(item.payment_date)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status</Text>
                <View
                  style={[
                    styles.receiptStatus,
                    {
                      backgroundColor:
                        item.status === 'completed' ? '#28a745' : '#ffc107',
                    },
                  ]}
                >
                  <Text style={styles.receiptStatusText}>
                    {item.status || 'Pending'}
                  </Text>
                </View>
              </View>

              {item.status === 'completed' ? (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => downloadReceipt(item.payment_id)}
                >
                  <Text style={styles.downloadButtonText}>Generate Receipt</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.receiptValue}>—</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
const renderEditAddress = () => {
  if (!latestRequest) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.emptyText}>No active request to edit</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentPadding}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Text style={styles.tabTitle}>Edit Address</Text>

      <TextInput
        style={styles.input}
        placeholder="Search for an address..."
        value={editAddress}
        onChangeText={(text) => {
          setEditAddress(text);
          searchAddress(text);
        }}
      />

      {showSuggestions && addressSuggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          {addressSuggestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => selectAddress(item)}
            >
              <Text style={styles.suggestionText}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.currentLocationButton, locating && { opacity: 0.6 }]}
        onPress={useCurrentLocation}
        disabled={locating}
      >
        <Text style={styles.currentLocationText}>
          {locating ? '📡 Getting your location...' : '📍 Use My Current Location'}
        </Text>
      </TouchableOpacity>

      {editLat && editLng && (
        <View style={styles.selectedLocation}>
          <Text style={styles.selectedTitle}>📍 Location selected</Text>
          <Text style={styles.selectedSubText}>{editAddress}</Text>
          <Text style={styles.selectedSubText}>
            Lat: {editLat}  •  Lng: {editLng}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={saveAddress}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

  {/* ================= PAYMENT TAB CONTENT ================= */ }
  const renderPayment = () => (
    <View style={styles.tabContent}>
      <ScrollView
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.modalTitle}>Payment</Text>
        </View>

        {/* Request info */}
        <View style={styles.paymentRequestInfo}>
          <Text style={styles.paymentInfoHeading}>Payment for Request</Text>
          <Text style={styles.paymentInfoLine}>
            Request # <Text style={styles.bold}>{latestRequest?.request_id ?? '--'}</Text>
          </Text>
          <Text style={styles.paymentAmountLine}>
            Amount Due: <Text style={styles.bold}>{paymentAmount}</Text>
          </Text>
        </View>
        {/*   If already paid, show a lock card and stop here */}
        {isPaid ? (
          <View style={styles.gcashSection}>
            <Text style={styles.gcashTitle}>  Payment Completed</Text>
            <Text style={styles.gcashDetailValue}>
              This request has already been paid. Thank you!
            </Text>
          </View>
        ) : (
          <>

            {/* Method grid */}
            <Text style={styles.paymentMethodTitle}>Choose Payment Method</Text>
            <View style={styles.paymentGrid}>
              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPaymentMethod('gcash')}
              >
                <Text style={styles.paymentMethodIcon}>💚</Text>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.paymentMethodName}>GCash</Text>
                  <Text style={styles.paymentMethodSub}>Pay online</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPaymentMethod('cash')}
              >
                <Text style={styles.paymentMethodIcon}>💵</Text>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.paymentMethodName}>Cash</Text>
                  <Text style={styles.paymentMethodSub}>Pay to driver</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* GCash section */}
            {activePaymentMethod === 'gcash' && (
              <View style={styles.gcashSection}>
                <Text style={styles.gcashTitle}>Pay with GCash</Text>

                <View style={styles.gcashDetails}>
                  <Text style={styles.gcashDetailLabel}>Send payment to:</Text>
                  <Text style={styles.gcashDetailValue}>
                    GCash Number: <Text style={styles.bold}>0917-XXX-XXXX</Text>
                  </Text>
                  <Text style={styles.gcashDetailValue}>
                    Account Name: <Text style={styles.bold}>Your Business Name</Text>
                  </Text>
                  <Image
                    source={require('../assets/images/2321600003.png')}
                    style={styles.gcashQr}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.inputLabel}>GCash Reference Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1234567890123"
                  value={gcashReference}
                  onChangeText={setGcashReference}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Upload Receipt / Screenshot</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickProofImage}>
                  <Text style={styles.uploadButtonText}>
                    {gcashProof ? '  Receipt selected' : 'Choose Image'}
                  </Text>
                </TouchableOpacity>

                {gcashProof && (
                  <Image
                    source={{ uri: gcashProof }}
                    style={styles.proofPreview}
                    resizeMode="cover"
                  />
                )}

                <TouchableOpacity
                  style={[styles.submitPaymentButton, submitting && { opacity: 0.5 }]}
                  onPress={submitGcashProof}
                  disabled={submitting}
                >
                  <Text style={styles.submitPaymentText}>
                    {submitting ? 'Submitting…' : 'Submit Proof of Payment'}
                  </Text>
                </TouchableOpacity>
                {/*NEW: Cancel button */}
                <TouchableOpacity
                  style={styles.cancelPaymentButton}
                  onPress={cancelPayment}
                  disabled={submitting}
                >
                  <Text style={styles.cancelPaymentText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        {/* Status message */}
        {!!paymentMessage && (
          <Text style={styles.paymentMessage}>{paymentMessage}</Text>
        )}
      </ScrollView>
    </View>
  );
  //cancel payment method
  const cancelPayment = () => {
    setActivePaymentMethod(null);
    setGcashReference('');
    setGcashProof(null);
    setPaymentMessage('');
  };

  // ===== MAIN RENDER — UPDATED =====
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0046a8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0046a8" />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navbarContent}>
          <View style={styles.brand}>
            <Text style={styles.brandIcon}>😭</Text>
            <Text style={styles.brandText}>
              Good<Text style={styles.brandSpan}>Wrench</Text>
            </Text>
          </View>

        </View>
      </View>

      {/* Profile Header — only on dashboard */}
      {activeTab === 'dashboard' && renderProfileHeader()}

      {/* Main Panel — full width, scrollable content per tab */}
      <View style={styles.mainPanel}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'recent' && renderRecentActivity()}
        {activeTab === 'receipts' && renderReceipts()}
        {activeTab === 'payment' && renderPayment()}
        {activeTab === 'editaddress' && renderEditAddress()}
      </View>

      {/* Bottom Tab Bar */}
      {renderBottomTabBar()}


    </View>
  );
};



export default DashboardScreen;