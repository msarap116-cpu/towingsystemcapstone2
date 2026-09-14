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

  //ONE SINGLE COMBINED useEffect — NO duplicates, NO conflicts
useEffect(() => {
  // 1.Read returnTo from navigation params
  if (route.params?.returnTo) {
    setReturnTo(route.params.returnTo);
  }

  // 2.Check auth status — auto-redirect if already logged in
  checkAuthStatus();

  // 3.Show logout message (passed from Dashboard on logout)
  const message = route.params?.logoutMessage;
  if (message) {
    setTimeout(() => {
      Alert.alert('Logged Out', message);
      //Clear message so it doesn't re-appear
      if (navigation?.setParams) {
        navigation.setParams({ logoutMessage: null });
      }
    }, 0);
  }
}, [route.params]); //ONE dependency list — clean & correct

//Auth check — unchanged
const checkAuthStatus = async () => {
  const token = await AsyncStorage.getItem('token');
  const userStr = await AsyncStorage.getItem('user');
  if (token && userStr) {
    const user = JSON.parse(userStr);
    if (user.role === 'driver') {
      navigation.replace('DriverDashboard');
    } else {
      navigation.replace('Dashboard');
    }
  }
};

//Login — timing fixed, no orphaned Alert
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter both email and password');
    return;
  }
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      //Alert shows FIRST → navigate AFTER user taps OK
      Alert.alert(' Success', 'Login successful!', [
        {
          text: 'OK',
          onPress: () => {
            let redirectScreen = 'Dashboard';
            if (data.user.role === 'driver') {
              redirectScreen = 'DriverDashboard';
            } else if (returnTo) {
              redirectScreen = returnTo;
            }
            //Wait for Alert to CLOSE COMPLETELY before navigating
            setTimeout(() => {
              navigation.replace(redirectScreen);
            }, 100);
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
            <Text style={styles.loginIcon}>🤸🏾‍♂️</Text>
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