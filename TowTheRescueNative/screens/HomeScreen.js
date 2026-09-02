import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    StatusBar,
    SafeAreaView,
    Dimensions,
    Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            setIsLoggedIn(!!token);
        } catch (error) {
            console.error('Check login error:', error);
        }
    };

    const handleGetStarted = () => {
        if (isLoggedIn) {
            navigation.navigate('Dashboard');
        } else {
            navigation.navigate('Login');
        }
    };

    const handleRegister = () => {
        navigation.navigate('Register');
    };

    const handleLogin = () => {
        navigation.navigate('Login');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0a2b3e" />

            {/* ========== NAVBAR ========== */}
            <View style={styles.navbar}>
                <View style={styles.navbarBrand}>
                    <View style={styles.brandIcon}>
                        <Text style={styles.brandIconText}>🎉</Text>
                    </View>
                    <Text style={styles.navbarBrandText}>GoodWrench</Text>
                </View>
                <View style={styles.navLinks}>
                    <TouchableOpacity style={styles.navLink}>
                        <Text style={styles.navLinkText}>Services</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navLink}>
                        <Text style={styles.navLinkText}>How It Works</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ========== HERO SECTION ========== */}
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>GoodWrench</Text>
                        <Text style={styles.heroSubtitle}>Help is just a click away</Text>

                        <TouchableOpacity
                            style={styles.heroButton}
                            onPress={handleGetStarted}
                        >
                            <Text style={styles.heroButtonText}>REQUEST HELP NOW</Text>
                            <Icon name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Hero Illustration */}
                    <View style={styles.heroIllustration}>
                        <View style={styles.illustrationCircle}>
                            <Text style={styles.illustrationEmoji}>🚛</Text>
                        </View>
                        <View style={styles.illustrationBadge}>
                            <Text style={styles.illustrationBadgeText}>24/7</Text>
                        </View>
                    </View>
                </View>

                {/* ========== STATS SECTION ========== */}
                <View style={styles.statsSection}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>500+</Text>
                        <Text style={styles.statLabel}>Rescues Completed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>4.9</Text>
                        <Text style={styles.statLabel}>Average Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>15min</Text>
                        <Text style={styles.statLabel}>Average Response</Text>
                    </View>
                </View>

                {/* ========== SERVICES SECTION ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Our Services</Text>
                    <Text style={styles.sectionSubtitle}>Professional assistance when you need it most</Text>

                    <View style={styles.servicesGrid}>
                        <View style={styles.serviceCard}>
                            <View style={styles.serviceIcon}>
                                <Text style={styles.serviceIconText}>🚛</Text>
                            </View>
                            <Text style={styles.serviceTitle}>Towing</Text>
                            <Text style={styles.serviceDesc}>Professional towing for any vehicle</Text>
                        </View>

                        <View style={styles.serviceCard}>
                            <View style={styles.serviceIcon}>
                                <Text style={styles.serviceIconText}>🔋</Text>
                            </View>
                            <Text style={styles.serviceTitle}>Jumpstart</Text>
                            <Text style={styles.serviceDesc}>Battery jumpstart services</Text>
                        </View>

                        <View style={styles.serviceCard}>
                            <View style={styles.serviceIcon}>
                                <Text style={styles.serviceIconText}>🛞</Text>
                            </View>
                            <Text style={styles.serviceTitle}>Tire Change</Text>
                            <Text style={styles.serviceDesc}>Quick tire replacement</Text>
                        </View>

                        <View style={styles.serviceCard}>
                            <View style={styles.serviceIcon}>
                                <Text style={styles.serviceIconText}>⛽</Text>
                            </View>
                            <Text style={styles.serviceTitle}>Fuel Delivery</Text>
                            <Text style={styles.serviceDesc}>Emergency fuel delivery</Text>
                        </View>
                    </View>
                </View>

                {/* ========== HOW IT WORKS ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>maybe it is working</Text>
                    <Text style={styles.sectionSubtitle}>twertergf</Text>

                    <View style={styles.stepsContainer}>
                        <View style={styles.stepItem}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Request Help</Text>
                                <Text style={styles.stepDesc}>Send your location and service needed</Text>
                            </View>
                        </View>

                        <View style={styles.stepConnector} />

                        <View style={styles.stepItem}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Driver Assigned</Text>
                                <Text style={styles.stepDesc}>Nearest driver accepts your request</Text>
                            </View>
                        </View>

                        <View style={styles.stepConnector} />

                        <View style={styles.stepItem}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Rescue Completed</Text>
                                <Text style={styles.stepDesc}>Track your driver and get help fast</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ========== CTA SECTION ========== */}
                <View style={styles.ctaSection}>
                    <Text style={styles.ctaTitle}>Ready to get help?</Text>
                    <Text style={styles.ctaSubtitle}>Join thousands of satisfied customers</Text>

                    <View style={styles.ctaButtons}>
                        {!isLoggedIn && (
                            <>
                                <TouchableOpacity
                                    style={styles.ctaPrimaryButton}
                                    onPress={handleRegister}
                                >
                                    <Text style={styles.ctaPrimaryButtonText}>Register</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.ctaSecondaryButton}
                                    onPress={handleLogin}
                                >
                                    <Text style={styles.ctaSecondaryButtonText}>Login</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {isLoggedIn && (
                            <TouchableOpacity
                                style={styles.ctaPrimaryButton}
                                onPress={() => navigation.navigate('Dashboard')}
                            >
                                <Text style={styles.ctaPrimaryButtonText}>Go to Dashboard</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ========== FOOTER ========== */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 GoodWrench. All rights reserved.</Text>
                    <View style={styles.footerLinks}>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Privacy</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerDot}>·</Text>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Terms</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerDot}>·</Text>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Support</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f9',
    },
    // ========== NAVBAR ==========
    navbar: {
        backgroundColor: '#0a2b3e',
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    navbarBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brandIcon: {
        width: 36,
        height: 36,
        backgroundColor: '#ff8c42',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandIconText: {
        fontSize: 18,
        color: '#fff',
    },
    navbarBrandText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
    },
    navLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    navLink: {
        paddingVertical: 4,
    },
    navLinkText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
    },
    // ========== SCROLL CONTENT ==========
    scrollContent: {
        flexGrow: 1,
    },
    // ========== HERO SECTION ==========
    heroSection: {
        backgroundColor: '#0a2b3e',
        paddingHorizontal: 24,
        paddingVertical: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: height * 0.35,
    },
    heroContent: {
        flex: 1,
        paddingRight: 16,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 24,
        fontWeight: '400',
    },
    heroButton: {
        backgroundColor: '#ff8c42',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'flex-start',
        elevation: 4,
        shadowColor: '#ff8c42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    heroButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    heroIllustration: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    illustrationCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    illustrationEmoji: {
        fontSize: 56,
    },
    illustrationBadge: {
        position: 'absolute',
        bottom: -8,
        right: -8,
        backgroundColor: '#ff8c42',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#0a2b3e',
    },
    illustrationBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    // ========== STATS SECTION ==========
    statsSection: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 20,
    marginTop: -24,
        borderRadius: 16,
        paddingVertical: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#eef2f6',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6c86a3',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#eef2f6',
    },
    // ========== SERVICES SECTION ==========
    section: {
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 16,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6c86a3',
        textAlign: 'center',
        marginBottom: 24,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    serviceCard: {
        flex: 1,
        minWidth: (width - 52) / 2,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eef2f6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    serviceIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f0f4f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    serviceIconText: {
        fontSize: 28,
    },
    serviceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
    },
    serviceDesc: {
        fontSize: 12,
        color: '#6c86a3',
        textAlign: 'center',
    },
    // ========== HOW IT WORKS ==========
    stepsContainer: {
        paddingHorizontal: 4,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
    stepNumber: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ff8c42',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 13,
        color: '#6c86a3',
    },
    stepConnector: {
        width: 2,
        height: 24,
        backgroundColor: '#eef2f6',
        marginLeft: 19,
    },
    // ========== CTA SECTION ==========
    ctaSection: {
        backgroundColor: '#0a2b3e',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    ctaTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    ctaSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 20,
    },
    ctaButtons: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    ctaPrimaryButton: {
        backgroundColor: '#ff8c42',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 40,
        minWidth: 120,
        alignItems: 'center',
    },
    ctaPrimaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    ctaSecondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        minWidth: 120,
        alignItems: 'center',
    },
    ctaSecondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // ========== FOOTER ==========
    footer: {
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    footerLink: {
        fontSize: 12,
        color: '#6c86a3',
        fontWeight: '500',
    },
    footerDot: {
        color: '#dce5f0',
        fontSize: 12,
    },
});

export default HomeScreen;