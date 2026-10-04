import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
   headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    // REMOVE paddingTop: 20, and replace it with proper safe area handling
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Adjusts for iOS notch, keeps Android clean
    paddingBottom: 16,
    backgroundColor: '#0046a8', // Matches the customer side
    // If you are using SafeAreaView in your JSX, you can remove paddingTop entirely
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerGreen: {
    color: '#fefeffd2',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    fontSize: 14,
    color: '#475569',
  },
  timeText: {
    fontSize: 14,
    color: '#64748b',
  },
  avatarRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1eaf4c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentArea: {
    flex: 1, //  THIS IS THE MOST IMPORTANT LINE — it gives all space below header to content
    paddingHorizontal: 20,
    paddingBottom: 100, // Make room for bottom bar
  },
  // --- DASHBOARD ---
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  // --- CARDS ---
  whiteCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1e293b',
  },
  emptyMsg: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 30,
    fontSize: 15,
  },
  // --- BOTTOM BAR ---
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  tabItemActive: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  logoutText: {
    color: '#b91c1c',
  },


  modalBackdrop: {
  flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center', alignItems: 'center', padding: 20,
},
modalCard: {
  width: '100%', backgroundColor: '#fff', borderRadius: 14,
  padding: 20, elevation: 6,
},
modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
modalSubtitle: { color: '#64748b', marginBottom: 12 },
modalInput: {
  borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
  padding: 10, minHeight: 70, textAlignVertical: 'top',
},
modalActions: {
  flexDirection: 'row', justifyContent: 'flex-end',
  marginTop: 16, gap: 10,
},
modalBtn: {
  paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
},
modalBtnGhost: { backgroundColor: '#f1f5f9' },
modalBtnGhostText: { color: '#334155', fontWeight: '600' },
modalBtnDanger: { backgroundColor: '#dc2626' },
modalBtnDangerText: { color: '#fff', fontWeight: '600' },

requestItem: {
  flexDirection: 'row', alignItems: 'center',
  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
},
requestName: { fontWeight: '600', fontSize: 15 },
requestLocation: { color: '#64748b', fontSize: 13, marginTop: 2 },
requestAmount: { color: '#0b0b0b', fontWeight: '600', marginTop: 4 },
acceptBtn: {
  backgroundColor: '#1a4b6d', paddingVertical: 8,
  paddingHorizontal: 14, borderRadius: 8, marginLeft: 10,
},
acceptBtnText: { color: '#fff', fontWeight: '600' },

tripHeaderRow: {
  flexDirection: 'row', justifyContent: 'space-between',
  alignItems: 'center', marginBottom: 6,
},
tripId: { fontWeight: '700', fontSize: 15 },
tripStatusPill: {
  fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  overflow: 'hidden',
},
tripLocation: { color: '#475569', marginBottom: 4 },
tripAmount: { color: '#090909', fontWeight: '600' },
tripActions: {
  flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap',
},
tripBtn: {
  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
},
tripBtnPrimary: { backgroundColor: '#1a4b6d' },
tripBtnPrimaryText: { color: '#fff', fontWeight: '600' },
tripBtnSuccess: { backgroundColor: '#0046a8' },
tripBtnSuccessText: { color: '#fff', fontWeight: '600' },
tripBtnDanger: { backgroundColor: '#dc0b0b' },
tripBtnDangerText: { color: '#f8f4f4', fontWeight: '600' },

profileHeader: {
  flexDirection: 'row', alignItems: 'center',
  paddingHorizontal: 16, paddingVertical: 10,
  backgroundColor: '#fff',
},
avatarContainer: {
  width: 44, height: 44, borderRadius: 22,
  backgroundColor: '#1a4b6d',
  alignItems: 'center', justifyContent: 'center', marginRight: 12,
},
avatarInitials: { color: '#fff', fontWeight: '700', fontSize: 16 },
profileInfo: { flex: 1 },
profileName: { fontWeight: '700', fontSize: 16, color: '#0f172a' },
roleBadge: {
  alignSelf: 'flex-start', marginTop: 4,
  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  backgroundColor: '#e0f2fe',
},
roleText: { color: '#070707', fontSize: 11, fontWeight: '600' },
  povButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 10, // Android needs this alongside elevation to sit above the WebView
  },
  povButtonText: {
    fontWeight: '600',
    color: '#0f172a',
  },
   loadingContainer: {
    flex: 1, // This makes it fill the entire safe area
    justifyContent: 'center', // This centers vertically
    alignItems: 'center', // This centers horizontally
  },
  loadingText: {
    marginTop: 10, // Adds a little space between the spinner and text
    color: '#000', // Adjust color as needed
    fontSize: 16,  // Adjust size as needed
  },
    // ===== TRACKING — MAP BACKGROUND LAYOUT =====
  trackingWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },

  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    // gives the WebView a real size since absoluteFillObject has no intrinsic size
  },

  trackingOverlayTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    maxWidth: '60%',
  },

  trackingInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  trackingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 2,
  },

  trackingStatusText: {
    fontSize: 12,
    color: '#475569',
  },

  trackingOverlayTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  povButton: {
    backgroundColor: 'rgba(0,70,168,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  povButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
// Add-Charge / secondary button on trip cards
tripBtnSecondary: {
  backgroundColor: '#f5f8fa',
  borderWidth: 1,
  borderColor: '#0046a8',
},
tripBtnSecondaryText: {
  color: '#0369a1',
  fontWeight: '600',
  fontSize: 13,
},

// Modal primary button (you already have Ghost/Danger/Success)
modalBtnPrimary: {
  backgroundColor: '#f6f7f8',
},
modalBtnPrimaryText: {
  color: '#100f0f',
  fontWeight: '600',
},
modalSubtitle: {
  fontSize: 13,
  color: '#64748b',
  marginBottom: 12,
},// --- NOTIFICATIONS ---
notifBellWrap: {
  position: 'relative',
  padding: 4,
},
notifBadge: {
  position: 'absolute',
  top: -2,
  right: -2,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: '#dc2626',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
},
notifBadgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: '700',
},
notifItem: {
  backgroundColor: '#fff',
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
  borderLeftWidth: 4,
  borderLeftColor: '#e2e8f0',
},
notifItemUnread: {
  borderLeftColor: '#0046a8',
  backgroundColor: '#f0f7ff',
},
notifRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
},
notifType: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0046a8',
  textTransform: 'uppercase',
  marginBottom: 4,
},
notifMessage: {
  fontSize: 14,
  color: '#1e293b',
  lineHeight: 20,
},
notifTime: {
  fontSize: 11,
  color: '#94a3b8',
  marginTop: 6,
},
notifActions: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  marginTop: 8,
  gap: 8,
},
notifActionBtn: {
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
  backgroundColor: '#f1f5f9',
},
notifActionText: {
  fontSize: 12,
  color: '#334155',
  fontWeight: '600',
},
tripCustomer: {
  fontSize: 14,
  color: '#333',
  marginTop: 6,
},
tripPhone: {
  fontSize: 14,
  color: '#007AFF',   // iOS blue — tap-to-call affordance
  marginTop: 2,
  textDecorationLine: 'underline',
},

});
export default styles;