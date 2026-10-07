// screens/RequestFormScreen.js
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Modal,
    PermissionsAndroid,
    Linking
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/RequestFormScreen.style';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';



const RequestFormScreen = ({ navigation, route }) => {
    // Get service from URL params (similar to setServiceFromURL)
    const serviceIdFromRoute = route?.params?.service || '';

    const [formData, setFormData] = useState({
        serviceType: serviceIdFromRoute || '',
        vehicleId: '',
        latitude: null,
        longitude: null,
        address: ''
    });

    const [vehicles, setVehicles] = useState([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationStatus, setLocationStatus] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [requestId, setRequestId] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showUnpaidModal, setShowUnpaidModal] = useState(false);
    const [unpaidRequest, setUnpaidRequest] = useState(null);

    const searchTimer = useRef(null);
    const addressSearchController = useRef(null);

    // Service types matching the web version
    const serviceTypes = [
        { label: 'Select Service', value: '' },
        { label: 'Towing Service', value: '1' },
        { label: 'Flat Tire Change', value: '2' },
        { label: 'Jump Start', value: '3' },
        { label: 'Fuel Delivery', value: '4' },

    ];

    // Load vehicles on mount
    useEffect(() => {
        checkAuthAndLoadVehicles();
        restoreDraft();

        return () => {
            clearTimeout(searchTimeout.current);
            addressSearchController.current?.abort();
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            checkUnpaidBalance();
            if (!isGuest) {
                loadVehicles();
            }
        }, [isGuest])
    );

    const checkAuthAndLoadVehicles = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setIsGuest(true);
                setShowGuestModal(true);
                return;
            }
            setIsGuest(false);
            await loadVehicles();
        } catch (error) {
            console.error('Auth check error:', error);
        }
    };
    // --- check for unpaid previous request ---
    const checkUnpaidBalance = async () => {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/requests/can-create`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (res.ok && data.canRequest === false) {
                setUnpaidRequest(data.request);
                setShowUnpaidModal(true);
            }
        } catch (err) {
            // Fail open — backend still blocks submit anyway
            console.error('Unpaid check failed:', err);
        }
    };

    const statusTextFor = (status) => ({
        none: 'no payment has been started',
        awaiting_payment: 'you have not chosen a payment method',
        awaiting_cash: 'you chose cash, please pay your driver',
        pending: 'your GCash proof is awaiting verification',
        failed: 'your GCash proof was rejected, please resubmit',
    }[status] || 'payment is not completed');


    const searchTimeout = useRef(null);

    const onAddressChange = (text) => {
        updateField('address', text);

        clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(() => {
            searchAddressLocations(text);
        }, 800);
    };


    const requestLocationPermission = async () => {
        if (Platform.OS === 'ios') {
            return true;
        }

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'Location permission',
                message: 'This app needs your location to fill in the address.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
    };


    const loadVehicles = async () => {
        try {
            setLoadingVehicles(true);
            const token = await AsyncStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                const vehicleList = data.vehicles || [];
                setVehicles(vehicleList);

                // Auto-select default vehicle
                const defaultVehicle = vehicleList.find(v => v.is_default);
                if (defaultVehicle) {
                    setFormData(prev => ({
                        ...prev,
                        vehicleId: String(defaultVehicle.vehicle_id)
                    }));
                }
            } else {
                Alert.alert('Error', data.error || 'Failed to load vehicles');
            }
        } catch (error) {
            console.error('loadVehicles error:', error);
            Alert.alert('Network Error', 'Cannot load your vehicles.');
        } finally {
            setLoadingVehicles(false);
        }
    };

    const restoreDraft = async () => {
        try {
            const draft = await AsyncStorage.getItem('draftRequest');
            if (draft) {
                const parsed = JSON.parse(draft);
                setFormData(prev => ({
                    ...prev,
                    serviceType: parsed.serviceType || prev.serviceType,
                    latitude: parsed.latitude || prev.latitude,
                    longitude: parsed.longitude || prev.longitude,
                    address: parsed.address || prev.address
                }));
                await AsyncStorage.removeItem('draftRequest');
            }
        } catch (error) {
            console.error('Restore draft error:', error);
        }
    };

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

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Save draft on any change
        saveDraft();
    };

    // Get current location (matches web version)



    const getCurrentLocation = async () => {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
            setLocationStatus(
                'Location permission was denied. Please enable it in Settings.'
            );
            return;
        }

        setGettingLocation(true);
        setLocationStatus('Getting your location...');

        Geolocation.getCurrentPosition(
            async position => {
                try {
                    const { latitude, longitude } = position.coords;

                    updateField('latitude', latitude);
                    updateField('longitude', longitude);

                    setLocationStatus(
                        '📍 Location captured — looking up address...'
                    );

                    const address = await reverseGeocode(latitude, longitude);

                    if (address) {
                        updateField('address', address);
                        setLocationStatus('📍 Location captured');
                    } else {
                        setLocationStatus(
                            '📍 Location captured, but address lookup failed.'
                        );
                    }
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                    setLocationStatus(
                        '📍 Location captured, but address lookup failed.'
                    );
                } finally {
                    setGettingLocation(false);
                }
            },
            error => {
                console.error('Location error:', {
                    code: error.code,
                    message: error.message,
                });

                if (error.code === 1) {
                    setLocationStatus(
                        'Location permission was denied. Please enable it in Settings.'
                    );
                    Alert.alert(
                        'Permission needed',
                        'Location permission was denied. Please enable it in Settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ]
                    );
                } else if (error.code === 2) {
                    setLocationStatus(
                        'Location is unavailable. Please enable GPS and try again.'
                    );
                    promptEnableLocation(
                        'Location services appear to be off. Please turn on Location to get your position.'
                    );
                } else if (error.code === 3) {
                    setLocationStatus(
                        'Location request timed out. Please try again.'
                    );
                } else {
                    setLocationStatus(
                        'Could not get your location. Please enter your address manually.'
                    );
                }

                setGettingLocation(false);
            },
            {
                enableHighAccuracy: false,
                timeout: 30000,
                maximumAge: 60000,
            }
        );
    };
    const promptEnableLocation = (message) => {
        Alert.alert(
            'Location is off',
            message || 'Please turn on Location to continue.',
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



    // Search address (forward geocode with suggestions)
    const searchAddressLocations = async (query) => {
        const text = query.trim();

        if (text.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (addressSearchController.current) {
            addressSearchController.current.abort();
        }

        addressSearchController.current = new AbortController();

        try {
            const url =
                'https://goodwrench-towing-rescue.onrender.com/api/geocode/search' +
                `?q=${encodeURIComponent(text)}`;

            const response = await fetch(url, {
                method: 'GET',
                signal: addressSearchController.current.signal,
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Address search failed: ${response.status} ${body}`);
            }

            const results = await response.json();

            setAddressSuggestions(results || []);
            setShowSuggestions((results || []).length > 0);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Address search error:', error);
            setAddressSuggestions([]);
            setShowSuggestions(false);
        }
    };


    // Select address from suggestion
    const selectAddressResult = (result) => {
        updateField('address', result.display_name);
        updateField('latitude', parseFloat(result.lat));
        updateField('longitude', parseFloat(result.lon));
        setAddressSuggestions([]);
        setShowSuggestions(false);
        setLocationStatus('📍 Location selected');
    };

    // Handle address text change with debounce
    const handleAddressChange = (text) => {
        updateField('address', text);

        // Clear previous timer
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }

        // Debounce search
        searchTimer.current = setTimeout(() => {
            searchAddressLocations(text);
        }, 1000);
    };

    const validateForm = () => {
        if (!formData.serviceType) {
            Alert.alert('Error', 'Please select a service type');
            return false;
        }

        if (!formData.vehicleId) {
            Alert.alert('Error', 'Please select a vehicle');
            return false;
        }

        if (!formData.latitude && !formData.longitude && !formData.address.trim()) {
            Alert.alert('Error', 'Please share your location or enter an address');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const token = await AsyncStorage.getItem('token');
        if (!token) {
            setIsGuest(true);
            setShowGuestModal(true);
            return;
        }

        setLoading(true);

        const requestData = {
            service_type_id: parseInt(formData.serviceType),
            vehicle_id: parseInt(formData.vehicleId),
            location_lat: formData.latitude ? parseFloat(formData.latitude) : null,
            location_lng: formData.longitude ? parseFloat(formData.longitude) : null,
            address: formData.address.trim() || null
        };

        try {
            const response = await fetch(`${API_BASE_URL}/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                setRequestId(data.request.id);
                setSubmitted(true);
                // Clear draft on successful submission
                await AsyncStorage.removeItem('draftRequest');

                Alert.alert(
                    'Request Submitted!',
                    `Your request ID: ${data.request.id}\nEstimated arrival time: 25-40 minutes\n\nYou can track your request in the dashboard.`,
                    [
                        {
                            text: 'View Dashboard',
                            onPress: () => navigation.replace('Dashboard')
                        },
                        {
                            text: 'OK',
                            style: 'cancel'
                        }
                    ]
                );
            } else if (response.status === 402 && data.code === 'UNPAID_REQUEST') {
                setUnpaidRequest(data.request);
                setShowUnpaidModal(true);
            } else {
                Alert.alert('Error', data.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Request submission error:', error);
            Alert.alert('Network Error', 'Cannot connect to server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            serviceType: '',
            vehicleId: '',
            latitude: null,
            longitude: null,
            address: ''
        });
        setLocationStatus('');
        setSubmitted(false);
        setAddressSuggestions([]);
        setShowSuggestions(false);
        AsyncStorage.removeItem('draftRequest');
    };

    const handleGuestLogin = () => {
        saveDraft();
        const returnTo = encodeURIComponent('RequestForm');
        navigation.navigate('Login', { returnTo });
        setShowGuestModal(false);
    };

    const handleGuestRegister = () => {
        saveDraft();
        const returnTo = encodeURIComponent('RequestForm');
        navigation.navigate('Register', { returnTo });
        setShowGuestModal(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#eaeef2" />

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Navigation Bar */}
                <View style={styles.navbar}>
                    <View style={styles.navContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon name="arrow-left" size={26} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.navbarTitle}>Request Assistance</Text>
                        <View style={{ width: 50 }} />
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    <Text style={styles.title}>Request Roadside Assistance</Text>

                    <View style={styles.formContainer}>
                        {/* Service Type */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Service Needed:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.serviceType}
                                    onValueChange={(value) => updateField('serviceType', value)}
                                    enabled={!loading && !submitted}
                                    style={styles.picker}
                                    dropdownIconColor="#080808"
                                    mode="dropdown"
                                >
                                    {serviceTypes.map((type) => (
                                        <Picker.Item
                                            key={type.value}
                                            label={type.label}
                                            value={type.value}
                                            color="#0a0a0a"
                                            style={{ color: '#f2f3f6' }}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        {/* Vehicle Selection */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Vehicle:</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.vehicleId}
                                    onValueChange={(value) => updateField('vehicleId', value)}
                                    enabled={!loading && !submitted && !isGuest && vehicles.length > 0}
                                    style={styles.picker}
                                    dropdownIconColor="#000000"
                                    mode="dropdown"
                                >
                                    <Picker.Item
                                        label={loadingVehicles ? "Loading your vehicles..." : "Select a vehicle"}
                                        value=""
                                        color="#000000"
                                        style={{ color: '#f1f2f6' }}
                                    />
                                    {vehicles.map((vehicle) => (
                                        <Picker.Item
                                            key={vehicle.vehicle_id}
                                            label={`${vehicle.make} ${vehicle.model} — ${vehicle.license_plate}${vehicle.is_default ? ' (Default)' : ''}`}
                                            value={String(vehicle.vehicle_id)}
                                            color="#111113"
                                            style={{ color: '#dde0e6' }}
                                        />
                                    ))}
                                </Picker>
                            </View>

                            {!loadingVehicles && !isGuest && (
    vehicles.length === 0 ? (
        <Text style={styles.noticeText}>
            You don't have any saved vehicles yet.{' '}
            <Text
                style={styles.linkText}
                onPress={() =>
                    navigation.navigate('MyVehicles', { openAddForm: true })
                }
            >
                Add one here
            </Text>
            {' '}before requesting assistance.
        </Text>
    ) : (
        <Text style={styles.noticeText}>
            Need to add another vehicle?{' '}
            <Text
                style={styles.linkText}
                onPress={() =>
                    navigation.navigate('MyVehicles', { openAddForm: true })
                }
            >
                Add it here
            </Text>
        </Text>
    )
)}

{isGuest && (
    <Text style={styles.noticeText}>
        You need an account to submit a request.{' '}
        <Text style={styles.linkText} onPress={handleGuestLogin}>
            Log in
        </Text>
        {' '}or{' '}
        <Text style={styles.linkText} onPress={handleGuestRegister}>
            Register
        </Text>
    </Text>
)}
                        </View>

                        {/* Location Section */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Your Location:</Text>

                            <TouchableOpacity
                                style={[styles.locationButton, gettingLocation && styles.locationButtonDisabled]}
                                onPress={getCurrentLocation}
                                disabled={gettingLocation || loading || submitted}
                            >
                                {gettingLocation ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.locationButtonText}>Use Current Location</Text>
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

                            {/* Manual Address with Suggestions */}
                            <View style={styles.manualAddress}>
                                <Text style={styles.subLabel}>Or Enter Address:</Text>
                                <View style={styles.addressSearchWrapper}>
                                    <TextInput
                                        style={[styles.textArea, styles.input]}
                                        placeholder="Search street, barangay, city, province..."
                                        value={formData.address}
                                        onChangeText={handleAddressChange}
                                        multiline
                                        numberOfLines={2}
                                        editable={!loading && !submitted}
                                    />

                                    {showSuggestions && addressSuggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            <ScrollView
                                                style={styles.suggestionsScroll}
                                                contentContainerStyle={{ flexGrow: 0 }}
                                                keyboardShouldPersistTaps="handled"
                                                nestedScrollEnabled={true}
                                                showsVerticalScrollIndicator={true}
                                            >
                                                {addressSuggestions.map((result, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={styles.suggestionItem}
                                                        onPress={() => selectAddressResult(result)}
                                                    >
                                                        <Text style={styles.suggestionMain}>
                                                            {result.display_name.split(',')[0]}
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
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[
                                styles.submitButton,
                                (loading || submitted || isGuest || vehicles.length === 0 || showUnpaidModal)
                                && styles.submitButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={
                                loading || submitted || isGuest ||
                                vehicles.length === 0 || showUnpaidModal
                            }
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Request Assistance</Text>
                            )}
                        </TouchableOpacity>

                        {/* Confirmation */}
                        {submitted && (
                            <View style={styles.confirmationBox}>
                                <Text style={styles.confirmationIcon}></Text>
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
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Guest Modal */}
            <Modal
                visible={showGuestModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGuestModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Account Required</Text>
                        <Text style={styles.modalText}>
                            You need an account to submit a request. Please log in or register.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonLogin]}
                                onPress={handleGuestLogin}
                            >
                                <Text style={styles.modalButtonText}>Log In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonRegister]}
                                onPress={handleGuestRegister}
                            >
                                <Text style={styles.modalButtonText}>Register</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => {
                                setShowGuestModal(false);
                                navigation.goBack();
                            }}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Unpaid Balance Modal */}
            <Modal
                visible={showUnpaidModal}
                transparent
                animationType="fade"
                onRequestClose={() => { /* must not dismiss — force action */ }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Payment Required</Text>

                        {unpaidRequest && (
                            <>
                                <Text style={styles.modalText}>
                                    You have an unpaid request (#{unpaidRequest.id}, ₱{unpaidRequest.amount}).
                                </Text>
                                <Text style={[styles.modalText, { color: '#6c757d' }]}>
                                    Status: {statusTextFor(unpaidRequest.payment_status)}.
                                </Text>
                                <Text style={styles.modalText}>
                                    Please settle it before making a new request.
                                </Text>
                            </>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonRegister]}
                                onPress={() => {
                                    setShowUnpaidModal(false);
                                    navigation.navigate('Dashboard', {
                                        screen: 'Dashboard',
                                        params: { pay: unpaidRequest?.id },
                                    });
                                }}
                            >
                                <Text style={styles.modalButtonText}>Go to Payment</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonLogin]}
                                onPress={() => {
                                    setShowUnpaidModal(false);
                                    navigation.navigate('Dashboard');
                                }}
                            >
                                <Text style={styles.modalButtonText}>Back to Dashboard</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

export default RequestFormScreen;