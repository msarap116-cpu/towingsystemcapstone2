import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import CheckBox from "@react-native-community/checkbox";
import { styles } from "../styles/loginStyles";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleLogin = () => {
    console.log("Email:", email);
    console.log("Password:", password);
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.brand}>Tow Assist</Text>
        <View style={styles.navLinks}>
          <Text style={styles.navLink}>Home</Text>
          <Text style={styles.navLink}>Register</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.loginCard}>

          <Text style={styles.title}>Login to Your Account</Text>

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Remember Me */}
          <View style={styles.formCheck}>
            <CheckBox
              value={remember}
              onValueChange={setRemember}
            />
            <Text>Remember me</Text>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>
              Don't have an account? <Text style={styles.link}>Register here</Text>
            </Text>

            <Text style={styles.link}>Forgot password?</Text>
          </View>

        </View>
      </View>

    </SafeAreaView>
  );
}