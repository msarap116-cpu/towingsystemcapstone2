
//DashbordScreen.styles.js
// import { DefaultTheme } from "@react-navigation/native";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#0046a8',
    fontSize: 16,
  },

  // Navbar
  navbar: {
    backgroundColor: '#0046a8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  brandText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 6,
  },
  onlineText: {
    color: '#fff',
    fontSize: 14,
  },
  clockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },

  // Dashboard Wrapper
  dashboardWrapper: {
    flex: 1,
    flexDirection: 'row',
  },

  // Sidebar
  sidebar: {
    width: 240,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 20,
  },
  profileCard: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0046a8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  userType: {
    fontSize: 12,
    color: '#888',
  },
  navList: {
    flex: 1,
  },
  navItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 2,
  },
  navItemActive: {
    backgroundColor: '#e8f0fe',
    borderRightWidth: 3,
    borderRightColor: '#0046a8',
  },
  navText: {
    fontSize: 14,
    color: '#555',
  },
  navTextActive: {
    color: '#0046a8',
    fontWeight: '600',
  },
  logoutItem: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '500',
  },

  // Main Panel
  mainPanel: {
    flex: 1,
    padding: 16,
    overflow: 'scroll',
  },
  tabContent: {
    flex: 1,
  },

  // Request Header
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginRight: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  etaBox: {
    backgroundColor: '#0046a8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  etaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  refreshText: {
    color: '#555',
    fontSize: 14,
  },

  // Map
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },
  mapHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  mapContainer: {
    flex: 1,
    height: 400,
  },
  map: {
    flex: 1,
  },

  // Tabs
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
  },

  // History
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyId: {
    fontWeight: 'bold',
    marginRight: 12,
    color: '#1a1a2e',
  },
  historyService: {
    flex: 1,
    color: '#555',
  },
  historyStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  historyStatusText: {
    color: '#fff',
    fontSize: 11,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
  },

  // Receipts
  receiptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  receiptId: {
    flex: 1,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  receiptAmount: {
    marginRight: 12,
    color: '#555',
  },
  receiptStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  receiptStatusText: {
    color: '#fff',
    fontSize: 11,
  },
  downloadButton: {
    backgroundColor: '#0046a8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 12,
  },

  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#888',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1a1a2e',
  },

  // Payment
  paymentRequestId: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
  },
  paymentAmount: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0046a8',
    marginVertical: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#1a1a2e',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  paymentMethodName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  paymentMessage: {
    marginTop: 12,
    color: '#e30613',
    textAlign: 'center',
  },

  // GCash Form
  gcashForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  gcashTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a2e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d3d9e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fafcff',
  },
  uploadButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonText: {
    color: '#555',
  },
  submitPaymentButton: {
    backgroundColor: '#e30613',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitPaymentText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Edit Address
  suggestionsList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d3d9e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  selectedLocation: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedText: {
    color: '#555',
  },
  saveButton: {
    backgroundColor: '#0046a8',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default styles;