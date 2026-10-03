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
    StatusBar,
    Image
} from 'react-native';
import API_BASE_URL from '../config';
import styles from '../styles/RegisterScreen.styles';

// ===== VALIDATION HELPERS (mirrors your web registration.js) =====

// Email validation with typo correction (same as web)
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    const [localPart, domain] = email.split('@');

    const domainCorrections = {
        'gmail.con': 'gmail.com',
        'gmail.cm': 'gmail.com',
        'gmail.co': 'gmail.com',
        'gmail.c': 'gmail.com',
        'yahoo.con': 'yahoo.com',
        'yahoo.cm': 'yahoo.com',
        'yahoo.co': 'yahoo.com',
        'hotmail.con': 'hotmail.com',
        'hotmail.cm': 'hotmail.com',
        'hotmail.co': 'hotmail.com',
        'outlook.con': 'outlook.com',
        'outlook.cm': 'outlook.com',
        'outlook.co': 'outlook.com'
    };

    const tldCorrections = {
        '.con': '.com',
        '.can': '.com',
        '.cmo': '.com',
        '.comm': '.com',
        '.comn': '.com',
        '.coom': '.com',
        '.cpm': '.com',
        '.xom': '.com',
        '.vom': '.com'
    };

    let correctedDomain = domain.toLowerCase();
    let hasCorrection = false;

    for (const [wrong, correct] of Object.entries(domainCorrections)) {
        if (correctedDomain === wrong) {
            correctedDomain = correct;
            hasCorrection = true;
            break;
        }
    }

    if (!hasCorrection) {
        for (const [wrong, correct] of Object.entries(tldCorrections)) {
            if (correctedDomain.endsWith(wrong)) {
                const domainWithoutTld = correctedDomain.slice(0, -wrong.length);
                correctedDomain = domainWithoutTld + correct;
                hasCorrection = true;
                break;
            }
        }
    }

    const correctedEmail = `${localPart}@${correctedDomain}`;

    if (hasCorrection && correctedEmail !== email) {
        return {
            isValid: true,
            correctedEmail,
            message: `Did you mean ${correctedEmail}?`
        };
    }

    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domainWithoutDot = correctedDomain.replace(/\./g, '');
    for (const commonDomain of commonDomains) {
        const commonDomainWithoutDot = commonDomain.replace(/\./g, '');
        if (domainWithoutDot === commonDomainWithoutDot && correctedDomain !== commonDomain) {
            return {
                isValid: true,
                correctedEmail: `${localPart}@${commonDomain}`,
                message: `Did you mean ${localPart}@${commonDomain}?`
            };
        }
    }

    return { isValid: true, correctedEmail: null };
}

// Password validation (same regex as your web)
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
    if (!passwordRegex.test(password)) {
        return {
            isValid: false,
            message: 'Password must be 8+ chars with uppercase, lowercase, number, and special character (@$!%*?&)'
        };
    }
    return { isValid: true };
}

// PH phone validation (same as your web)
function validatePhoneNumber(phone) {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const phPhoneRegex = /^(09\d{9}|\+639\d{9})$/;
    if (!phPhoneRegex.test(cleanPhone)) {
        return {
            isValid: false,
            message: 'Enter a valid PH number: 09XXXXXXXXX or +639XXXXXXXXX'
        };
    }
    return { isValid: true };
}

