import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/LoginScreen.styles';
import API_BASE_URL from '../config.js';
// Import your PNG icons
const eyeIcon = require('../assets/images/eye.png');
const eyeCrossedIcon = require('../assets/images/eye-crossed.png');


const LoginScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => {
    if (route.params?.returnTo) {
      setReturnTo(route.params.returnTo);
    }
  }, [route.params]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      navigation.replace('Dashboard');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        // Show success alert
        Alert.alert('✅ Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => {
              let redirectScreen = 'Dashboard';

              if (returnTo) {
                navigation.replace(returnTo);
              } else if (data.user.role === 'admin') {
                redirectScreen = 'AdminDashboard';
              } else if (data.user.role === 'driver') {
                redirectScreen = 'DriverDashboard';
              }

              navigation.replace(redirectScreen);
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0046a8" />

      {/* Navbar - Exactly like your web version */}
      <View style={styles.navbar}>
        <View style={styles.navContainer}>
          <TouchableOpacity
            style={styles.navbarBrand}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.brandText}>GoodWrench</Text>
          </TouchableOpacity>
          <View style={styles.navLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text style={styles.navLink}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.navLink}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('RequestForm')}>
              <Text style={styles.navLink}>Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.loginCard}>
          {/* Header */}
          <View style={styles.loginHeader}>
            <Text style={styles.loginIcon}>🔐</Text>
            <Text style={styles.loginTitle}>Welcome Back</Text>
            <Text style={styles.loginSubtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Field with PNG Icons */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Image
                    source={showPassword ? eyeIcon : eyeCrossedIcon}
                    style={styles.eyeIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.formFooter}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => navigation.navigate('Register')}
                >
                  Register here
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};



export default LoginScreen;