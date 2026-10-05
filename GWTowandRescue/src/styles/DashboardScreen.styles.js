import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  // ===== LAYOUT =====
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
    color: '#1a4b6d',
    fontSize: 16,
  },

  // ===== NAVBAR =====
  navbar: {
    backgroundColor: '#0046a8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
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
  brandIcon: { fontSize: 20, marginRight: 6 },
  brandText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  brandSpan: { opacity: 0.8 },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  onlineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#4ade80', marginRight: 6,
  },
  onlineText: { color: '#fff', fontSize: 14 },
  clockText: { color: '#fff', fontSize: 14 },

  // ===== PROFILE HEADER =====
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0046a8',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileInfo: { marginLeft: 12, flex: 1 },
  profileName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  userType: { fontSize: 12, color: '#888', marginTop: 2 },

  // ===== MAIN PANEL =====
  mainPanel: { flex: 1 },
  tabContent: { flex: 1 },
  tabContentPadding: {
    padding: 16,
    paddingBottom: 100, // clears bottom tab bar
  },
  tabTitle: {
    fontSize: 20, fontWeight: 'bold',
    color: '#1a1a2e', marginBottom: 16,
  },
  emptyText: {
    color: '#888', fontSize: 15,
    textAlign: 'center', paddingVertical: 30,
  },

  // ===== BOTTOM TAB BAR =====
  bottomTabBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabItem: {
    alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingVertical: 4,
  },
  tabItemActive: { backgroundColor: '#e8f0fe', borderRadius: 8 },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabText: { fontSize: 10, color: '#555' },
  tabTextActive: { color: '#0046a8', fontWeight: '600' },
  tabLogout: {},
  logoutTabText: { fontSize: 10, color: '#dc3545', fontWeight: '500' },

  // ===== DASHBOARD =====
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestBadge: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 8, flex: 1,
  },
  trackingNumber: {
    fontSize: 15, fontWeight: '700', color: '#1a1a2e',
  },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  etaBox: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  etaText: { color: '#0046a8', fontSize: 11, fontWeight: '600' },

  refreshButton: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#f0f0f0',
  },
  refreshText: { color: '#555', fontSize: 13 },

  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  mapHeader: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  mapTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  mapContainer: { height: 400 },

  // ===== RECENT / RECEIPTS =====
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  historyId: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  historyService: { fontSize: 13, color: '#666', marginTop: 2 },

  historyFooter: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
  gap: 8, // space between status and cancel button
},

historyStatus: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 6,
  alignSelf: 'flex-start',
},

historyStatusText: {
  color: '#fff',
  fontSize: 11,
  fontWeight: '600',
},

cancelButton: {
  backgroundColor: '#dc3545',
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 6,

},