// ===== COMPONENT =====
const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [emailSuggestion, setEmailSuggestion] = useState('');
    const [emailStatus, setEmailStatus] = useState({ text: '', color: '' });

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        if (field === 'email') {
            setEmailSuggestion('');
            setEmailStatus({ text: '', color: '' });
        }
    };

    // ===== EMAIL AVAILABILITY (mirrors your web checkEmailAvailability) =====
    const checkEmailAvailability = async (email) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) return { available: true };

            const data = await response.json();

            if (data.correctedEmail && data.correctedEmail !== email) {
                setEmailSuggestion(`Did you mean: ${data.correctedEmail}? Tap to apply.`);
            }

            return data;
        } catch (error) {
            console.error('Email check error:', error);
            return { available: true };
        }
    };

    // Triggered on email blur (mirrors web `blur` event)
    const handleEmailBlur = async () => {
        const email = formData.email.trim();
        if (!email) return;

        const emailValidation = validateEmail(email);

        if (!emailValidation.isValid) {
            setEmailStatus({ text: emailValidation.message, color: '#dc3545' });
            return;
        }

        const emailToCheck = emailValidation.correctedEmail || email;

        // Show typo suggestion
        if (emailValidation.correctedEmail && emailValidation.correctedEmail !== email) {
            setEmailSuggestion(`Did you mean: ${emailValidation.correctedEmail}? Tap to apply.`);
        }

        // Check availability
        const result = await checkEmailAvailability(emailToCheck);

        if (result && result.available === false) {
            setEmailStatus({ text: '⚠️ Email already registered', color: '#dc3545' });
        } else if (result) {
            setEmailStatus({ text: '✓ Email available', color: '#28a745' });
        }
    };

    const applyEmailSuggestion = () => {
        const match = emailSuggestion.match(/Did you mean:\s*(\S+?)\?/);
        if (match && match[1]) {
            updateField('email', match[1]);
            setEmailSuggestion('');
            setTimeout(handleEmailBlur, 100);
        }
    };

    // ===== FORM VALIDATION (mirrors your web submit handler) =====
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Full name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        const emailValidation = validateEmail(formData.email.trim());
        if (!emailValidation.isValid) {
            newErrors.email = emailValidation.message;
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.message;
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        const phoneValidation = validatePhoneNumber(formData.phone);
        if (!phoneValidation.isValid) {
            newErrors.phone = phoneValidation.message;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (loading) return;

        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fix the errors before submitting.');
            return;
        }

        setLoading(true);

        try {
            const emailValidation = validateEmail(formData.email.trim());
            const finalEmail = emailValidation.correctedEmail || formData.email.trim().toLowerCase();

            const payload = {
                name: formData.name.trim(),
                email: finalEmail,
                phone: formData.phone.trim(),
                password: formData.password,
                role: 'Customer' // matches your web payload
            };

            console.log('📤 Sending registration:', payload);

            const response = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    'Registration Successful!',
                    'Your account has been created. Please login to continue.',
                    [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
                );
            } else {
                Alert.alert(
                    'Registration Failed',
                    data.error || data.message || 'Unable to create account. Please try again.'
                );
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            Alert.alert(
                'Network Error',
                'Cannot connect to server. Please check your connection and make sure the backend is running.'
            );
        } finally {
            setLoading(false);
        }
    };

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
                {/* Navbar */}
                <View style={styles.navbar}>
                    <View style={styles.navContainer}>

                        {/* Brand Logo (Fixed on the left) */}
                        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                            <Text style={styles.brandText}>GoodWrench</Text>
                        </TouchableOpacity>

                        {/* Swipeable Nav Links (Takes up remaining space) */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.navLinksContainer}
                        >
                            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                                <Text style={styles.navLink}>Home</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.navLink}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('RequestForm')}>
                                <Text style={styles.navLink}>Request</Text>
                            </TouchableOpacity>
                        </ScrollView>

                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.headerContainer}>

                        <Text style={styles.title}>Create Account</Text>
                    </View>

                    {/* Full Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            placeholder="Enter your full name"
                            placeholderTextColor="#999"
                            value={formData.name}
                            onChangeText={(v) => updateField('name', v)}
                            autoCapitalize="words"
                            editable={!loading}
                        />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    {/* Email */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            placeholder="Enter your email"
                            placeholderTextColor="#999"
                            value={formData.email}
                            onChangeText={(v) => updateField('email', v)}
                            onBlur={handleEmailBlur}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                        {emailSuggestion ? (
                            <TouchableOpacity onPress={applyEmailSuggestion}>
                                <Text style={styles.emailSuggestion}>{emailSuggestion}</Text>
                            </TouchableOpacity>
                        ) : null}
                        {emailStatus.text ? (
                            <Text style={[styles.statusText, { color: emailStatus.color }]}>
                                {emailStatus.text}
                            </Text>
                        ) : null}
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                    </View>

                    {/* Phone */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                            placeholderTextColor="#999"
                            value={formData.phone}
                            onChangeText={(v) => updateField('phone', v)}
                            keyboardType="phone-pad"
                            editable={!loading}
                        />
                        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
                    </View>

                    {/* Password */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.passwordInput,
                                    errors.password && styles.inputError
                                ]}
                                placeholder="Create a password"
                                placeholderTextColor="#999"
                                value={formData.password}
                                onChangeText={(v) => updateField('password', v)}
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
                        <Text style={styles.helperText}>
                            Must be 8+ chars with uppercase, lowercase, number, and special character (@$!%*?&)
                        </Text>
                        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                    </View>

                    {/* Confirm Password */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.passwordInput,
                                    errors.confirmPassword && styles.inputError
                                ]}
                                placeholder="Confirm your password"
                                placeholderTextColor="#999"
                                value={formData.confirmPassword}
                                onChangeText={(v) => updateField('confirmPassword', v)}
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
                        {errors.confirmPassword ? (
                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                        ) : null}
                    </View>

                    {/* Submit */}
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

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Already have an account?{' '}
                            <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
                                Login here
                            </Text>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ===== STYLES (Caltex palette from your web CSS) =====


export default RegisterScreen;