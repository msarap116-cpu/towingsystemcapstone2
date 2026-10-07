// screens/MyVehiclesScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Switch,
    Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MyVehiclesScreen = ({ navigation, route }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        vehicle_type: '',
        make: '',
        model: '',
        color: '',
        year: '',
        license_plate: '',
        is_default: false,
    });

    const vehicleTypes = [
        { label: 'Select Type', value: '' },
        { label: 'Pick up', value: 'pick up' },
        { label: 'Mini Van', value: 'mini van' },
        { label: 'Van', value: 'van' },
        { label: 'Truck', value: 'truck' },
        { label: 'SUV', value: 'suv' },
        { label: 'Other', value: 'other' },
    ];

useFocusEffect(
    useCallback(() => {
        loadVehicles();
    }, [])
);

// Auto-open the Add Vehicle modal when navigated with openAddForm param
useEffect(() => {
    if (route?.params?.openAddForm) {
        setShowForm(true);
        navigation.setParams({ openAddForm: false });
    }
}, [route?.params?.openAddForm, navigation]);

    const loadVehicles = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                navigation.replace('Login');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (response.ok) {
                setVehicles(data.vehicles || []);
            } else {
                Alert.alert('Error', data.error || 'Failed to load vehicles');
            }
        } catch (error) {
            console.error('loadVehicles error:', error);
            Alert.alert('Network Error', 'Cannot load your vehicles.');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setFormData({
            vehicle_type: '',
            make: '',
            model: '',
            color: '',
            year: '',
            license_plate: '',
            is_default: false,
        });
    };

    const validateForm = () => {
        if (!formData.vehicle_type) {
            Alert.alert('Error', 'Please select a vehicle type');
            return false;
        }
        if (!formData.make.trim()) {
            Alert.alert('Error', 'Please enter the make');
            return false;
        }
        if (!formData.model.trim()) {
            Alert.alert('Error', 'Please enter the model');
            return false;
        }
        if (!formData.color.trim()) {
            Alert.alert('Error', 'Please enter the color');
            return false;
        }
        if (!formData.license_plate.trim()) {
            Alert.alert('Error', 'Please enter the license plate');
            return false;
        }
        return true;
    };

    const handleAddVehicle = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('token');

            const payload = {
                vehicle_type: formData.vehicle_type,
                make: formData.make.trim(),
                model: formData.model.trim(),
                color: formData.color.trim(),
                year: formData.year ? parseInt(formData.year, 10) : null,
                license_plate: formData.license_plate.trim(),
                is_default: formData.is_default,
            };

            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'Vehicle added successfully!');
                resetForm();
                setShowForm(false);
                loadVehicles();
            } else {
                Alert.alert('Error', data.error || 'Failed to add vehicle');
            }
        } catch (error) {
            console.error('handleAddVehicle error:', error);
            Alert.alert('Network Error', 'Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const setDefaultVehicle = async (vehicleId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/vehicles/${vehicleId}/default`,
                {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await response.json();

            if (response.ok) {
                loadVehicles();
            } else {
                Alert.alert('Error', data.error || 'Failed to set default vehicle');
            }
        } catch (error) {
            console.error('setDefaultVehicle error:', error);
            Alert.alert('Network Error', 'Please try again.');
        }
    };

    const deleteVehicle = (vehicleId) => {
        Alert.alert(
            'Remove Vehicle',
            'Are you sure you want to remove this vehicle?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => confirmDelete(vehicleId),
                },
            ]
        );
    };

    const confirmDelete = async (vehicleId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/vehicles/${vehicleId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await response.json();

            if (response.ok) {
                loadVehicles();
            } else {
                Alert.alert('Error', data.error || 'Failed to delete vehicle');
            }
        } catch (error) {
            console.error('deleteVehicle error:', error);
            Alert.alert('Network Error', 'Please try again.');
        }
    };

