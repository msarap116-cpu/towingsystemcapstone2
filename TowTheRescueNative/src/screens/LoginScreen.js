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
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';  // 
// const API_BASE_URL = 'http://192.168.0.104:3000/api/login'; // Change to your computer's IP

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Check if user is already logged in
    useEffect(() => {
        checkAutoLogin();
    }, []);

    const checkAutoLogin = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const savedEmail = await AsyncStorage.getItem('rememberEmail');
            
            if (token) {
                // Validate token with backend
                const response = await fetch(`${API_BASE_URL}/users/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    // Redirect based on role
                    redirectUser(userData.role);
                } else {
                    // Token invalid, clear storage
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('user');
                }
            }
            
            // Auto-fill remembered email
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberMe(true);
            }
        } catch (err) {
            console.error('Auto-login check error:', err);
        }
    };

    const handleLogin = async () => {
        // Validation
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }
        
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save token and user data
                await AsyncStorage.setItem('token', data.token);
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                
                // Save email if remember me is checked
                if (rememberMe) {
                    await AsyncStorage.setItem('rememberEmail', email.trim());
                } else {
                    await AsyncStorage.removeItem('rememberEmail');
                }
                
                Alert.alert('Success', 'Login successful!', [
                    { 
                        text: 'OK', 
                        onPress: () => redirectUser(data.user.role)
                    }
                ]);
                
            } else {
                Alert.alert('Login Failed', data.error || 'Invalid email or password');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(
                'Network Error',
                'Cannot connect to server. Please check your connection and make sure the backend is running.'
            );
        } finally {
            setLoading(false);
        }
    };
    
    const redirectUser = (role) => {
        switch(role) {
            case 'driver':
                navigation.replace('DriverDashboard');
                break;
            default:
                navigation.replace('Dashboard');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#f4f7f9" />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Navigation Bar */}
                <View style={styles.navbar}>
                    <View style={styles.navContainer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                            <Text style={styles.navbarBrand}>Tow Assist</Text>
                        </TouchableOpacity>
                        <View style={styles.navLinks}>
                            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                                <Text style={styles.navLink}>Home</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.navLink}>Register</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                
                {/* Login Card */}
                <View style={styles.loginCard}>
                    <Text style={styles.title}>Login to Your Account</Text>
                    
                    {/* Email Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            editable={!loading}
                        />
                    </View>
                    
                    {/* Password Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder="Enter your password"
                                placeholderTextColor = "#999"
                                value={password}
                                onChangeText={setPassword}
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
                    </View>
                    
                    {/* Remember Me Checkbox */}
                    <TouchableOpacity 
                        style={styles.checkboxContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                        disabled={loading}
                    >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.checkboxLabel}>Remember me</Text>
                    </TouchableOpacity>
                    
                    {/* Login Button */}
                    <TouchableOpacity 
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Login</Text>
                        )}
                    </TouchableOpacity>
                    
                    {/* Footer Links */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Don't have an account?{' '}
                            <Text 
                                style={styles.link}
                                onPress={() => navigation.navigate('Register')}
                            >
                                Register here
                            </Text>
                        </Text>
                        <TouchableOpacity onPress={() => Alert.alert('Info', 'Password reset feature coming soon!')}>
                            <Text style={styles.link}>Forgot password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f7f9',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    navbar: {
        backgroundColor: '#0d6efd',
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    navbarBrand: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    navLinks: {
        flexDirection: 'row',
        gap: 20,
    },
    navLink: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginLeft: 20,
    },
    loginCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 40,
        padding: 30,
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        top: 12,
        padding: 5,
    },
    eyeButtonText: {
        fontSize: 20,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: '#0d6efd',
        borderRadius: 4,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: '#0d6efd',
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#555',
    },
    loginButton: {
        backgroundColor: '#0d6efd',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        alignItems: 'center',
        gap: 10,
    },
    footerText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    link: {
        color: '#0d6efd',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default LoginScreen;