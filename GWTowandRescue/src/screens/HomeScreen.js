import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  StatusBar,
  Linking,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import styles from '../styles/HomeScreen.styles';
import { apiFetch, getToken } from '../services/api';


const HomeScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showHowModal, setShowHowModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceType, setServiceType] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    serviceType: '',
    vehicleId: '',
    latitude: '',
    longitude: '',
    address: ''
  });

  useEffect(() => {
    checkAuth();
    loadVehicles();
  }, []);

  const checkAuth = async () => {
    const token = await getToken();
    if (token) {
      try {
        const userData = await apiFetch('/users/profile');
        setUser(userData);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoggedIn(false);
      }
    }
  };

  const loadVehicles = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await apiFetch('/vehicles');
      setVehicles(data.vehicles || []);
      if (data.vehicles && data.vehicles.length > 0) {
        setSelectedVehicle(data.vehicles[0].vehicle_id);
      }
    } catch (error) {
      console.error('Load vehicles error:', error);
    }
  };

  const openPhone = () => {
    Linking.openURL('tel:+639107515937');
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
            setIsLoggedIn(false);
            setUser(null);
          }
        }
      ]
    );
  };

  // Get current location (replaces web getCurrentLocation)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      Alert.alert('Error', 'Geolocation not supported');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData({
          ...formData,
          latitude: latitude.toString(),
          longitude: longitude.toString()
        });
        await reverseGeocode(latitude, longitude);
        setLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Error', 'Could not get location. Please enter address manually.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Reverse geocode (replaces web reverseGeocode)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        setFormData({
          ...formData,
          address: data.display_name
        });
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  // Search address (replaces web searchAddressLocations)
  const searchAddressLocations = async (query) => {
    if (!query || query.length < 3) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}, Philippines&format=json&addressdetails=1&limit=5&countrycodes=ph`
      );
      const results = await response.json();
      return results;
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  };

  // Handle request submit (replaces web handleRequestSubmit)
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

    if (!formData.vehicleId) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    if (!formData.latitude && !formData.longitude && !formData.address) {
      Alert.alert('Error', 'Please share your location or enter an address');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        service_type_id: formData.serviceType,
        vehicle_id: formData.vehicleId,
        location_lat: formData.latitude ? parseFloat(formData.latitude) : null,
        location_lng: formData.longitude ? parseFloat(formData.longitude) : null,
        address: formData.address || null
      };

      const response = await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (response && response.request) {
        Alert.alert(
          '✅ Request Submitted!',
          `Request ID: ${response.request.id}\nEstimated arrival: 25-40 minutes`,
          [{ text: 'OK', onPress: () => setShowEmergencyModal(false) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render modal (replaces web modal)
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
          <Text style={styles.modalTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <Text style={styles.stepText}>1. Request service via call or online form</Text>
            <Text style={styles.stepText}>2. State concern about your vehicle</Text>
            <Text style={styles.stepText}>3. Setup your location anywhere in Koronadal</Text>
            <Text style={styles.stepText}>4. The Management will assist the problem</Text>
            <Text style={styles.stepText}>5. A Recuer will navigate your location</Text>
            <Text style={styles.stepText}>6. Upon Arriving the recuer will assist</Text>
            <Text style={styles.stepText}>7. Digital confirmation & guaranteed invoice</Text>
          </View>
          <Text style={styles.modalFooter}>We are pleased that you choose us</Text>
        </View>
      </View>
    </Modal>
  );

  // Render emergency modal (replaces web emergency form)
  const renderEmergencyModal = () => (
    <Modal
      visible={showEmergencyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmergencyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.emergencyModal]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowEmergencyModal(false)}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Request Roadside Assistance</Text>

          <ScrollView>
            {/* Service Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Service Needed:</Text>
              <View style={styles.pickerContainer}>
                {['towing', 'flat_tire', 'jump_start', 'fuel', 'lockout'].map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.serviceOption,
                      formData.serviceType === service && styles.serviceOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, serviceType: service})}
                  >
                    <Text style={[
                      styles.serviceOptionText,
                      formData.serviceType === service && styles.serviceOptionTextSelected
                    ]}>
                      {service.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Vehicle:</Text>
              {vehicles.length === 0 ? (
                <Text style={styles.noVehiclesText}>No saved vehicles. Please add one in profile.</Text>
              ) : (
                vehicles.map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.vehicle_id}
                    style={[
                      styles.vehicleOption,
                      selectedVehicle === vehicle.vehicle_id && styles.vehicleOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedVehicle(vehicle.vehicle_id);
                      setFormData({...formData, vehicleId: vehicle.vehicle_id});
                    }}
                  >
                    <Text style={styles.vehicleText}>
                      {vehicle.make} {vehicle.model} - {vehicle.license_plate}
                      {vehicle.is_default && ' (Default)'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Location:</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={loading}
              >
                <Text style={styles.locationButtonText}>
                  {loading ? 'Getting location...' : '📍 Use Current Location'}
                </Text>
              </TouchableOpacity>

              {formData.latitude && (
                <Text style={styles.locationStatus}>📍 Location captured</Text>
              )}

              <TextInput
                style={styles.addressInput}
                placeholder="Or enter your address manually"
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  setFormData({...formData, address: text});
                }}
                multiline
                numberOfLines={2}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRequestSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'Request Assistance'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0047ab" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.phoneRow} onPress={openPhone}>
          <Text style={styles.phoneText}>📞 +63 9107515937</Text>
        </TouchableOpacity>
        <Text style={styles.hoursText}>Mon–Fri: 9:00 AM – 8:00 PM</Text>
      </View>

      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.brand}>GoodWrench</Text>
        <View style={styles.navLinks}>
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
            onPress={() => {
              if (!isLoggedIn) {
                Alert.alert(
                  'Login Required',
                  'Please login to request assistance',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => navigation.navigate('Login') }
                  ]
                );
              } else {
                setShowEmergencyModal(true);
              }
            }}
          >
            <Text style={styles.helpButtonText}>🚑 Request help</Text>
          </TouchableOpacity>
          {isLoggedIn && (
            <TouchableOpacity onPress={handleLogout}>
              <Text style={[styles.navLink, styles.logoutLink]}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={checkAuth} />
        }
      >
        <ImageBackground
          source={{ uri: 'https://i.imgur.com/placeholder-image.jpg' }}
          style={styles.heroBg}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.tagline}>+ PANG BARYO2X LANG KAG PUROK ANAY</Text>
            <Text style={styles.heroMain}>HINDI LANG PANG RESCUE</Text>
            <Text style={styles.heroSub}>AT PANG HAWLING PA</Text>
            <Text style={styles.heroVerse}>
              Colossians 3:23 — "Whatever you do, work at it with all your heart,
              as working for the Lord, not for human masters"..
            </Text>

            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.bulletText}>Own fleet + 24/7 dispatching center</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.bulletText}>Full-service roadside assistance</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.checkIcon}>✅</Text>
                <Text style={styles.bulletText}>Rates lower than competitors — price match guarantee</Text>
              </View>
            </View>

            <View style={styles.authRow}>
              {!isLoggedIn ? (
                <>
                  <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => navigation.navigate('Login')}
                  >
                    <Text style={styles.loginText}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={styles.registerText}>Register</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.welcomeText}>Welcome, {user?.name}!</Text>
              )}
            </View>
          </View>
        </ImageBackground>

        <View style={styles.featureSection}>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🚛</Text>
            <Text style={styles.featureTitle}>Own truck fleet & storage</Text>
            <Text style={styles.featureDesc}>100+ modern tractors & tow trucks</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <Text style={styles.featureTitle}>Full cargo & vehicle insurance</Text>
            <Text style={styles.featureDesc}>Up to $2M liability coverage</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureTitle}>Prices lower than competitors</Text>
            <Text style={styles.featureDesc}>Direct fleet → savings for you</Text>
          </View>
        </View>
      </ScrollView>

      {renderHowItWorksModal()}
      {renderEmergencyModal()}
    </View>
  );
};

export default HomeScreen;