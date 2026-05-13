import React, { useState, useEffect, useCallback } from 'react';
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
    TextInput,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.0.104:3000'; // Change to your computer's IP

const AdminDashboardScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    
    // Statistics
    const [stats, setStats] = useState({
        totalRequests: 0,
        activeRequests: 0,
        pendingRequests: 0,
        totalUsers: 0
    });
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'users'
    
    // Modals
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteType, setDeleteType] = useState(null); // 'request' or 'user'
    
    // Form data
    const [requestForm, setRequestForm] = useState({
        id: null,
        customer_name: '',
        customer_phone: '',
        service_type: '',
        location: '',
        status: 'pending',
        description: ''
    });
    
    const [userForm, setUserForm] = useState({
        id: null,
        name: '',
        email: '',
        phone: '',
        role: 'customer'
    });

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('user');
            
            if (!token || !userData) {
                navigation.replace('Login');
                return;
            }
            
            const parsedUser = JSON.parse(userData);
            if (parsedUser.role?.toLowerCase() !== 'admin') {
                Alert.alert('Access Denied', 'You do not have admin access', [
                    { text: 'OK', onPress: () => navigation.replace('Dashboard') }
                ]);
                return;
            }
            
            setUser(parsedUser);
            await loadData();
            
        } catch (error) {
            console.error('Check admin error:', error);
            navigation.replace('Login');
        }
    };

    const loadData = async () => {
        try {
            await Promise.all([
                fetchRequests(),
                fetchUsers()
            ]);
        } catch (error) {
            console.error('Load data error:', error);
            Alert.alert('Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/admin/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const requestsData = data.requests || data;
                setRequests(requestsData);
                applyFilters(requestsData, statusFilter, serviceFilter, searchTerm);
                updateStatistics(requestsData);
            }
        } catch (error) {
            console.error('Fetch requests error:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const usersData = await response.json();
                setUsers(usersData);
                applyUserFilters(usersData, userSearchTerm);
                updateStatistics(usersData, 'users');
            }
        } catch (error) {
            console.error('Fetch users error:', error);
        }
    };

    const updateStatistics = (data, type = 'requests') => {
        if (type === 'requests') {
            const total = data.length;
            const active = data.filter(r => r.status === 'active' || r.status === 'accepted' || r.status === 'en_route').length;
            const pending = data.filter(r => r.status === 'pending').length;
            setStats(prev => ({ ...prev, totalRequests: total, activeRequests: active, pendingRequests: pending }));
        } else if (type === 'users') {
            setStats(prev => ({ ...prev, totalUsers: data.length }));
        }
    };

    const applyFilters = (requestsData, status, service, search) => {
        let filtered = [...requestsData];
        
        if (status) {
            filtered = filtered.filter(r => r.status === status);
        }
        if (service) {
            filtered = filtered.filter(r => r.service_type === service);
        }
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(r => 
                (r.customer_name?.toLowerCase().includes(term)) ||
                (r.location?.toLowerCase().includes(term)) ||
                (r.description?.toLowerCase().includes(term))
            );
        }
        
        setFilteredRequests(filtered);
        setCurrentPage(1);
    };

    const applyUserFilters = (usersData, search) => {
        let filtered = [...usersData];
        
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(u => 
                u.name?.toLowerCase().includes(term) ||
                u.email?.toLowerCase().includes(term) ||
                u.phone?.toLowerCase().includes(term) ||
                u.role?.toLowerCase().includes(term)
            );
        }
        
        setFilteredUsers(filtered);
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        applyFilters(requests, status, serviceFilter, searchTerm);
    };

    const handleServiceFilter = (service) => {
        setServiceFilter(service);
        applyFilters(requests, statusFilter, service, searchTerm);
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        applyFilters(requests, statusFilter, serviceFilter, text);
    };

    const handleUserSearch = (text) => {
        setUserSearchTerm(text);
        applyUserFilters(users, text);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getUserInitials = () => {
        if (!user?.name) return 'A';
        return user.name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatServiceType = (type) => {
        const types = {
            'towing': 'Towing',
            'jumpstart': 'Jump Start',
            'tire': 'Tire Change',
            'fuel': 'Fuel Delivery',
            'lockout': 'Lockout',
            'flat_tire': 'Flat Tire'
        };
        return types[type] || type || 'N/A';
    };

    const formatStatus = (status) => {
        const statusColors = {
            pending: '#856404',
            active: '#004085',
            accepted: '#004085',
            en_route: '#004085',
            completed: '#155724',
            cancelled: '#721c24'
        };
        return { text: status?.toUpperCase() || 'UNKNOWN', color: statusColors[status] || '#666' };
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const openAddRequestModal = () => {
        setRequestForm({
            id: null,
            customer_name: '',
            customer_phone: '',
            service_type: '',
            location: '',
            status: 'pending',
            description: ''
        });
        setRequestModalVisible(true);
    };

    const openEditRequestModal = (request) => {
        setRequestForm({
            id: request.id,
            customer_name: request.customer_name || '',
            customer_phone: request.customer_phone || '',
            service_type: request.service_type || '',
            location: request.location || '',
            status: request.status || 'pending',
            description: request.description || ''
        });
        setRequestModalVisible(true);
    };

    const openViewModal = (request) => {
        setSelectedRequest(request);
        setViewModalVisible(true);
    };

    const openAddUserModal = () => {
        setUserForm({
            id: null,
            name: '',
            email: '',
            phone: '',
            role: 'customer'
        });
        setUserModalVisible(true);
    };

    const openEditUserModal = (user) => {
        setUserForm({
            id: user.user_id || user.id,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'customer'
        });
        setUserModalVisible(true);
    };

    const confirmDelete = (id, type) => {
        setDeleteId(id);
        setDeleteType(type);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        
        try {
            const token = await AsyncStorage.getItem('token');
            const endpoint = deleteType === 'request' 
                ? `${API_BASE_URL}/admin/requests/${deleteId}`
                : `${API_BASE_URL}/api/users/${deleteId}`;
            
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                Alert.alert('Success', `${deleteType === 'request' ? 'Request' : 'User'} deleted successfully`);
                await loadData();
            } else {
                Alert.alert('Error', `Failed to delete ${deleteType}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', 'Network error');
        } finally {
            setDeleteModalVisible(false);
            setDeleteId(null);
            setDeleteType(null);
        }
    };

    const saveRequest = async () => {
        if (!requestForm.customer_name || !requestForm.service_type || !requestForm.location) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }
        
        try {
            const token = await AsyncStorage.getItem('token');
            const url = requestForm.id 
                ? `${API_BASE_URL}/admin/requests/${requestForm.id}`
                : `${API_BASE_URL}/admin/requests`;
            const method = requestForm.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestForm)
            });
            
            if (response.ok) {
                Alert.alert('Success', requestForm.id ? 'Request updated' : 'Request created');
                setRequestModalVisible(false);
                await loadData();
            } else {
                Alert.alert('Error', 'Failed to save request');
            }
        } catch (error) {
            console.error('Save request error:', error);
            Alert.alert('Error', 'Network error');
        }
    };

    const saveUser = async () => {
        if (!userForm.name || !userForm.email || !userForm.phone) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }
        
        try {
            const token = await AsyncStorage.getItem('token');
            const url = userForm.id 
                ? `${API_BASE_URL}/api/users/${userForm.id}`
                : `${API_BASE_URL}/api/users`;
            const method = userForm.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userForm)
            });
            
            if (response.ok) {
                Alert.alert('Success', userForm.id ? 'User updated' : 'User created');
                setUserModalVisible(false);
                await loadData();
            } else {
                Alert.alert('Error', 'Failed to save user');
            }
        } catch (error) {
            console.error('Save user error:', error);
            Alert.alert('Error', 'Network error');
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
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
        ]);
    };

    const renderRequestItem = ({ item }) => {
        const status = formatStatus(item.status);
        return (
            <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.idCell]}>#{item.id}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{item.customer_name || 'N/A'}</Text>
                <Text style={styles.tableCell}>{formatServiceType(item.service_type)}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{item.location?.substring(0, 20)}</Text>
                <View style={styles.tableCell}>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                    </View>
                </View>
                <View style={[styles.tableCell, styles.actionCell]}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openViewModal(item)}>
                        <Text style={[styles.actionText, styles.viewText]}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openEditRequestModal(item)}>
                        <Text style={[styles.actionText, styles.editText]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(item.id, 'request')}>
                        <Text style={[styles.actionText, styles.deleteText]}>Del</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderUserItem = ({ item }) => (
        <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.idCell]}>#{item.user_id || item.id}</Text>
            <Text style={styles.tableCell}>{item.name}</Text>
            <Text style={styles.tableCell}>{item.email}</Text>
            <Text style={styles.tableCell}>{item.phone}</Text>
            <Text style={styles.tableCell}>
                <View style={[styles.roleBadge, item.role === 'admin' && styles.adminBadge]}>
                    <Text style={styles.roleText}>{item.role?.toUpperCase()}</Text>
                </View>
            </Text>
            <View style={[styles.tableCell, styles.actionCell]}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openEditUserModal(item)}>
                    <Text style={[styles.actionText, styles.editText]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(item.user_id || item.id, 'user')}>
                    <Text style={[styles.actionText, styles.deleteText]}>Del</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const getPaginatedData = () => {
        const data = activeTab === 'requests' ? filteredRequests : filteredUsers;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return data.slice(start, end);
    };

    const totalPages = Math.ceil(
        (activeTab === 'requests' ? filteredRequests.length : filteredUsers.length) / itemsPerPage
    );

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
                <Text style={styles.navbarBrand}>Tow the Rescue - Admin</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Text style={styles.viewSiteText}>View Site</Text>
                </TouchableOpacity>
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
                        <View style={styles.profileCard}>
                            <View style={styles.profileIcon}>
                                <Text style={styles.profileInitials}>{getUserInitials()}</Text>
                            </View>
                            <Text style={styles.profileName}>{user?.name || 'Admin'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'admin@towrescue.com'}</Text>
                            
                            <View style={styles.divider} />
                            
                            <TouchableOpacity 
                                style={[styles.navItem, activeTab === 'requests' && styles.activeNavItem]}
                                onPress={() => setActiveTab('requests')}
                            >
                                <Text style={[styles.navItemText, activeTab === 'requests' && styles.activeNavText]}>
                                    Dashboard
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.navItem, activeTab === 'users' && styles.activeNavItem]}
                                onPress={() => setActiveTab('users')}
                            >
                                <Text style={[styles.navItemText, activeTab === 'users' && styles.activeNavText]}>
                                    Manage Users
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.navItem}
                                onPress={() => Alert.alert('Coming Soon', 'Reports feature coming soon!')}
                            >
                                <Text style={styles.navItemText}>Reports</Text>
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
                        {/* Statistics Cards */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statNumber}>{stats.totalRequests}</Text>
                                <Text style={styles.statLabel}>Total Requests</Text>
                            </View>
                            <View style={[styles.statCard, styles.statCardActive]}>
                                <Text style={styles.statNumber}>{stats.activeRequests}</Text>
                                <Text style={styles.statLabel}>Active Requests</Text>
                            </View>
                            <View style={[styles.statCard, styles.statCardPending]}>
                                <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
                                <Text style={styles.statLabel}>Pending</Text>
                            </View>
                            <View style={[styles.statCard, styles.statCardUsers]}>
                                <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                                <Text style={styles.statLabel}>Total Users</Text>
                            </View>
                        </View>
                        
                        {activeTab === 'requests' ? (
                            <>
                                {/* Action Bar */}
                                <View style={styles.actionBar}>
                                    <Text style={styles.sectionTitle}>Manage Requests</Text>
                                    <TouchableOpacity style={styles.addButton} onPress={openAddRequestModal}>
                                        <Text style={styles.addButtonText}>+ New Request</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                {/* Filters */}
                                <View style={styles.filtersRow}>
                                    <TextInput
                                        style={styles.searchBox}
                                        placeholder="Search requests..."
                                        value={searchTerm}
                                        onChangeText={handleSearch}
                                    />
                                    <View style={styles.filterGroup}>
                                        <TouchableOpacity 
                                            style={[styles.filterButton, !statusFilter && styles.activeFilter]}
                                            onPress={() => handleStatusFilter('')}
                                        >
                                            <Text style={styles.filterText}>All</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.filterButton, statusFilter === 'pending' && styles.activeFilter]}
                                            onPress={() => handleStatusFilter('pending')}
                                        >
                                            <Text style={styles.filterText}>Pending</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.filterButton, statusFilter === 'active' && styles.activeFilter]}
                                            onPress={() => handleStatusFilter('active')}
                                        >
                                            <Text style={styles.filterText}>Active</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.filterButton, statusFilter === 'completed' && styles.activeFilter]}
                                            onPress={() => handleStatusFilter('completed')}
                                        >
                                            <Text style={styles.filterText}>Completed</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                
                                {/* Requests Table */}
                                {filteredRequests.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No requests found</Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.tableContainer}>
                                            <View style={styles.tableHeader}>
                                                <Text style={[styles.headerCell, styles.idCell]}>ID</Text>
                                                <Text style={styles.headerCell}>Customer</Text>
                                                <Text style={styles.headerCell}>Service</Text>
                                                <Text style={styles.headerCell}>Location</Text>
                                                <Text style={styles.headerCell}>Status</Text>
                                                <Text style={[styles.headerCell, styles.actionHeader]}>Actions</Text>
                                            </View>
                                            <FlatList
                                                data={getPaginatedData()}
                                                renderItem={renderRequestItem}
                                                keyExtractor={(item, index) => `request-${item.id || index}`}
                                                scrollEnabled={false}
                                            />
                                        </View>
                                        
                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <View style={styles.pagination}>
                                                <TouchableOpacity 
                                                    style={[styles.pageButton, currentPage === 1 && styles.pageDisabled]}
                                                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <Text style={styles.pageText}>Previous</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.pageInfo}>{currentPage} / {totalPages}</Text>
                                                <TouchableOpacity 
                                                    style={[styles.pageButton, currentPage === totalPages && styles.pageDisabled]}
                                                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    <Text style={styles.pageText}>Next</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Users Management */}
                                <View style={styles.actionBar}>
                                    <Text style={styles.sectionTitle}>Manage Users</Text>
                                    <TouchableOpacity style={styles.addButton} onPress={openAddUserModal}>
                                        <Text style={styles.addButtonText}>+ Add User</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                <TextInput
                                    style={styles.searchBox}
                                    placeholder="Search users..."
                                    value={userSearchTerm}
                                    onChangeText={handleUserSearch}
                                />
                                
                                {filteredUsers.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No users found</Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.tableContainer}>
                                            <View style={styles.tableHeader}>
                                                <Text style={[styles.headerCell, styles.idCell]}>ID</Text>
                                                <Text style={styles.headerCell}>Name</Text>
                                                <Text style={styles.headerCell}>Email</Text>
                                                <Text style={styles.headerCell}>Phone</Text>
                                                <Text style={styles.headerCell}>Role</Text>
                                                <Text style={[styles.headerCell, styles.actionHeader]}>Actions</Text>
                                            </View>
                                            <FlatList
                                                data={getPaginatedData()}
                                                renderItem={renderUserItem}
                                                keyExtractor={(item, index) => `user-${item.user_id || item.id || index}`}
                                                scrollEnabled={false}
                                            />
                                        </View>
                                        
                                        {totalPages > 1 && (
                                            <View style={styles.pagination}>
                                                <TouchableOpacity 
                                                    style={[styles.pageButton, currentPage === 1 && styles.pageDisabled]}
                                                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <Text style={styles.pageText}>Previous</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.pageInfo}>{currentPage} / {totalPages}</Text>
                                                <TouchableOpacity 
                                                    style={[styles.pageButton, currentPage === totalPages && styles.pageDisabled]}
                                                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    <Text style={styles.pageText}>Next</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
            
            {/* Request Modal */}
            <Modal visible={requestModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{requestForm.id ? 'Edit Request' : 'Add New Request'}</Text>
                                <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.inputLabel}>Customer Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={requestForm.customer_name}
                                    onChangeText={(text) => setRequestForm({ ...requestForm, customer_name: text })}
                                    placeholder="Enter customer name"
                                />
                                
                                <Text style={styles.inputLabel}>Phone Number *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={requestForm.customer_phone}
                                    onChangeText={(text) => setRequestForm({ ...requestForm, customer_phone: text })}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                />
                                
                                <Text style={styles.inputLabel}>Service Type *</Text>
                                <View style={styles.pickerContainer}>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.service_type === 'towing' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, service_type: 'towing' })}
                                    >
                                        <Text style={styles.pickerText}>Towing</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.service_type === 'jumpstart' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, service_type: 'jumpstart' })}
                                    >
                                        <Text style={styles.pickerText}>Jump Start</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.service_type === 'tire' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, service_type: 'tire' })}
                                    >
                                        <Text style={styles.pickerText}>Tire Change</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.service_type === 'fuel' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, service_type: 'fuel' })}
                                    >
                                        <Text style={styles.pickerText}>Fuel Delivery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.service_type === 'lockout' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, service_type: 'lockout' })}
                                    >
                                        <Text style={styles.pickerText}>Lockout</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                <Text style={styles.inputLabel}>Location *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={requestForm.location}
                                    onChangeText={(text) => setRequestForm({ ...requestForm, location: text })}
                                    placeholder="Enter address"
                                />
                                
                                <Text style={styles.inputLabel}>Status</Text>
                                <View style={styles.pickerContainer}>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.status === 'pending' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, status: 'pending' })}
                                    >
                                        <Text style={styles.pickerText}>Pending</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.status === 'active' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, status: 'active' })}
                                    >
                                        <Text style={styles.pickerText}>Active</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.pickerOption, requestForm.status === 'completed' && styles.pickerOptionSelected]}
                                        onPress={() => setRequestForm({ ...requestForm, status: 'completed' })}
                                    >
                                        <Text style={styles.pickerText}>Completed</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={requestForm.description}
                                    onChangeText={(text) => setRequestForm({ ...requestForm, description: text })}
                                    placeholder="Describe the issue..."
                                    multiline
                                    numberOfLines={3}
                                />
                            </ScrollView>
                            
                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setRequestModalVisible(false)}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveRequest}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            
            {/* User Modal */}
            <Modal visible={userModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{userForm.id ? 'Edit User' : 'Add User'}</Text>
                            <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={userForm.name}
                                onChangeText={(text) => setUserForm({ ...userForm, name: text })}
                                placeholder="Enter name"
                            />
                            
                            <Text style={styles.inputLabel}>Email *</Text>
                            <TextInput
                                style={styles.input}
                                value={userForm.email}
                                onChangeText={(text) => setUserForm({ ...userForm, email: text })}
                                placeholder="Enter email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            
                            <Text style={styles.inputLabel}>Phone *</Text>
                            <TextInput
                                style={styles.input}
                                value={userForm.phone}
                                onChangeText={(text) => setUserForm({ ...userForm, phone: text })}
                                placeholder="Enter phone"
                                keyboardType="phone-pad"
                            />
                            
                            <Text style={styles.inputLabel}>Role</Text>
                            <View style={styles.pickerContainer}>
                                <TouchableOpacity 
                                    style={[styles.pickerOption, userForm.role === 'admin' && styles.pickerOptionSelected]}
                                    onPress={() => setUserForm({ ...userForm, role: 'admin' })}
                                >
                                    <Text style={styles.pickerText}>Admin</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.pickerOption, userForm.role === 'driver' && styles.pickerOptionSelected]}
                                    onPress={() => setUserForm({ ...userForm, role: 'driver' })}
                                >
                                    <Text style={styles.pickerText}>Driver</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.pickerOption, userForm.role === 'customer' && styles.pickerOptionSelected]}
                                    onPress={() => setUserForm({ ...userForm, role: 'customer' })}
                                >
                                    <Text style={styles.pickerText}>Customer</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                        
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setUserModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveUser}>
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* View Modal */}
            <Modal visible={viewModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Details</Text>
                            <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalBody}>
                            {selectedRequest && (
                                <>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>ID:</Text>
                                        <Text style={styles.detailValue}>#{selectedRequest.id}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Customer:</Text>
                                        <Text style={styles.detailValue}>{selectedRequest.customer_name || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Phone:</Text>
                                        <Text style={styles.detailValue}>{selectedRequest.customer_phone || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Service:</Text>
                                        <Text style={styles.detailValue}>{formatServiceType(selectedRequest.service_type)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Location:</Text>
                                        <Text style={styles.detailValue}>{selectedRequest.location || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Status:</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: formatStatus(selectedRequest.status).color + '20' }]}>
                                            <Text style={[styles.statusText, { color: formatStatus(selectedRequest.status).color }]}>
                                                {formatStatus(selectedRequest.status).text}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Description:</Text>
                                        <Text style={styles.detailValue}>{selectedRequest.description || 'No description'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Created:</Text>
                                        <Text style={styles.detailValue}>{formatDate(selectedRequest.created_at)}</Text>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                        
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => setViewModalVisible(false)}>
                                <Text style={styles.saveButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* Delete Confirmation Modal */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.deleteModal]}>
                        <View style={[styles.modalHeader, styles.deleteHeader]}>
                            <Text style={styles.modalTitle}>Confirm Delete</Text>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalBody}>
                            <Text style={styles.deleteText}>Are you sure you want to delete this {deleteType}? This action cannot be undone.</Text>
                        </View>
                        
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setDeleteModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleDelete}>
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6f9',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    viewSiteText: {
        color: '#fff',
        fontSize: 14,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 15,
        gap: 20,
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
    userEmail: {
        fontSize: 12,
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
    activeNavItem: {
        backgroundColor: '#0066cc',
        borderRadius: 8,
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    navItemText: {
        fontSize: 14,
        color: '#333',
    },
    activeNavText: {
        color: '#fff',
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
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        minWidth: width >= 768 ? 150 : '100%',
        backgroundColor: '#0066cc',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    statCardActive: {
        backgroundColor: '#28a745',
    },
    statCardPending: {
        backgroundColor: '#ffc107',
    },
    statCardUsers: {
        backgroundColor: '#17a2b8',
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        backgroundColor: '#0066cc',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    filtersRow: {
        marginBottom: 20,
        gap: 10,
    },
    searchBox: {
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    filterGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    activeFilter: {
        backgroundColor: '#0066cc',
    },
    filterText: {
        fontSize: 12,
        color: '#666',
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerCell: {
        flex: 2,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    idCell: {
        flex: 0.8,
    },
    actionHeader: {
        flex: 1.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    tableCell: {
        flex: 2,
        fontSize: 13,
        color: '#333',
    },
    actionCell: {
        flex: 1.5,
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    actionText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    viewText: {
        color: '#17a2b8',
    },
    editText: {
        color: '#ffc107',
    },
    deleteText: {
        color: '#dc3545',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#e0e0e0',
        alignSelf: 'flex-start',
    },
    adminBadge: {
        backgroundColor: '#0066cc',
    },
    roleText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 15,
    },
    pageButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
    },
    pageDisabled: {
        opacity: 0.5,
    },
    pageText: {
        fontSize: 14,
        color: '#333',
    },
    pageInfo: {
        fontSize: 14,
        color: '#666',
    },
    emptyState: {
        padding: 50,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: width - 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalClose: {
        fontSize: 24,
        color: '#999',
    },
    modalBody: {
        padding: 15,
        maxHeight: 400,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 10,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    pickerOption: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    pickerOptionSelected: {
        backgroundColor: '#0066cc',
    },
    pickerText: {
        fontSize: 14,
        color: '#333',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    saveButton: {
        backgroundColor: '#0066cc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    deleteModal: {
        width: width - 60,
    },
    deleteHeader: {
        backgroundColor: '#dc3545',
    },
    deleteText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailLabel: {
        width: 80,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
});

export default AdminDashboardScreen;