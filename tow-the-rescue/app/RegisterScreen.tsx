import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch
} from "react-native";

import { styles } from "../styles/registerStyle";

export default function RegisterScreen() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const handleRegister = () => {
    console.log({
      name,
      email,
      phone,
      userType,
      password
    });
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.brand}>Tow Assist</Text>
      </View>

      {/* Main Container */}
      <View style={styles.centerContainer}>

        <View style={styles.formContainer}>

          <Text style={styles.title}>Create Account</Text>

          {/* Row 1 */}
          <View style={styles.row}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.row}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Account Type</Text>
              <TextInput
                style={styles.input}
                placeholder="customer / driver / dispatcher"
                value={userType}
                onChangeText={setUserType}
              />
            </View>
          </View>

          {/* Row 3 */}
          <View style={styles.row}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Terms */}
          <View style={styles.checkboxGroup}>
            <Switch
              value={terms}
              onValueChange={setTerms}
            />
            <Text style={styles.checkboxText}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
          >
            <Text style={styles.buttonText}>
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>
              Already have an account?
              <Text style={styles.link}> Login here</Text>
            </Text>
          </View>

        </View>

      </View>

    </SafeAreaView>
  );
}