const renderVehicleCard = (vehicle) => (
    <View
        key={String(vehicle.vehicle_id)}
        style={[
            styles.vehicleCard,
            vehicle.is_default && styles.vehicleCardDefault,
        ]}
    >
        <View style={styles.vehicleInfo}>
            <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleTitle}>
                    {`${vehicle.make} ${vehicle.model} (${vehicle.year || 'N/A'})`}
                </Text>
                {vehicle.is_default ? (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                ) : null}
            </View>
            <Text style={styles.vehicleDetails}>
                {`${vehicle.vehicle_type} • ${vehicle.color} • Plate: ${vehicle.license_plate}`}
            </Text>
        </View>

        <View style={styles.vehicleActions}>
            {!vehicle.is_default ? (
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setDefaultVehicle(vehicle.vehicle_id)}
                >
                    <Icon name="star-outline" size={16} color="#0d6efd" />
                    <Text style={styles.actionBtnText}>Set Default</Text>
                </TouchableOpacity>
            ) : null}

            <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => deleteVehicle(vehicle.vehicle_id)}
            >
                <Icon name="trash-can-outline" size={16} color="#dc3545" />
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
                    Delete
                </Text>
            </TouchableOpacity>
        </View>
    </View>
);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0d6efd" />

            {/* Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.navbarTitle}>My Vehicles</Text>
                <TouchableOpacity onPress={() => setShowForm(true)}>
                    <Icon name="plus" size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Your Saved Vehicles</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 40 }} />
                ) : vehicles.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="car-off" size={60} color="#adb5bd" />
                        <Text style={styles.emptyTitle}>No vehicles yet</Text>
                        <Text style={styles.emptyText}>
                            Add your first vehicle to start requesting roadside assistance.
                        </Text>
                        <TouchableOpacity
                            style={styles.addFirstBtn}
                            onPress={() => setShowForm(true)}
                        >
                            <Text style={styles.addFirstBtnText}>Add Vehicle</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    vehicles.map(renderVehicleCard)
                )}
            </ScrollView>

            {/* Add Vehicle Modal */}
            <Modal
                visible={showForm}
                transparent
                animationType="slide"
                onRequestClose={() => setShowForm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Vehicle</Text>
                            <TouchableOpacity onPress={() => setShowForm(false)}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Vehicle Type */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Vehicle Type</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={formData.vehicle_type}
                                        onValueChange={(v) => updateField('vehicle_type', v)}
                                        style={styles.picker}
                                        dropdownIconColor="#000"
                                    >
                                        {vehicleTypes.map((t) => (
                                            <Picker.Item
                                                key={t.value}
                                                label={t.label}
                                                value={t.value}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            {/* Make */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Make</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Toyota"
                                    value={formData.make}
                                    onChangeText={(v) => updateField('make', v)}
                                />
                            </View>

                            {/* Model */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Model</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Vios"
                                    value={formData.model}
                                    onChangeText={(v) => updateField('model', v)}
                                />
                            </View>

                            {/* Color */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Color</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. White"
                                    value={formData.color}
                                    onChangeText={(v) => updateField('color', v)}
                                />
                            </View>

                            {/* Year */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Year</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 2020"
                                    keyboardType="numeric"
                                    maxLength={4}
                                    value={formData.year}
                                    onChangeText={(v) => updateField('year', v)}
                                />
                            </View>

                            {/* License Plate */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>License Plate </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. ABC 1234"
                                    autoCapitalize="characters"
                                    value={formData.license_plate}
                                    onChangeText={(v) => updateField('license_plate', v)}
                                />
                            </View>

                            {/* Is Default */}
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Set as default vehicle</Text>
                                <Switch
                                    value={formData.is_default}
                                    onValueChange={(v) => updateField('is_default', v)}
                                    trackColor={{ false: '#ccc', true: '#8fbcff' }}
                                    thumbColor={formData.is_default ? '#0d6efd' : '#f4f3f4'}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    submitting && styles.submitBtnDisabled,
                                ]}
                                onPress={handleAddVehicle}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Add Vehicle</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};


export default MyVehiclesScreen;

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaeef2',
    },
    navbar: {
        backgroundColor: '#0d6efd',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navbarTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#212529',
        marginBottom: 16,
    },

    /* Vehicle Card */
    vehicleCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 1,
    },
    vehicleCardDefault: {
        borderColor: '#0d6efd',
        borderWidth: 2,
    },
    vehicleInfo: {
        marginBottom: 12,
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    vehicleTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#212529',
        marginRight: 8,
    },
    defaultBadge: {
        backgroundColor: '#0d6efd',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    defaultBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    vehicleDetails: {
        fontSize: 13,
        color: '#6c757d',
    },
    vehicleActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#0d6efd',
        gap: 4,
    },
    actionBtnText: {
        color: '#0d6efd',
        fontSize: 13,
        fontWeight: '600',
    },
    actionBtnDanger: {
        borderColor: '#dc3545',
    },
    actionBtnTextDanger: {
        color: '#dc3545',
    },

    /* Empty State */
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#495057',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    addFirstBtn: {
        backgroundColor: '#0d6efd',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 8,
    },
    addFirstBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },

    /* Modal */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        flexShrink: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212529',
    },
    modalScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    modalScrollContent: {
        padding: 16,
        paddingBottom: 40,
    },

    /* Form */
    formGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#343a40',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#212529',
        backgroundColor: '#fff',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    picker: {
        color: '#212529',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 8,
    },
    submitBtn: {
        backgroundColor: '#0d6efd',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    submitBtnDisabled: {
        backgroundColor: '#8fbcff',
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});