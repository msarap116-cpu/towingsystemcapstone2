import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    Alert,
    StatusBar,
    Dimensions,
    Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        const token = await AsyncStorage.getItem('token');
        setIsLoggedIn(!!token);
    };

    const handleRequestHelp = () => {
        if (isLoggedIn) {
            navigation.navigate('RequestForm');
        } else {
            Alert.alert(
                'Login Required',
                'Please login or register to request assistance',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => navigation.navigate('Login') },
                    { text: 'Register', onPress: () => navigation.navigate('Register') }
                ]
            );
        }
    };

    const handleHowItWorks = () => {
        setModalVisible(true);
    };

    const openExternalLink = (url) => {
        Linking.openURL(url).catch(err => 
            Alert.alert('Error', 'Could not open link')
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor="#0066cc" />
            
            {/* Header/Navigation */}
            <View style={styles.navbar}>
                <View style={styles.navContainer}>
                    <Text style={styles.navbarBrand}>Tow The Rescue</Text>
                    
                    <View style={styles.navMenu}>
                        <TouchableOpacity onPress={() => {
                            const scrollView = ScrollView.prototype;
                            // Scroll to services section
                        }}>
                            <Text style={styles.navLink}>Services</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleHowItWorks}>
                            <Text style={styles.navLink}>How It Works</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>Tow the Rescue</Text>
                <Text style={styles.heroSubtitle}>Help is just a click away</Text>
                
                <TouchableOpacity 
                    style={styles.btnDanger}
                    onPress={handleRequestHelp}
                    activeOpacity={0.9}
                >
                    <Text style={styles.btnDangerText}>REQUEST HELP NOW</Text>
                </TouchableOpacity>

                <View style={styles.heroButtons}>
                    <TouchableOpacity 
                        style={styles.btnOutline}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.btnOutlineText}>Register</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.btnOutline}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.btnOutlineText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </View>

        

            {/* How It Works Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity 
                            style={styles.closeBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.modalTitle}>How Towing Assistance Works</Text>
                        
                        <View style={styles.stepsList}>
                            <View style={styles.stepItem}>
                                <Text style={styles.stepNumber}>1</Text>
                                <Text style={styles.stepText}>User requests towing service through the app</Text>
                            </View>
                            <View style={styles.stepItem}>
                                <Text style={styles.stepNumber}>2</Text>
                                <Text style={styles.stepText}>User enables location or manually enters address</Text>
                            </View>
                            <View style={styles.stepItem}>
                                <Text style={styles.stepNumber}>3</Text>
                                <Text style={styles.stepText}>System captures location and assigns driver/mechanic</Text>
                            </View>
                            <View style={styles.stepItem}>
                                <Text style={styles.stepNumber}>4</Text>
                                <Text style={styles.stepText}>Driver navigates to user's location</Text>
                            </View>
                            <View style={styles.stepItem}>
                                <Text style={styles.stepNumber}>5</Text>
                                <Text style={styles.stepText}>Assistance provided and job status updated</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    navbar: {
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    navbarBrand: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#D85A30',
    },
    navMenu: {
        flexDirection: 'row',
    },
    navLink: {
        fontSize: 16,
        color: '#333',
        marginLeft: 20,
        fontWeight: '500',
    },
    hero: {
        backgroundColor: '#0066cc',
        paddingVertical: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    heroSubtitle: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.9,
    },
    btnDanger: {
        backgroundColor: '#D85A30',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 50,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    btnDangerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    heroButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
    },
    btnOutline: {
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#fff',
        marginHorizontal: 5,
    },
    btnOutlineText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    servicesSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    serviceCard: {
        width: width / 2 - 30,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    serviceIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    serviceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    serviceDesc: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        width: width - 40,
        maxHeight: height * 0.8,
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    closeBtnText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    stepsList: {
        marginTop: 10,
    },
    stepItem: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#D85A30',
        color: '#fff',
        textAlign: 'center',
        textAlignVertical: 'center',
        fontWeight: 'bold',
        marginRight: 15,
        overflow: 'hidden',
        lineHeight: 30,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
});

export default HomeScreen;