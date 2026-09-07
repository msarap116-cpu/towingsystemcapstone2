import React, { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/RegisterScreen.styles';
import { Picker } from '@react-native-picker/picker';
import API_BASE_URL from '../config';  //

// const API_BASE_URL = 'http://192.168.0.104:3000'; // Change to your computer's IP

const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        userType: '',
        password: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Phone validation
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(formData.phone.replace(/[^0-9]/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-11 digit phone number';
        }

        // User type validation
        if (!formData.userType) {
            newErrors.userType = 'Please select an account type';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim(),
                    password: formData.password,
                    role: formData.userType
                })
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Registration Successful!',
                    'Your account has been created. Please login to continue.',
                    [
                        {
                            text: 'Go to Login',
                            onPress: () => navigation.navigate('Login')
                        }
                    ]
                );
            } else {
                Alert.alert('Registration Failed', data.error || 'Unable to create account. Please try again.');
            }

        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert(
                'Network Error',
                'Cannot connect to server. Please check your connection and make sure the backend is running.'
            );
        } finally {
            setLoading(false);
        }
    };

    const userTypes = [
        { label: 'Select account type', value: '' },
        { label: 'Customer', value: 'customer' },
        { label: 'Driver', value: 'driver' },
        { label: 'Dispatcher', value: 'dispatcher' }
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
                        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                            <Text style={styles.navbarBrand}>Tow Assist</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Registration Card */}
                <View style={styles.card}>
                    <Text style={styles.title}>Create Account</Text>

                    {/* Name Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            placeholder="Enter your full name"
                            placeholderTextColor = "#999"
                            value={formData.name}
                            onChangeText={(value) => updateField('name', value)}
                            autoCapitalize="words"
                            editable={!loading}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Email Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            placeholder="Enter your email"
                            placeholderTextColor = "#999"
                            value={formData.email}
                            onChangeText={(value) => updateField('email', value)}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* Phone Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            placeholder="Enter your phone number"
                            placeholderTextColor = "#999"
                            value={formData.phone}
                            onChangeText={(value) => updateField('phone', value)}
                            keyboardType="phone-pad"
                            editable={!loading}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    {/* Account Type Picker */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Account Type</Text>
                        <View style={[styles.pickerContainer, errors.userType && styles.inputError]}>
                            <Picker
                                selectedValue={formData.userType}
                                onValueChange={(value) => updateField('userType', value)}
                                enabled={!loading}
                                style={styles.picker}
                            >
                                {userTypes.map((type) => (
                                    <Picker.Item
                                        key={type.value}
                                        label={type.label}
                                        value={type.value}
                                    />
                                ))}
                            </Picker>
                        </View>
                        {errors.userType && <Text style={styles.errorText}>{errors.userType}</Text>}
                    </View>

                    {/* Password Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                                placeholder="Create a password"
                                placeholderTextColor = "#999"
                                value={formData.password}
                                onChangeText={(value) => updateField('password', value)}
                                secureTextEntry={!showPassword}
                                editable={!loading}
                                color="#000"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeButtonText}>
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                                placeholder="Confirm your password"
                                placeholderTextColor = "#999"
                                value={formData.confirmPassword}
                                onChangeText={(value) => updateField('confirmPassword', value)}
                                secureTextEntry={!showConfirmPassword}
                                editable={!loading}
                                color="#000"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Text style={styles.eyeButtonText}>
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    {/* Register Button */}
                    <TouchableOpacity
                        style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.registerButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Already have an account?{' '}
                            <Text
                                style={styles.link}
                                onPress={() => navigation.navigate('Login')}
                            >
                                Login here
                            </Text>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};



export default RegisterScreen;