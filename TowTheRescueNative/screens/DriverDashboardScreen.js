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

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.0.104:3000'; // Change to your computer's IP
const DRIVER_LOCATION_INTERVAL_MS = 5000;
const POLL_INTERVAL_MS = 10000;

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
    const [isTracking, setIsTracking] = useState(false);
    const [locationStatus, setLocationStatus] = useState('Waiting for GPS...');
    
    const webViewRef = useRef(null);
    const locationInterval = useRef(null);
    const pollingInterval = useRef(null);
    const watchId = useRef(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        loadDashboard();
        
        // Handle app state changes
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        return () => {
            subscription.remove();
            stopLocationTracking();
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, []);

    const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active' && isTracking) {
            // App came to foreground, restart tracking
            startLocationTracking();
        } else if (nextAppState === 'background' && isTracking) {
            // App went to background, stop tracking (save battery)
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
                    
                    // Start polling for status updates
                    startPolling();
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

    const startLocationTracking = () => {
        if (watchId.current) return;
        
        setLocationStatus('Requesting location permission...');
        
        // Request permission
        Geolocation.requestAuthorization();
        
        // Start watching position
        watchId.current = Geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocationStatus(`GPS active: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                sendDriverLocation(latitude, longitude);
                
                // Update WebView with new location
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
        
        setIsTracking(true);
    };

    const stopLocationTracking = () => {
        if (watchId.current) {
            Geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsTracking(false);
        setLocationStatus('Location tracking stopped');
    };

    const startPolling = () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        
        pollingInterval.current = setInterval(async () => {
            if (!token) return;
            
            try {
                const response = await fetch(`${API_BASE_URL}/requests/latest`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data?.status === 'completed') {
                        Alert.alert(
                            'Job Completed',
                            'This job has been marked as completed. You will be redirected to the dashboard.',
                            [{ text: 'OK', onPress: () => loadDashboard() }]
                        );
                        stopLocationTracking();
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, POLL_INTERVAL_MS);
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

    const acceptJob = async () => {
        if (!activeRequestId) {
            Alert.alert('Error', 'No active job found');
            return;
        }

        Alert.alert(
            'Accept Job',
            'Do you want to accept this job?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_BASE_URL}/requests/${activeRequestId}/accept`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            const data = await response.json();

                            if (response.ok) {
                                Alert.alert('Success', 'Job accepted! Starting navigation...');
                                startLocationTracking();
                                loadRequestData(token);
                            } else {
                                Alert.alert('Error', data.message || 'Failed to accept job');
                            }
                        } catch (err) {
                            console.error('Accept job error:', err);
                            Alert.alert('Error', 'Failed to accept job');
                        }
                    }
                }
            ]
        );
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
                                Alert.alert('Success', 'Job completed!');
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
                <div id="info-panel" class="info-panel">Loading map...</div>
                
                <script>
                    let map, driverMarker, customerMarker, routeLayer;
                    let currentDriverLat = null;
                    let currentDriverLng = null;
                    
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
                        
                        const panel = document.getElementById('info-panel');
                        panel.innerHTML = '<strong>🚗 Job Info</strong><br>Service: ' + serviceType + '<br>Vehicle: ' + vehicleType + '<br>Waiting for GPS...';
                    }
                    
                    window.updateDriverLocation = function(lat, lng) {
                        currentDriverLat = lat;
                        currentDriverLng = lng;
                        
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
                                
                                const panel = document.getElementById('info-panel');
                                panel.innerHTML = '<strong>🚗 To Customer</strong><br>Distance: ' + distance + ' km<br>ETA: ' + duration + ' min<br>Service: ' + serviceType;
                                
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
                <Text style={styles.navbarBrand}>Tow the Rescue - Driver</Text>
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
                            <Text style={styles.profileName}>{user?.name || 'Driver'}</Text>
                            <Text style={styles.userType}>Driver</Text>
                            
                            <View style={styles.divider} />
                            
                            {/* GPS Status */}
                            <View style={styles.gpsStatus}>
                                <Text style={styles.gpsStatusText}>📍 {locationStatus}</Text>
                            </View>
                            
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
                                <Text style={styles.cardTitle}>Active Requests</Text>
                                <Text style={styles.cardCount}>{activeRequestsCount}</Text>
                                <Text style={styles.cardText}>Currently active</Text>
                            </View>
                            
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Total Jobs</Text>
                                <Text style={styles.cardCount}>{totalRequestsCount}</Text>
                                <Text style={styles.cardText}>All time</Text>
                            </View>
                        </View>
                        
                        {/* Map Section */}
                        <View style={styles.mapCard}>
                            <Text style={styles.mapTitle}>Driver Navigation</Text>
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
                                    <Text style={styles.noRequestText}>No active job found</Text>
                                    <Text style={styles.noRequestSubtext}>
                                        Waiting for new job assignments. Please check back later.
                                    </Text>
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
        fontSize: 18,
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
        backgroundColor: '#1D9E75',
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
        color: '#1D9E75',
        textAlign: 'center',
        marginBottom: 15,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 15,
    },
    gpsStatus: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    gpsStatusText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
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
        minWidth: width >= 768 ? 150 : '100%',
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0066cc',
        marginBottom: 10,
    },
    cardText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    cardCount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1D9E75',
        marginVertical: 5,
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
        marginBottom: 10,
    },
    noRequestSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
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