cancelButtonText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
historyAddressRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginTop: 4,
  marginBottom: 4,
  width: '100%',
},
historyAddressIcon: {
  marginRight: 4,
  marginTop: 1, // nudge to align with text baseline
},
historyAddress: {
    flex: 1,              // 👈 allows wrapping, not overflow
  flexShrink: 1,
  flex: 1, // so long addresses wrap instead of overflowing
  fontSize: 13,
  color: '#555',
},

  receiptItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptLabel: { fontSize: 13, color: '#666' },
  receiptValue: { fontSize: 13, color: '#1a1a2e', fontWeight: '500' },
  receiptAmount: { fontSize: 14, color: '#0046a8', fontWeight: '700' },
  receiptStatus: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  receiptStatusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  downloadButton: {
    marginTop: 10, paddingVertical: 10,
    backgroundColor: '#2b6cb0', borderRadius: 8, alignItems: 'center',
  },
  downloadButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // ===== PAYMENT =====
  sectionHeader: { marginBottom: 12 },
  paymentRequestInfo: {
    backgroundColor: '#F7F7FA', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  paymentInfoHeading: {
    fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6,
  },
  paymentInfoLine: { fontSize: 14, color: '#333', marginBottom: 4 },
  paymentAmountLine: { fontSize: 15, color: '#333' },
  bold: { fontWeight: '700' },

  paymentMethodTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  paymentGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  paymentMethod: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12,
  },
  paymentMethodIcon: { fontSize: 26 },
  paymentMethodName: { fontSize: 15, fontWeight: '600' },
  paymentMethodSub: { fontSize: 12, color: '#777' },

  gcashSection: {
    marginTop: 12, padding: 12,
    borderWidth: 1, borderColor: '#e5e5e5',
    borderRadius: 10, backgroundColor: '#FAFAFA',
  },
  gcashTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  gcashDetails: { marginBottom: 12 },
  gcashDetailLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  gcashDetailValue: { fontSize: 13, color: '#333', marginTop: 2 },
  gcashQr: { width: 200, height: 200, alignSelf: 'center', marginTop: 10 },

  inputLabel: {
    fontSize: 13, fontWeight: '600', color: '#444',
    marginTop: 10, marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 10, fontSize: 14, backgroundColor: '#fff',
    marginBottom: 4,
  },
  uploadButton: {
    borderWidth: 1, borderColor: '#2b6cb0', borderRadius: 8,
    padding: 12, alignItems: 'center', marginTop: 4,
  },
  uploadButtonText: { color: '#2b6cb0', fontWeight: '600' },
  proofPreview: {
    width: '100%', height: 180, borderRadius: 8, marginTop: 10,
  },

  submitPaymentButton: {
    backgroundColor: '#16a34a', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 14,
  },
  submitPaymentText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  paymentMessage: {
    marginTop: 12, fontSize: 14,
    color: '#c53030', textAlign: 'center',
  },

  cancelPaymentButton: {
    marginTop: 12, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#d0d7de', backgroundColor: '#f5f6f8',
  },
  cancelPaymentText: { color: '#333', fontSize: 15, fontWeight: '600' },


  // ===== MODALS =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalClose: { alignSelf: 'flex-end', padding: 4, marginBottom: 8 },
  modalCloseText: { fontSize: 22, color: '#666' },
  modalTitle: {
    fontSize: 18, fontWeight: '700',
    color: '#1a1a2e', marginBottom: 12,
  },

suggestionsList: {
  marginTop: 4,
  marginBottom: 12,
  maxHeight: 220,
  backgroundColor: '#fff',        // 👈 hide anything behind it
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#e5e5e5',
  overflow: 'hidden',             // 👈 clip children to rounded corners
  zIndex: 10,                     // 👈 sit above sibling elements
  elevation: 4,                   // 👈 Android shadow so it "floats"
},
suggestionItem: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
  backgroundColor: '#fff',        // 👈 each row is opaque
},
suggestionItemLast: {             // optional: apply to last item to remove divider
  borderBottomWidth: 0,
},
suggestionText: {
  fontSize: 13,
  color: '#444',
},


  saveButton: {
    backgroundColor: '#0046a8', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
// Add to styles object
noRequestOverlay: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.85)',
},
noRequestText: {
  fontSize: 18,
  fontWeight: '700',
  color: '#1a1a2e',
  marginBottom: 8,
},
noRequestSubText: {
  fontSize: 14,
  color: '#666',
  textAlign: 'center',
  paddingHorizontal: 40,
},
// ===== DASHBOARD =====
dashboardWrapper: {
  flex: 1,
  position: 'relative',
},
mapBackground: {
  flex: 1,
  // Ensure the map has an absolute container
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
overlayTop: {
  position: 'absolute',
  top: 12,
  right: 12,
  left: 12,
  alignItems: 'flex-end',
},
// The button itself
currentLocationButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#EAF2FF',
  borderWidth: 1,
  borderColor: '#B9D4FF',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 10,
  marginVertical: 10,
},
currentLocationText: {
  color: '#007AFF',
  fontWeight: '600',
  fontSize: 14,
},

// The waypoint container (the "selected location" card)
selectedLocation: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#E5E5E5',
  borderRadius: 12,
  padding: 14,
  marginTop: 10,
  // subtle shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
},

// Waypoint pin visuals
waypointContainer: {
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
waypointRing: {
  position: 'absolute',
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#FF3B30',
  opacity: 0.15,
},
waypointDot: {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#FF3B30',
  alignItems: 'center',
  justifyContent: 'center',
},

// Text
selectedTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#222',
  marginBottom: 2,
},
selectedSubText: {
  fontSize: 12,
  color: '#666',
  marginTop: 2,
},

// Coordinate row
coordRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
},
coordText: {
  fontSize: 11,
  color: '#888',
  marginLeft: 3,
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
},
coordDivider: {
  width: 1,
  height: 10,
  backgroundColor: '#DDD',
  marginHorizontal: 8,
},

});

export default styles;