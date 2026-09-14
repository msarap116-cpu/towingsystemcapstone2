import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import RequestFormScreen from './src/screens/RequestFormScreen';



const Stack = createNativeStackNavigator();

const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Home');

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem('token');       // tama nga key
                const userStr = await AsyncStorage.getItem('user');     // tama nga key
                console.log('TOKEN:', token, 'USER:', userStr);

                if (token && userStr) {
                    const user = JSON.parse(userStr);                    // i-parse ang JSON para makuha ang role
                    setInitialRoute(user.role === 'driver' ? 'DriverDashboard' : 'Dashboard');
                } else {
                    setInitialRoute('Home');
                }
            } catch (error) {
                console.log('Error checking login status:', error);
                setInitialRoute('Home');
            } finally {
                setIsLoading(false);
            }
        };

        checkLoginStatus();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRoute}>
                <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
                <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ headerShown: false }} />
                <Stack.Screen name="RequestForm" component={RequestFormScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default App;