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
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LeafletMap from '../components/leafletMap';
import styles from '../styles/DashboardScreen.styles';
import Geolocation from '@react-native-community/geolocation';

import API_BASE_URL from '../config';

// Import icons (you can use react-native-vector-icons or emojis)
// For now using emojis, replace with your actual icons

const DashboardScreen = ({ navigation }) => {
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
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('₱0.00');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [gcashReference, setGcashReference] = useState('');
  const [gcashProof, setGcashProof] = useState(null);
  const [showGcashForm, setShowGcashForm] = useState(false);

  // Edit address state
  const [editAddressModal, setEditAddressModal] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pin modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinName, setPinName] = useState('');
  const [savedPins, setSavedPins] = useState([]);

  // Polling
  const pollingInterval = useRef(null);

  // ===== LIFECYCLE =====
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
    if (activeTab === 'dashboard' && latestRequest) {
      loadUserMap();
      startPolling();
    }
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [activeTab, latestRequest]);

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
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.replace('Login');
          }
        }
      ]
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
      if (!latestRequest) return;

      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/requests/latest`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          const request = Array.isArray(data) ? data[0] : data;
          if (request?.driver_lat && request?.driver_lng) {
            const dLat = parseFloat(request.driver_lat);
            const dLng = parseFloat(request.driver_lng);
            setDriverLocation({ latitude: dLat, longitude: dLng });
            if (customerLocation) {
              await drawRoute(dLat, dLng, customerLocation.latitude, customerLocation.longitude);
            }
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
  const openPaymentModal = () => {
    if (!latestRequest) {
      Alert.alert('No Request', 'No active request for payment');
      return;
    }
    setPaymentAmount(`₱${Number(latestRequest.amount || 0).toFixed(2)}`);
    setPaymentMessage('');
    setShowGcashForm(false);
    setPaymentModalVisible(true);
  };

  const processPaymentMethod = async (method) => {
    if (!latestRequest) return;

    const token = await AsyncStorage.getItem('token');

    try {
      if (method === 'gcash') {
        const response = await fetch(`${API_BASE_URL}/payments/gcash/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ request_id: latestRequest.request_id })
        });

        const data = await response.json();

        if (response.ok) {
          setShowGcashForm(true);
          setPaymentMessage('Pay through GCash and upload your receipt');
        } else {
          setPaymentMessage(data.message || 'Failed to start payment');
        }
      } else if (method === 'cash') {
        setPaymentMessage(`Cash payment selected for Request #${latestRequest.request_id}`);
        Alert.alert('Cash Payment', 'Please pay the driver in cash');
      } else {
        setPaymentMessage(`${method} payment is not implemented yet`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentMessage('Payment failed. Please try again.');
    }
  };

  const submitGcashProof = async () => {
    if (!gcashReference || !gcashProof) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    formData.append('request_id', latestRequest.request_id);
    formData.append('reference_number', gcashReference);
    formData.append('proof_image', {
      uri: gcashProof,
      type: 'image/jpeg',
      name: 'proof.jpg'
    });

    try {
      const response = await fetch(`${API_BASE_URL}/payments/gcash/submit-proof`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      setPaymentMessage(data.message || 'Proof submitted');
      if (data.success) {
        setShowGcashForm(false);
        Alert.alert('Success', 'Payment proof submitted!');
        setPaymentModalVisible(false);
      }
    } catch (error) {
      console.error('Proof submission error:', error);
      setPaymentMessage('Failed to submit proof');
    }
  };

  // ===== EDIT ADDRESS =====
  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}, Philippines&format=json&addressdetails=1&limit=5&countrycodes=ph`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        setAddressSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
    }
  };

  const selectAddress = (result) => {
    setEditAddress(result.display_name);
    setEditLat(result.lat);
    setEditLng(result.lon);
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const saveAddress = async () => {
    if (!editAddress || !editLat || !editLng) {
      Alert.alert('Error', 'Please select a valid address');
      return;
    }

    const token = await AsyncStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/requests/${latestRequest?.request_id}/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          address: editAddress,
          location_lat: parseFloat(editLat),
          location_lng: parseFloat(editLng)
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Address updated successfully!');
        setEditAddressModal(false);
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

  // ===== RENDER FUNCTIONS =====
  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarInitials}>
            {user ? getInitials(user.name) : 'U'}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <Text style={styles.userType}>⭐ Customer</Text>
      </View>

      <ScrollView style={styles.navList}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>📊 Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'request' && styles.navItemActive]}
          onPress={() => navigation.navigate('RequestForm')}
        >
          <Text style={[styles.navText, activeTab === 'request' && styles.navTextActive]}>🆕 New Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'payment' && styles.navItemActive]}
          onPress={() => {
            setActiveTab('payment');
            openPaymentModal();
          }}
        >
          <Text style={[styles.navText, activeTab === 'payment' && styles.navTextActive]}>💳 Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'editaddress' && styles.navItemActive]}
          onPress={() => {
            setActiveTab('editaddress');
            if (latestRequest) {
              setEditAddress(latestRequest.address || '');
              setEditLat(String(latestRequest.location_lat || ''));
              setEditLng(String(latestRequest.location_lng || ''));
              setEditAddressModal(true);
            } else {
              Alert.alert('No Request', 'No active request to edit');
            }
          }}
        >
          <Text style={[styles.navText, activeTab === 'editaddress' && styles.navTextActive]}>📍 Edit Address</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'receipts' && styles.navItemActive]}
          onPress={() => setActiveTab('receipts')}
        >
          <Text style={[styles.navText, activeTab === 'receipts' && styles.navTextActive]}>🧾 Receipts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'recent' && styles.navItemActive]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.navText, activeTab === 'recent' && styles.navTextActive]}>📋 Recent Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ===== RENDER TABS =====
  const renderDashboard = () => (
    <View style={styles.tabContent}>
      {/* Request Header */}
      <View style={styles.requestHeader}>
        <View style={styles.requestBadge}>
          <Text style={styles.trackingNumber}>
            #{latestRequest?.request_id || 'N/A'}
          </Text>
          <View style={[styles.statusChip,
          { backgroundColor: latestRequest?.status === 'completed' ? '#28a745' : '#ffc107' }
          ]}>
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

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadDashboardData()}
        >
          <Text style={styles.refreshText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Live Tracking</Text>
        </View>
        <View style={styles.mapContainer}>
          <LeafletMap
            customerLocation={customerLocation}
            driverLocation={driverLocation}
            routeCoordinates={routeCoordinates}
            address={latestRequest?.address}
          />
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

  const renderReceipts = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>My Receipts</Text>
      {receipts.length === 0 ? (
        <Text style={styles.emptyText}>No receipts found</Text>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => String(item.payment_id)}
          renderItem={({ item }) => (
            <View style={styles.receiptItem}>
              <Text style={styles.receiptId}>#{item.receipt_number || 'N/A'}</Text>
              <Text style={styles.receiptAmount}>₱{Number(item.amount || 0).toFixed(2)}</Text>
              <View style={[styles.receiptStatus,
              { backgroundColor: item.status === 'completed' ? '#28a745' : '#ffc107' }
              ]}>
                <Text style={styles.receiptStatusText}>{item.status || 'Pending'}</Text>
              </View>
              {item.status === 'completed' && (
                <TouchableOpacity style={styles.downloadButton}>
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );

  // ===== MAIN RENDER =====
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
            <Text style={styles.brandIcon}>🚛</Text>
            <Text style={styles.brandText}>Goodwrench</Text>
          </View>
          <View style={styles.navbarRight}>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
            <Text style={styles.clockText}>{currentTime}</Text>
          </View>
        </View>
      </View>

      <View style={styles.dashboardWrapper}>
        {/* Sidebar - Hidden on small screens, use hamburger menu */}
        {renderSidebar()}

        {/* Main Panel */}
        <View style={styles.mainPanel}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'recent' && renderRecentActivity()}
          {activeTab === 'receipts' && renderReceipts()}
        </View>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Payment</Text>
            <Text style={styles.paymentRequestId}>Request #{latestRequest?.request_id}</Text>
            <Text style={styles.paymentAmount}>Amount Due: {paymentAmount}</Text>

            <Text style={styles.paymentMethodTitle}>Choose Payment Method</Text>
            <View style={styles.paymentGrid}>
              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPaymentMethod('gcash')}
              >
                <Text style={styles.paymentMethodIcon}>💚</Text>
                <Text style={styles.paymentMethodName}>GCash</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPaymentMethod('paymaya')}
              >
                <Text style={styles.paymentMethodIcon}>💳</Text>
                <Text style={styles.paymentMethodName}>PayMaya</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPaymentMethod('cash')}
              >
                <Text style={styles.paymentMethodIcon}>💵</Text>
                <Text style={styles.paymentMethodName}>Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPaymentMethod('card')}
              >
                <Text style={styles.paymentMethodIcon}>💳</Text>
                <Text style={styles.paymentMethodName}>Card</Text>
              </TouchableOpacity>
            </View>

            {showGcashForm && (
              <View style={styles.gcashForm}>
                <Text style={styles.gcashTitle}>Pay with GCash</Text>
                <TextInput
                  style={styles.input}
                  placeholder="GCash Reference Number"
                  value={gcashReference}
                  onChangeText={setGcashReference}
                />
                <TouchableOpacity style={styles.uploadButton}>
                  <Text style={styles.uploadButtonText}>Upload Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitPaymentButton}
                  onPress={submitGcashProof}
                >
                  <Text style={styles.submitPaymentText}>Submit Proof</Text>
                </TouchableOpacity>
              </View>
            )}

            {paymentMessage && (
              <Text style={styles.paymentMessage}>{paymentMessage}</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Address Modal */}
      <Modal
        visible={editAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setEditAddressModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Edit Address</Text>

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

            <View style={styles.selectedLocation}>
              <Text style={styles.selectedText}>
                {editLat && editLng ? '📍 Location selected' : 'No location selected'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAddress}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ===== STYLES =====


export default DashboardScreen;