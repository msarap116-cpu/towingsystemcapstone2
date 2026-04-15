import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DrawerContent = ({ navigation }) => {
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
                        navigation.closeDrawer();
                        navigation.replace('Login'); // Changed from 'Home' to 'Login'
                    }
                }
            ]
        );
    };
    
    // Get user data from AsyncStorage
    const [user, setUser] = React.useState(null);
    
    React.useEffect(() => {
        loadUser();
    }, []);
    
    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
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
    
    return (
        <View style={styles.drawerContainer}>
            <View style={styles.profileSection}>
                <View style={styles.profileIcon}>
                    <Text style={styles.profileInitials}>{getUserInitials()}</Text>
                </View>
                <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                <Text style={styles.userType}>{user?.role || 'Customer'}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                    navigation.navigate('Dashboard');
                    navigation.closeDrawer();
                }}
            >
                <Text style={styles.activeDrawerText}>Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                    navigation.navigate('RequestForm');
                    navigation.closeDrawer();
                }}
            >
                <Text style={styles.drawerText}>Request</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                    Alert.alert('Coming Soon', 'My Vehicles feature coming soon!');
                    navigation.closeDrawer();
                }}
            >
                <Text style={styles.drawerText}>My Vehicles</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                    Alert.alert('Coming Soon', 'Profile Settings coming soon!');
                    navigation.closeDrawer();
                }}
            >
                <Text style={styles.drawerText}>Profile Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.drawerItem, styles.logoutItem]}
                onPress={handleLogout}
            >
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        paddingTop: 60,
        backgroundColor: '#fff',
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    profileIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0066cc',
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
        color: '#666',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 10,
    },
    drawerItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    activeDrawerText: {
        fontSize: 16,
        color: '#0066cc',
        fontWeight: 'bold',
    },
    drawerText: {
        fontSize: 16,
        color: '#333',
    },
    logoutItem: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    logoutText: {
        fontSize: 16,
        color: '#dc3545',
    },
});

export default DrawerContent;