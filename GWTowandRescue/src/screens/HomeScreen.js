// screens/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Linking,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Geolocation from '@react-native-community/geolocation';
import { Dropdown } from 'react-native-element-dropdown';
import styles from '../styles/HomeScreen.styles';

import API_BASE_URL from '../config';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Auth state
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Modal states
  const [showHowModal, setShowHowModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vehicles
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Location
  const [locationStatus, setLocationStatus] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    serviceType: '',
    vehicleId: '',
    latitude: null,
    longitude: null,
    address: ''
  });

  // Submission result
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState(null);

  // Refs
  const searchTimer = useRef(null);
  const addressSearchController = useRef(null);

  // Service types
  const towIcon = require('../assets/images/tow (1).png');
  const canisterIcon = require('../assets/images/canister (1).png');
  const carBatteryIcon = require('../assets/images/car-battery (1).png');
  const flatTireIcon = require('../assets/images/flat-tire (1).png');

  const serviceTypes = [
    { label: 'Select Service', value: '' },
    { label: 'Towing Service', value: '1', icon: towIcon },
    { label: 'Flat Tire Change', value: '2', icon: flatTireIcon },
    { label: 'Jump Start', value: '3', icon: carBatteryIcon },
    { label: 'Fuel Delivery', value: '4', icon: canisterIcon },
    { label: 'Lockout Service', value: '5' }
  ];
  const services = [
    {
      id: '1',
      icon: towIcon,
      title: 'Towing',
      description: 'Towing Vehicle service',
      price: '1000'
    },
    {
      id: '3',
      icon: carBatteryIcon,
      title: 'Jump start',
      description: 'Replace and jump start battery service',
      price: '1000'
    },
    {
      id: '2',
      icon: flatTireIcon,
      title: 'Flat tire change',
      description: 'Replace Tire/Alternative tire repair',
      price: '1000'
    },
    {
      id: '4',
      icon: canisterIcon,
      title: 'Fuel delivery',
      description: 'Out of gas? We bring diesel or gasoline directly to you',
      price: '1000 + '
    }
  ];

  // ============ LIFECYCLE ============

  useEffect(() => {
    checkAuth();
    loadVehicles();
    restoreDraft();

    // Handle service param from navigation
    if (route.params?.service) {
      setFormData(prev => ({ ...prev, serviceType: route.params.service }));
    }
  }, []);

  // ============ API FUNCTIONS ============

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const apiFetch = async (endpoint, options = {}) => {
    const token = await getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'API request failed');
    }

    const text = await response.text();
    if (!text.trim()) return [];
    return JSON.parse(text);
  };

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        const userData = await apiFetch('/users/profile');
        setUser(userData);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  const loadVehicles = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      setLoadingVehicles(true);
      const data = await apiFetch('/vehicles');
      const vehicleList = data.vehicles || [];
      setVehicles(vehicleList);

      // Auto-select default vehicle
      if (vehicleList.length > 0) {
        const defaultVehicle = vehicleList.find(v => v.is_default) || vehicleList[0];
        setFormData(prev => ({
          ...prev,
          vehicleId: String(defaultVehicle.vehicle_id)
        }));
      }
    } catch (error) {
      console.error('Load vehicles error:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const logoutInProgress = useRef(false);
  const handleLogout = () => {
    if (logoutInProgress.current) return;

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            if (logoutInProgress.current) return;

            logoutInProgress.current = true;

            try {
              await AsyncStorage.multiRemove([
                'token',
                'role',
                'user',
              ]);


              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'Login',
                    params: {
                      logoutMessage: ' Logout successful!',
                    },
                  },
                ],
              });
            } catch (error) {
              console.error('Logout error:', error);
              logoutInProgress.current = false;
            }
          },
        },
      ],
      {
        cancelable: true,
      }
    );
  };

  // ============ DRAFT MANAGEMENT ============

  const saveDraft = async () => {
    try {
      const draft = {
        serviceType: formData.serviceType,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address
      };
      await AsyncStorage.setItem('draftRequest', JSON.stringify(draft));
    } catch (error) {
      console.error('Save draft error:', error);
    }
  };

  const restoreDraft = async () => {
    try {
      const raw = await AsyncStorage.getItem('draftRequest');
      if (!raw) return;

      const draft = JSON.parse(raw);
      setFormData(prev => ({
        ...prev,
        serviceType: draft.serviceType || prev.serviceType,
        latitude: draft.latitude || prev.latitude,
        longitude: draft.longitude || prev.longitude,
        address: draft.address || prev.address
      }));

      await AsyncStorage.removeItem('draftRequest');
    } catch (error) {
      console.error('Restore draft error:', error);
    }
  };

  // ============ LOCATION FUNCTIONS ============

  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationStatus('Getting your location...');

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));
        setLocationStatus('📍 Location captured — looking up address...');

        const address = await reverseGeocode(latitude, longitude);
        if (address) {
          setFormData(prev => ({ ...prev, address }));
          setLocationStatus('📍 Location captured');
        } else {
          setLocationStatus('📍 Location captured (address lookup unavailable)');
        }

        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('Could not get your location. Please enter your address manually.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const reverseGeocode = async (latitude, longitude) => {
    const url =
      'https://goodwrench-towing-rescue.onrender.com/api/geocode/reverse' +
      `?lat=${encodeURIComponent(latitude)}` +
      `&lng=${encodeURIComponent(longitude)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Reverse geocoding failed: ${response.status} ${responseText.substring(0, 200)}`
      );
    }

    const data = JSON.parse(responseText);
    return data.address || null;
  };

  const searchAddressLocations = async (query) => {
    if (!query || query.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (addressSearchController.current) {
      addressSearchController.current.abort();
    }

    addressSearchController.current = new AbortController();
    setIsSearchingAddress(true);

    try {
      const encodedQuery = encodeURIComponent(`${query}, Philippines`);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=5&countrycodes=ph`;

      const response = await fetch(url, {
        signal: addressSearchController.current.signal
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setAddressSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Address search error:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddressResult = (result) => {
    setFormData(prev => ({
      ...prev,
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon)
    }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setLocationStatus('📍 Location selected');
  };

  const handleAddressChange = (text) => {
    setFormData(prev => ({ ...prev, address: text }));
    saveDraft();

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      searchAddressLocations(text);
    }, 1000);
  };

  // ============ REQUEST SUBMISSION ============

  const handleRequestSubmit = async () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to request assistance',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (!formData.serviceType) {
      Alert.alert('Error', 'Please select a service type');
      return;
    }

    if (!formData.vehicleId) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    if (!formData.latitude && !formData.longitude && !formData.address.trim()) {
      Alert.alert('Error', 'Please share your location or enter an address');
      return;
    }

    setSubmitting(true);

    try {
      const requestData = {
        service_type_id: parseInt(formData.serviceType),
        vehicle_id: parseInt(formData.vehicleId),
        location_lat: formData.latitude ? parseFloat(formData.latitude) : null,
        location_lng: formData.longitude ? parseFloat(formData.longitude) : null,
        address: formData.address.trim() || null
      };

      const response = await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (response && response.request) {
        setRequestId(response.request.id);
        setSubmitted(true);
        await AsyncStorage.removeItem('draftRequest');

        Alert.alert(
          ' Request Submitted!',
          `Request ID: ${response.request.id}\nEstimated arrival: 25-40 minutes\n\nYou can track your request in the dashboard.`,
          [
            {
              text: 'View Dashboard',
              onPress: () => {
                setShowEmergencyModal(false);
                navigation.navigate('Dashboard');
              }
            },
            {
              text: 'OK',
              onPress: () => setShowEmergencyModal(false)
            }
          ]
        );
      } else {
        console.log('this debug log from response handlerequestsubmit');
      }
    } catch (error) {
      console.error('Request submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceType: '',
      vehicleId: vehicles.length > 0 ? String(vehicles.find(v => v.is_default)?.vehicle_id || vehicles[0]?.vehicle_id || '') : '',
      latitude: null,
      longitude: null,
      address: ''
    });
    setLocationStatus('');
    setSubmitted(false);
    setRequestId(null);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    AsyncStorage.removeItem('draftRequest');
  };

  const openEmergencyModal = (serviceId = '') => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to request assistance',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    resetForm();
    if (serviceId) {
      setFormData(prev => ({ ...prev, serviceType: serviceId }));
    }
    setShowEmergencyModal(true);
  };

  // ============ RENDER HELPERS ============

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => Linking.openURL('tel:+639107515937')}>
        <Text style={styles.topBarText}>📞 +63 9107515937</Text>
      </TouchableOpacity>
      <Text style={styles.topBarText}>🕒 Mon-Fri: 9:00 AM – 8:00 PM</Text>
    </View>
  );

  const renderNavbar = () => (
    <View style={styles.navbar}>
      <Text style={styles.brand}>GoodWrench</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navLinks}
      >
        <TouchableOpacity onPress={() => navigation.navigate('About')}>
          <Text style={styles.navLink}>About</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Services')}>
          <Text style={styles.navLink}>Services</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Fleet')}>
          <Text style={styles.navLink}>Fleet</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Reviews')}>
          <Text style={styles.navLink}>Reviews</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Contacts')}>
          <Text style={styles.navLink}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHowModal(true)}>
          <Text style={styles.navLink}>How it works</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => openEmergencyModal()}
        >
          <Text style={styles.helpButtonText}>🚑 Request help</Text>
        </TouchableOpacity>
        {isLoggedIn && (
          <TouchableOpacity onPress={handleLogout}>
            <Text style={[styles.navLink, styles.logoutLink]}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderHero = () => (
    <View style={styles.heroSection}>
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>✦ensure quality service</Text>
      </View>

      <Text style={styles.heroTitle}>
        WE ACCEPT HOME SERVICES{'\n'}
        <Text style={styles.heroTitleAccent}>LIKE TOWING ADN ROADSIDE ASSISTANCE</Text>
      </Text>

      <Text style={styles.heroDescription}>
        Colossians 3:23 – "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."
      </Text>

      <View style={styles.checklist}>
        <View style={styles.checklistItem}>
          <Text style={styles.checkIcon}>✅</Text>
          <Text style={styles.checkText}>Trouble Shoot Vehicle problem</Text>
        </View>
        <View style={styles.checklistItem}>
          <Text style={styles.checkIcon}>✅</Text>
          <Text style={styles.checkText}>Underchasis specialist</Text>
        </View>
        <View style={styles.checklistItem}>
          <Text style={styles.checkIcon}>✅</Text>
          <Text style={styles.checkText}>Transmission Speacialist</Text>
        </View>
      </View>

      {!isLoggedIn ? (
        <View style={styles.authButtons}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.welcomeText}>Welcome, {user?.name}!</Text>
      )}
    </View>
  );


const renderServices = () => (
  <View style={styles.servicesSection}>
    <Text style={styles.sectionTitle}>Our towing & roadside services</Text>
    <Text style={styles.sectionSubtitle}>
      Instant assistance, transparent pricing, professional equipment
    </Text>

    <View style={styles.servicesGrid}>
      {services.map((service) => (
        <View key={service.id} style={styles.serviceCard}>
          <Image source={service.icon} style={styles.serviceIcon} />
          <Text style={styles.serviceTitle}>{service.title}</Text>
          <Text style={styles.serviceDescription}>{service.description}</Text>
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>₱{service.price}</Text>
          </View>
          <TouchableOpacity
            style={styles.serviceButton}
            onPress={() => openEmergencyModal(service.id)}
          >
            <Text style={styles.serviceButtonText}>Request now →</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  </View>
);
  // ============ MODALS ============

  const renderHowItWorksModal = () => (
    <Modal
      visible={showHowModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowHowModal(false)}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Concepts</Text>

          <ScrollView style={styles.stepsContainer}>
            <Text style={styles.stepText}>1. You request service via call or online form.</Text>
            <Text style={styles.stepText}>2. State concern about your vehicle.</Text>
            <Text style={styles.stepText}>3. Setup your location anywhere in Koronadal or near Barangay.</Text>
            <Text style={styles.stepText}>4. The Management will assist the problem.</Text>
            <Text style={styles.stepText}>5. A Rescuer will navigate your location.</Text>
            <Text style={styles.stepText}>6. Upon arriving, the rescuer will assist the situation of the vehicle.</Text>
            <Text style={styles.stepText}>7. Digital confirmation & guaranteed invoice.</Text>
          </ScrollView>

          <Text style={styles.modalFooter}>We are pleased that you choose us</Text>
        </View>
      </View>
    </Modal>
  );

  const renderEmergencyModal = () => (
    <Modal
      visible={showEmergencyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmergencyModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, styles.emergencyModal]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowEmergencyModal(false);
              resetForm();
            }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Request Roadside Assistance</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Service Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Service Needed:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.serviceType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                  enabled={!submitting && !submitted}
                  style={styles.picker}
                >
                  {serviceTypes.map((type) => (
                    <Picker.Item
                      key={type.value}
                      label={type.label}
                      value={type.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Vehicle Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle:</Text>
              {loadingVehicles ? (
                <ActivityIndicator size="small" color="#0046a8" />
              ) : vehicles.length === 0 ? (
                <View style={styles.noVehiclesContainer}>
                  <Text style={styles.noVehiclesText}>
                    You don't have any saved vehicles yet.
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setShowEmergencyModal(false);
                    navigation.navigate('MyVehicles');
                  }}>
                    <Text style={styles.linkText}>Add one here</Text>
                  </TouchableOpacity>
                  <Text style={styles.noVehiclesText}> before requesting assistance.</Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.vehicleId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
                    enabled={!submitting && !submitted}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a vehicle" value="" />
                    {vehicles.map((vehicle) => (
                      <Picker.Item
                        key={vehicle.vehicle_id}
                        label={`${vehicle.make} ${vehicle.model} — ${vehicle.license_plate}${vehicle.is_default ? ' (Default)' : ''}`}
                        value={String(vehicle.vehicle_id)}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Location:</Text>

              <TouchableOpacity
                style={[styles.locationButton, gettingLocation && styles.locationButtonDisabled]}
                onPress={getCurrentLocation}
                disabled={gettingLocation || submitting || submitted}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
                )}
              </TouchableOpacity>

              {locationStatus ? (
                <Text style={[
                  styles.locationStatus,
                  locationStatus.includes('📍') ? styles.successText : styles.errorText
                ]}>
                  {locationStatus}
                </Text>
              ) : null}

              {/* Manual Address */}
              <View style={styles.manualAddress}>
                <Text style={styles.subLabel}>Or Enter Address:</Text>
                <View style={styles.addressSearchWrapper}>
                  <TextInput
                    style={[styles.addressInput, styles.textArea]}
                    placeholder="Search street, barangay, city, province..."
                    value={formData.address}
                    onChangeText={handleAddressChange}
                    multiline
                    numberOfLines={2}
                    editable={!submitting && !submitted}
                  />

                  {isSearchingAddress && (
                    <View style={styles.searchingIndicator}>
                      <ActivityIndicator size="small" color="#0046a8" />
                      <Text style={styles.searchingText}>Searching...</Text>
                    </View>
                  )}

                  {showSuggestions && addressSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView
                        style={styles.suggestionsScroll}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {addressSuggestions.map((result, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.suggestionItem}
                            onPress={() => selectAddressResult(result)}
                          >
                            <Text style={styles.suggestionMain}>
                              📍 {result.display_name.split(',')[0]}
                            </Text>
                            <Text style={styles.suggestionDetail}>
                              {result.display_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Submit Button */}
            {!submitted ? (
              <TouchableOpacity
                style={[styles.submitButton, (submitting || vehicles.length === 0) && styles.submitButtonDisabled]}
                onPress={handleRequestSubmit}
                disabled={submitting || vehicles.length === 0}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Request Assistance</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmationBox}>
                <Text style={styles.confirmationIcon}>✅</Text>
                <Text style={styles.confirmationTitle}>Request Submitted!</Text>
                <Text style={styles.confirmationText}>
                  Your request ID: <Text style={styles.confirmationStrong}>{requestId}</Text>
                </Text>
                <Text style={styles.confirmationText}>
                  Estimated arrival time: <Text style={styles.confirmationStrong}>25-40 minutes</Text>
                </Text>
                <Text style={styles.confirmationText}>
                  You can track your request in the dashboard.
                </Text>
                <TouchableOpacity
                  style={styles.dashboardButton}
                  onPress={() => {
                    setShowEmergencyModal(false);
                    resetForm();
                    navigation.navigate('Dashboard');
                  }}
                >
                  <Text style={styles.dashboardButtonText}>View Dashboard</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ============ MAIN RENDER ============

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0046a8" />

      {renderTopBar()}
      {renderNavbar()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await checkAuth();
              await loadVehicles();
              setRefreshing(false);
            }}
            colors={['#0046a8']}
            tintColor="#0046a8"
          />
        }
      >
        {renderHero()}

        {renderServices()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            2026 Capstone project Design and Development of Web and Android-based Towing and RoadSide assistance.
          </Text>

          <Text style={[styles.footerText, styles.footerEmergency]}>
            📞Emergency: +63 9107515937 or register
          </Text>
          <Text style={styles.footerText}>
            ✉️ https://goodwrench-towing-rescue.onrender.com
          </Text>
        </View>
      </ScrollView>

      {renderHowItWorksModal()}
      {renderEmergencyModal()}
    </View>
  );
};

export default HomeScreen;