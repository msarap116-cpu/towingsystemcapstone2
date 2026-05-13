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
    StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.0.104:3000'; // Change to your computer's IP
const POLL_INTERVAL_MS = 30000;

const DashboardScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [activeRequestsCount, setActiveRequestsCount] = useState(0);
    const [totalRequestsCount, setTotalRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasActiveRequest, setHasActiveRequest] = useState(false);
    const [requestData, setRequestData] = useState(null);
    const [token, setToken] = useState(null);
    
    const webViewRef = useRef(null);
    const pollingInterval = useRef(null);

    useEffect(() => {
        loadDashboard();
        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

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
                } else {
                    setHasActiveRequest(false);
                    setRequestData(null);
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
            // Get all user requests
            const response = await fetch(`${API_BASE_URL}/requests/my-requests`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (response.ok) {
                const requests = await response.json();
                setTotalRequestsCount(requests.length);
                
                // Count active requests (pending, accepted, en_route)
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
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('user');
                        navigation.replace('Home');
                    }
                }
            ]
        );
    };

    const getUserInitials = () => {
        if (!user?.name) return 'U';
        return user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // HTML content for the map - FIXED: removed async/await
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
                    .info-panel {
                        position: absolute;
                        bottom: 20px;
                        left: 20px;
                        right: 20px;
                        background: rgba(0,0,0,0.85);
                        color: white;
                        padding: 12px;
                        border-radius: 12px;
                        z-index: 1000;
                        font-family: sans-serif;
                    }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <div id="info-panel" class="info-panel"></div>
                
                <script>
                    const API_BASE_URL = '${API_BASE_URL}';
                    const POLL_INTERVAL_MS = ${POLL_INTERVAL_MS};
                    let map, customerMarker, driverMarker, routeLayer, pollingInterval;
                    const token = '${token || ''}';
                    const requestLat = ${requestData.location_lat};
                    const requestLng = ${requestData.location_lng};
                    const requestAddress = '${(requestData.address || 'Your requested location').replace(/'/g, "\\'")}';
                    
                    const customerIcon = L.divIcon({
                        className: '',
                        html: '<div style="background:#D85A30;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">📍</div>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 36],
                        popupAnchor: [0, -36]
                    });
                    
                    const driverIcon = L.divIcon({
                        className: '',
                        html: '<div style="background:#1D9E75;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 18],
                        popupAnchor: [0, -20]
                    });
                    
                    function initMap() {
                        map = L.map('map').setView([requestLat, requestLng], 14);
                        
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap',
                            maxZoom: 19
                        }).addTo(map);
                        
                        customerMarker = L.marker([requestLat, requestLng], { icon: customerIcon })
                            .addTo(map)
                            .bindPopup('<strong>📍 Your Location</strong><br>' + requestAddress)
                            .openPopup();
                    }
                    
                    async function checkDriverLocation() {
                        if (!token) return;
                        
                        try {
                            const res = await fetch(API_BASE_URL + '/requests/latest', {
                                headers: { 'Authorization': 'Bearer ' + token }
                            });
                            const data = await res.json();
                            
                            if (data?.driver_lat && data?.driver_lng) {
                                const driverLat = parseFloat(data.driver_lat);
                                const driverLng = parseFloat(data.driver_lng);
                                updateDriver(driverLat, driverLng);
                            }
                        } catch(err) {
                            console.error('Poll error:', err);
                        }
                    }
                    
                    async function updateDriver(driverLat, driverLng) {
                        if (!driverMarker) {
                            driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
                                .addTo(map)
                                .bindPopup('<strong>🚗 Driver on the way</strong>');
                            
                            const bounds = L.latLngBounds([driverLat, driverLng], [requestLat, requestLng]);
                            map.fitBounds(bounds, { padding: [60, 60] });
                        } else {
                            driverMarker.setLatLng([driverLat, driverLng]);
                        }
                        
                        await drawRoute(driverLat, driverLng, requestLat, requestLng);
                    }
                    
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
                                
                                const panel = document.getElementById('info-panel');
                                panel.innerHTML = '<strong>🚗 Driver Status</strong><br>Distance: ' + distance + ' km<br>ETA: ' + duration + ' min';
                            }
                        } catch(err) {
                            console.error('Route error:', err);
                        }
                    }
                    
                    initMap();
                    checkDriverLocation();
                    pollingInterval = setInterval(checkDriverLocation, POLL_INTERVAL_MS);
                </script>
            </body>
            </html>
        `;
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
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
                    {/* Sidebar - User Profile Card */}
                    <View style={styles.sidebar}>
                        <View style={styles.profileCard}>
                            <View style={styles.profileIcon}>
                                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
                            </View>
                            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                            <Text style={styles.userType}>{user?.role || 'Customer'}</Text>
                            
                            <View style={styles.divider} />
                            
                            <TouchableOpacity 
                                style={styles.navItem}
                                onPress={() => navigation.navigate('RequestForm')}
                            >
                                <Text style={styles.navItemText}>Request Assistance</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.navItem}
                                onPress={() => Alert.alert('Coming Soon', 'My Requests feature coming soon!')}
                            >
                                <Text style={styles.navItemText}>My Requests</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.navItem}
                                onPress={() => Alert.alert('Coming Soon', 'Profile Settings coming soon!')}
                            >
                                <Text style={styles.navItemText}>Profile Settings</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.navItem, styles.logoutItem]}
                                onPress={handleLogout}
                            >
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {/* Main Content */}
                    <View style={styles.mainContent}>
                        {/* Quick Actions Cards */}
                        <View style={styles.quickActions}>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Request Help</Text>
                                <Text style={styles.cardText}>Need immediate assistance?</Text>
                                <TouchableOpacity 
                                    style={styles.emergencyButton}
                                    onPress={() => navigation.navigate('RequestForm')}
                                >
                                    <Text style={styles.emergencyButtonText}>EMERGENCY HELP</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Active Requests</Text>
                                <Text style={styles.cardCount}>{activeRequestsCount}</Text>
                                <Text style={styles.cardText}>Currently active</Text>
                            </View>
                            
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Total Requests</Text>
                                <Text style={styles.cardCount}>{totalRequestsCount}</Text>
                                <Text style={styles.cardText}>All time</Text>
                            </View>
                        </View>
                        
                        {/* Map Section */}
                        <View style={styles.mapCard}>
                            <Text style={styles.mapTitle}>My Location</Text>
                            {hasActiveRequest && requestData ? (
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
                            ) : (
                                <View style={styles.noRequestContainer}>
                                    <Text style={styles.noRequestText}>No active request found</Text>
                                    <Text style={styles.noRequestSubtext}>
                                        Click "Request Assistance" to create a new service request
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.requestButton}
                                        onPress={() => navigation.navigate('RequestForm')}
                                    >
                                        <Text style={styles.requestButtonText}>Request Assistance</Text>
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
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    profileIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0066cc',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 15,
    },
    profileInitials: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
    },
    userType: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 15,
    },
    navItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    navItemText: {
        fontSize: 14,
        color: '#333',
    },
    logoutItem: {
        borderBottomWidth: 0,
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
    card: {
        flex: 1,
        minWidth: width >= 768 ? 180 : '100%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0066cc',
        marginBottom: 10,
    },
    cardText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    cardCount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 5,
    },
    emergencyButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 5,
    },
    emergencyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    mapCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    mapTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    mapContainer: {
        height: 400,
        borderRadius: 10,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
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
        marginBottom: 10,
    },
    noRequestSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    requestButton: {
        backgroundColor: '#0066cc',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    requestButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default DashboardScreen;