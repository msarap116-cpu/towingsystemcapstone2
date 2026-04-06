import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    StatusBar,
    AppState
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

const { width } = Dimensions.get('window');
const DRIVER_LOCATION_INTERVAL_MS = 5000;

const DriverDashboardScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [activeRequestsCount, setActiveRequestsCount] = useState(0);
    const [totalRequestsCount, setTotalRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasActiveRequest, setHasActiveRequest] = useState(false);
    const [requestData, setRequestData] = useState(null);
    const [activeRequestId, setActiveRequestId] = useState(null);
    const [jobInfo, setJobInfo] = useState(null);
    const [token, setToken] = useState(null);
    const [locationStatus, setLocationStatus] = useState('Waiting for GPS...');
    
    const webViewRef = useRef(null);
    const locationInterval = useRef(null);
    const watchId = useRef(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        loadDashboard();
        
        // Handle app state changes
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        return () => {
            subscription.remove();
            stopLocationTracking();
        };
    }, []);

    const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active' && hasActiveRequest) {
            startLocationTracking();
        } else if (nextAppState === 'background' && hasActiveRequest) {
            stopLocationTracking();
        }
    };

    const loadDashboard = async () => {
        try {
            const userToken = await AsyncStorage.getItem('token');
            if (!userToken) {
                navigation.replace('Login');
                return;
            }
            setToken(userToken);

            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }

            await loadRequestData(userToken);
            await loadRequestCounts(userToken);
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            Alert.alert('Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadRequestData = async (userToken) => {
        try {
            const response = await fetch(`${API_BASE_URL}/requests/latest`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.location_lat && data?.location_lng) {
                    setHasActiveRequest(true);
                    setRequestData(data);
                    setActiveRequestId(data.request_id);
                    setJobInfo({
                        id: data.request_id,
                        service: data.service_type,
                        vehicle: data.vehicle_type,
                        address: data.address
                    });
                    
                    // Start location tracking if we have an active request
                    startLocationTracking();
                } else {
                    setHasActiveRequest(false);
                    setRequestData(null);
                    setActiveRequestId(null);
                    stopLocationTracking();
                }
            } else {
                setHasActiveRequest(false);
                setRequestData(null);
            }
        } catch (error) {
            console.error('Load request error:', error);
            setHasActiveRequest(false);
        }
    };

    const loadRequestCounts = async (userToken) => {
        try {
            const response = await fetch(`${API_BASE_URL}/requests/my-requests`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (response.ok) {
                const requests = await response.json();
                setTotalRequestsCount(requests.length);
                
                const active = requests.filter(r => 
                    r.status === 'pending' || 
                    r.status === 'accepted' || 
                    r.status === 'en_route'
                ).length;
                setActiveRequestsCount(active);
            }
        } catch (error) {
            console.error('Load counts error:', error);
        }
    };

    const startLocationTracking = () => {
        if (watchId.current) return;
        
        setLocationStatus('Requesting location permission...');
        
        Geolocation.requestAuthorization();
        
        watchId.current = Geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocationStatus(`GPS active: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                sendDriverLocation(latitude, longitude);
                
                if (webViewRef.current) {
                    webViewRef.current.injectJavaScript(`
                        if (window.updateDriverLocation) {
                            window.updateDriverLocation(${latitude}, ${longitude});
                        }
                        true;
                    `);
                }
            },
            (error) => {
                console.error('GPS error:', error);
                let errorMsg = 'GPS error: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'Location unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'Location timeout';
                        break;
                    default:
                        errorMsg += error.message;
                }
                setLocationStatus(errorMsg);
            },
            {
                enableHighAccuracy: true,
                distanceFilter: 10,
                interval: 5000,
                fastestInterval: 3000
            }
        );
    };

    const stopLocationTracking = () => {
        if (watchId.current) {
            Geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setLocationStatus('Location tracking stopped');
    };

    const sendDriverLocation = async (lat, lng) => {
        if (!token || !activeRequestId) return;

        try {
            await fetch(`${API_BASE_URL}/requests/driver-location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    lat, 
                    lng, 
                    request_id: activeRequestId 
                })
            });
        } catch (err) {
            console.error('Send location error:', err);
        }
    };

    const completeJob = async () => {
        if (!activeRequestId) {
            Alert.alert('Error', 'No active job found');
            return;
        }

        Alert.alert(
            'Complete Job',
            'Mark this job as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_BASE_URL}/requests/${activeRequestId}/status`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'completed' })
                            });

                            const data = await response.json();

                            if (response.ok) {
                                Alert.alert('Success', 'Job marked as completed!');
                                stopLocationTracking();
                                loadDashboard();
                            } else {
                                Alert.alert('Error', data.message || 'Failed to complete job');
                            }
                        } catch (err) {
                            console.error('Complete job error:', err);
                            Alert.alert('Error', 'Failed to complete job');
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        stopLocationTracking();
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('user');
                        navigation.replace('Home');
                    }
                }
            ]
        );
    };

    const getUserInitials = () => {
        if (!user?.name) return 'D';
        return user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // HTML for the map - matches web driver dashboard
    const getMapHtml = () => {
        if (!requestData) return '';
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    #map { height: 100%; width: 100%; }
                    body { height: 100vh; margin: 0; padding: 0; }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    let map, driverMarker, customerMarker, routeLayer;
                    
                    const customerLat = ${requestData.location_lat};
                    const customerLng = ${requestData.location_lng};
                    const customerAddress = '${(requestData.address || 'Customer location').replace(/'/g, "\\'")}';
                    const serviceType = '${requestData.service_type || 'Service'}';
                    const vehicleType = '${requestData.vehicle_type || 'Vehicle'}';
                    
                    const driverIcon = L.divIcon({
                        className: '',
                        html: '<div style="background:#1D9E75;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 18],
                        popupAnchor: [0, -20]
                    });
                    
                    const customerIcon = L.divIcon({
                        className: '',
                        html: '<div style="background:#D85A30;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">📍</div>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 36],
                        popupAnchor: [0, -36]
                    });
                    
                    function initMap() {
                        map = L.map('map').setView([customerLat, customerLng], 14);
                        
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap',
                            maxZoom: 19
                        }).addTo(map);
                        
                        customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
                            .addTo(map)
                            .bindPopup('<strong>📍 Customer Location</strong><br>' + customerAddress + '<br>Service: ' + serviceType + '<br>Vehicle: ' + vehicleType)
                            .openPopup();
                    }
                    
                    window.updateDriverLocation = function(lat, lng) {
                        if (!driverMarker) {
                            driverMarker = L.marker([lat, lng], { icon: driverIcon })
                                .addTo(map)
                                .bindPopup('<strong>🚗 You (Driver)</strong>');
                            
                            const bounds = L.latLngBounds([lat, lng], [customerLat, customerLng]);
                            map.fitBounds(bounds, { padding: [60, 60] });
                        } else {
                            driverMarker.setLatLng([lat, lng]);
                        }
                        
                        drawRoute(lat, lng, customerLat, customerLng);
                    };
                    
                    async function drawRoute(fromLat, fromLng, toLat, toLng) {
                        try {
                            const url = 'https://router.project-osrm.org/route/v1/driving/' + fromLng + ',' + fromLat + ';' + toLng + ',' + toLat + '?overview=full&geometries=geojson';
                            const res = await fetch(url);
                            const data = await res.json();
                            
                            if (data.code === 'Ok') {
                                const coords = data.routes[0].geometry.coordinates;
                                const latLngs = coords.map(c => [c[1], c[0]]);
                                if (routeLayer) map.removeLayer(routeLayer);
                                routeLayer = L.polyline(latLngs, { color: '#1D9E75', weight: 5 }).addTo(map);
                                
                                const distance = (data.routes[0].distance / 1000).toFixed(1);
                                const duration = Math.ceil(data.routes[0].duration / 60);
                                
                                if (driverMarker) {
                                    driverMarker.setPopupContent('<strong>🚗 You (Driver)</strong><br>Distance: ' + distance + ' km<br>ETA: ' + duration + ' min');
                                }
                            }
                        } catch(err) {
                            console.error('Route error:', err);
                        }
                    }
                    
                    initMap();
                </script>
            </body>
            </html>
        `;
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Loading driver dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0066cc" />
            
            {/* Navigation Bar */}
            <View style={styles.navbar}>
                <Text style={styles.navbarBrand}>Tow the Rescue</Text>
            </View>
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.content}>
                    {/* Sidebar */}
                    <View style={styles.sidebar}>
                        <View style={styles.dashboardCard}>
                            <Text style={styles.cardTitle}>My Account</Text>
                            <View style={styles.profileInfo}>
                                <View style={styles.profileIcon}>
                                    <Text style={styles.profileInitials}>{getUserInitials()}</Text>
                                </View>
                                <Text style={styles.profileName}>{user?.name || 'Driver'}</Text>
                                <Text style={styles.userType}>Driver</Text>
                            </View>
                            <View style={styles.divider} />
                            
                            <TouchableOpacity 
                                style={styles.sidebarNavItem}
                                onPress={() => navigation.navigate('DriverDashboard')}
                            >
                                <Text style={styles.activeNavText}>Dashboard</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.sidebarNavItem}
                                onPress={() => Alert.alert('Coming Soon', 'My Requests feature coming soon!')}
                            >
                                <Text style={styles.navText}>My Requests</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.sidebarNavItem}
                                onPress={() => Alert.alert('Coming Soon', 'My Vehicles feature coming soon!')}
                            >
                                <Text style={styles.navText}>My Vehicles</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.sidebarNavItem}
                                onPress={() => Alert.alert('Coming Soon', 'Profile Settings coming soon!')}
                            >
                                <Text style={styles.navText}>Profile Settings</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.sidebarNavItem, styles.logoutItem]}
                                onPress={handleLogout}
                            >
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {/* Main Content */}
                    <View style={styles.mainContent}>
                        {/* Quick Actions / Stats */}
                        <View style={styles.quickActions}>
                            <View style={styles.statsCard}>
                                <Text style={styles.statsCardTitle}>Request Help</Text>
                                <Text style={styles.statsCardText}>Need immediate assistance?</Text>
                                <TouchableOpacity 
                                    style={styles.emergencyButton}
                                    onPress={() => Alert.alert('Coming Soon', 'Emergency help feature coming soon!')}
                                >
                                    <Text style={styles.emergencyButtonText}>EMERGENCY HELP</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.statsCard}>
                                <Text style={styles.statsCardTitle}>Active Requests</Text>
                                <Text style={styles.statsCardCount}>{activeRequestsCount}</Text>
                                <Text style={styles.statsCardText}>Currently active</Text>
                            </View>
                            
                            <View style={styles.statsCard}>
                                <Text style={styles.statsCardTitle}>Total Requests</Text>
                                <Text style={styles.statsCardCount}>{totalRequestsCount}</Text>
                                <Text style={styles.statsCardText}>All time</Text>
                            </View>
                        </View>
                        
                        {/* Driver Map and Job Actions */}
                        <View style={styles.dashboardCard}>
                            <Text style={styles.cardTitle}>Driver Map</Text>
                            {hasActiveRequest && requestData ? (
                                <>
                                    <View style={styles.mapContainer}>
                                        <WebView
                                            ref={webViewRef}
                                            source={{ html: getMapHtml() }}
                                            style={styles.map}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            geolocationEnabled={true}
                                            onError={(error) => console.error('WebView error:', error)}
                                        />
                                    </View>
                                    
                                    {/* GPS Status */}
                                    <View style={styles.gpsStatus}>
                                        <Text style={styles.gpsStatusText}>📍 {locationStatus}</Text>
                                    </View>
                                    
                                    {/* Job Actions */}
                                    <View style={styles.jobActions}>
                                        <Text style={styles.jobInfo}>
                                            Job #{jobInfo?.id} — {jobInfo?.service} ({jobInfo?.vehicle})
                                        </Text>
                                        <TouchableOpacity 
                                            style={styles.completeButton}
                                            onPress={completeJob}
                                        >
                                            <Text style={styles.completeButtonText}>Complete Job</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.noRequestContainer}>
                                    <Text style={styles.noRequestText}>No active customer request found.</Text>
                                    <TouchableOpacity 
                                        style={styles.refreshButton}
                                        onPress={onRefresh}
                                    >
                                        <Text style={styles.refreshButtonText}>Refresh</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    navbar: {
        backgroundColor: '#0066cc',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    navbarBrand: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 15,
        gap: 15,
    },
    sidebar: {
        width: width >= 768 ? 280 : '100%',
    },
    dashboardCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    profileInfo: {
        alignItems: 'center',
        marginBottom: 15,
    },
    profileIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1D9E75',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileInitials: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    userType: {
        fontSize: 14,
        color: '#1D9E75',
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 15,
    },
    sidebarNavItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    activeNavText: {
        fontSize: 14,
        color: '#0066cc',
        fontWeight: 'bold',
    },
    navText: {
        fontSize: 14,
        color: '#333',
    },
    logoutItem: {
        borderBottomWidth: 0,
        marginTop: 10,
    },
    logoutText: {
        fontSize: 14,
        color: '#dc3545',
    },
    mainContent: {
        flex: 1,
        minWidth: width >= 768 ? 500 : '100%',
    },
    quickActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginBottom: 20,
    },
    statsCard: {
        flex: 1,
        minWidth: width >= 768 ? 150 : '100%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statsCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0066cc',
        marginBottom: 10,
    },
    statsCardText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    statsCardCount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1D9E75',
        marginVertical: 5,
    },
    emergencyButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    emergencyButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    mapContainer: {
        height: 400,
        borderRadius: 10,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    gpsStatus: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    gpsStatusText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    jobActions: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    jobInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        textAlign: 'center',
    },
    completeButton: {
        backgroundColor: '#1D9E75',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    noRequestContainer: {
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
    },
    noRequestText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 20,
    },
    refreshButton: {
        backgroundColor: '#0066cc',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default DriverDashboardScreen;