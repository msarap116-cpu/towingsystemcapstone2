import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import RequestFormScreen from './src/screens/RequestFormScreen';
import PdfViewerScreen from './src/screens/PdfViewerScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import MyVehiclesScreen from './src/screens/MyVehiclesScreen';
import { socket, connectSocket } from './src/socket';
import { AppState, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';



const Stack = createNativeStackNavigator();


const App = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Home');

    useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
        if (state === 'active' && !socket.connected) {
            const token = await AsyncStorage.getItem('token');
            if (token) connectSocket(token);
        }
    });
    return () => sub.remove();
}, []);

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem('token');       // tama nga key
                const userStr = await AsyncStorage.getItem('user');     // tama nga key
                console.log('TOKEN:', token, 'USER:', userStr);

                if (token && userStr) {
                    const user = JSON.parse(userStr);
                    connectSocket(token);   // ← add this
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
            <SafeAreaProvider>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName={initialRoute}>
                    <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="RequestForm" component={RequestFormScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
                    <Stack.Screen name="Notifications" component={NotificationScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ headerShown: false }} />

                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
};

export default App;