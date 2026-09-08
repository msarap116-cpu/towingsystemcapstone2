// ===== STYLES — DRIVER DASHBOARD (Bottom Tab Bar Ready) =====
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
    color: '#1a4b6d',
    fontSize: 16,
  },

  // Navbar — ✅ UNCHANGED
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
  brandText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  brandSpan: {
    opacity: 0.8,
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

  // Profile Header (replaced sidebar profile card)
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileInfo: {
    marginLeft: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0046a8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  roleBadge: {
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    color: '#888',
  },

  // Main Panel — FULL WIDTH, space for bottom tab bar
  mainPanel: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 90,
  },
  tabContent: {
    flex: 1,
  },

  // ========== BOTTOM TAB BAR — NEW ==========
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabItemActive: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 10,
    color: '#555',
  },
  tabTextActive: {
    color: '#0046a8',
    fontWeight: '600',
  },
  tabLogout: {
    // special styling for logout
  },
  logoutTabText: {
    fontSize: 10,
    color: '#dc3545',
    fontWeight: '500',
  },

  // ========== ALL EXISTING CONTENT STYLES — ✅ UNCHANGED ==========
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0046a8',
  },
  twoCol: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  badge: {
    backgroundColor: '#0046a8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  serviceBadge: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  serviceText: {
    fontSize: 11,
    color: '#0046a8',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  requestBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0046a8',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusSelect: {
    flexDirection: 'row',
    gap: 4,
  },
  statusOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  statusOptionActive: {
    backgroundColor: '#0046a8',
  },
  statusOptionText: {
    fontSize: 11,
    color: '#555',
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  refreshText: {
    color: '#555',
    fontSize: 13,
  },
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapContainer: {
    height: 400,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  trackingInfo: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  trackingStatus: {
    fontSize: 14,
    color: '#0046a8',
    fontWeight: '500',
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 30,
  },
});

export default styles;