import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import RequestFormScreen from '../screens/RequestFormScreen';
import DrawerContent from '../components/DrawerContent';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator for the menu
function MainDrawerNavigator() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{
                drawerType: 'front',
                drawerStyle: {
                    width: 280,
                },
                headerStyle: {
                    backgroundColor: '#0066cc',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Drawer.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'Dashboard' }}
            />
            <Drawer.Screen 
                name="RequestForm" 
                component={RequestFormScreen}
                options={{ title: 'Request Assistance' }}
            />
        </Drawer.Navigator>
    );
}

function AppNavigator() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="Home">
                    <Stack.Screen 
                        name="Home" 
                        component={HomeScreen} 
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen 
                        name="Login" 
                        component={LoginScreen} 
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen 
                        name="Register" 
                        component={RegisterScreen} 
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen 
                        name="DriverDashboard" 
                        component={DriverDashboardScreen} 
                        options={{ headerShown: false }}
                    />
                    {/* This allows navigation.replace('Dashboard') to work */}
                    <Stack.Screen 
                        name="Dashboard" 
                        component={MainDrawerNavigator} 
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}

export default AppNavigator;