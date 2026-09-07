// screens/RequestFormScreen.js
import React, { useState, useEffect } from 'react';
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
    StatusBar
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// const API_BASE_URL = 'http://192.168.1.100:3000'; // Change to your computer's IP

const RequestFormScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        serviceType: '',
        vehicleType: '',
        licensePlate: '',
        address: '',
        latitude: null,
        longitude: null
    });

    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [locationStatus, setLocationStatus] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [requestId, setRequestId] = useState(null);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getCurrentLocation = () => {
        setGettingLocation(true);
        setLocationStatus('Getting location...');

        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                updateField('latitude', latitude);
                updateField('longitude', longitude);
                setLocationStatus('✓ Location captured! Getting address...');

                // Get address from coordinates
                const address = await getAddressFromCoords(latitude, longitude);
                if (address) {
                    updateField('address', address);
                    setLocationStatus('✓ Location captured successfully');
                } else {
                    setLocationStatus('✓ Coordinates captured (address unavailable)');
                }

                setGettingLocation(false);
            },
            (error) => {
                let errorMessage = 'Unable to get location. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timeout.';
                        break;
                    default:
                        errorMessage += 'Unknown error.';
                }
                setLocationStatus(errorMessage);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const getAddressFromCoords = async (lat, lng) => {
        try {
            // Using free Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
            );
            const data = await response.json();
            return data.display_name || null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    };

    const validateForm = () => {
        if (!formData.serviceType) {
            Alert.alert('Error', 'Please select a service type');
            return false;
        }

        if (!formData.vehicleType.trim()) {
            Alert.alert('Error', 'Please enter vehicle type');
            return false;
        }

        if (!formData.licensePlate.trim()) {
            Alert.alert('Error', 'Please enter license plate');
            return false;
        }

        if (!formData.latitude && !formData.longitude && !formData.address.trim()) {
            Alert.alert('Error', 'Please provide your location (use current location or enter address)');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('Error', 'Please login first');
            navigation.navigate('Login');
            return;
        }

        setLoading(true);

        try {
            console.log('Submitting request with data:', {
                service_type: formData.serviceType,
                vehicle_type: formData.vehicleType,
                license_plate: formData.licensePlate,
                location_lat: formData.latitude,
                location_lng: formData.longitude,
                address: formData.address
            });

            const response = await fetch(`${API_BASE_URL}/api/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    service_type: formData.serviceType,
                    vehicle_type: formData.vehicleType,
                    license_plate: formData.licensePlate,
                    location_lat: formData.latitude,
                    location_lng: formData.longitude,
                    address: formData.address.trim() || null
                })
            });

            const data = await response.json();
            console.log('Response:', data);

            if (response.ok) {
                setRequestId(data.request.id);
                setSubmitted(true);

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
            } else {
                Alert.alert('Error', data.error || 'Failed to submit request');
            }

        } catch (error) {
            console.error('Request error:', error);
            Alert.alert('Network Error', 'Cannot connect to server. Please check your connection.\n\nMake sure your backend is running on: ' + API_BASE_URL);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            serviceType: '',
            vehicleType: '',
            licensePlate: '',
            address: '',
            latitude: null,
            longitude: null
        });
        setLocationStatus('');
        setSubmitted(false);
    };

    const serviceTypes = [
        { label: 'Select Service', value: '' },
        { label: 'Towing Service', value: 'towing' },
        { label: 'Flat Tire Change', value: 'flat_tire' },
        { label: 'Jump Start', value: 'jump_start' },
        { label: 'Fuel Delivery', value: 'fuel' },
        { label: 'Lockout Service', value: 'lockout' }
    ];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#f4f6f9" />

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Navigation Bar */}
                <View style={styles.navbar}>
                    <View style={styles.navContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.navbarBrand}>← Back</Text>
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

                        {/* Vehicle Type */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Vehicle Type:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Sedan, SUV, Truck"
                                value={formData.vehicleType}
                                onChangeText={(value) => updateField('vehicleType', value)}
                                editable={!loading && !submitted}
                            />
                        </View>

                        {/* License Plate */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>License Plate:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter license plate number"
                                value={formData.licensePlate}
                                onChangeText={(value) => updateField('licensePlate', value)}
                                autoCapitalize="characters"
                                editable={!loading && !submitted}
                            />
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
                                    locationStatus.includes('✓') ? styles.successText : styles.errorText
                                ]}>
                                    {locationStatus}
                                </Text>
                            ) : null}

                            {/* Manual Address */}
                            <View style={styles.manualAddress}>
                                <Text style={styles.subLabel}>Or Enter Address:</Text>
                                <TextInput
                                    style={[styles.textArea, styles.input]}
                                    placeholder="Enter your full address"
                                    value={formData.address}
                                    onChangeText={(value) => updateField('address', value)}
                                    multiline
                                    numberOfLines={3}
                                    editable={!loading && !submitted}
                                />
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, (loading || submitted) && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading || submitted}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Request Assistance</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};


export default RequestFormScreen;