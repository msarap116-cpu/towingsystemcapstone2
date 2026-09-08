import { StyleSheet } from 'react-native'
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#1a4b6d',
    fontSize: 16,
  },

  // Navbar
  navbar: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edf4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0b1a2e',
  },
  brandSpan: {
    color: '#1d7a4f',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#4a5b6e',
  },
  clockText: {
    fontSize: 12,
    color: '#4a5b6e',
  },

  // Dashboard Wrapper
  dashboardWrapper: {
    flex: 1,
    flexDirection: 'row',
  },

  // Sidebar
  sidebar: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e9edf4',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f8',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#1a4b6d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b1a2e',
  },
  roleBadge: {
    backgroundColor: '#eef3fc',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 30,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    color: '#55708b',
  },
  navList: {
    flex: 1,
  },
  navItem: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginVertical: 2,
  },
  navItemActive: {
    backgroundColor: '#e7eef9',
  },
  navText: {
    fontSize: 14,
    color: '#33455a',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#1a4b6d',
  },
  logoutItem: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#edf2f8',
    paddingTop: 18,
    marginTop: 18,
  },
  logoutText: {
    fontSize: 14,
    color: '#b91c1c',
    fontWeight: '500',
  },

  // Main Panel
  mainPanel: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabContent: {
    gap: 16,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9edf4',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#6f88a2',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0b1a2e',
    marginTop: 4,
  },

  // Two Column
  twoCol: {
    gap: 16,
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e9edf4',
    padding: 16,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b1a2e',
  },
  badge: {
    backgroundColor: '#eef2f8',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 30,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#33455a',
  },

  // Request Items
  requestItem: {
    backgroundColor: '#f8fafd',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf2f8',
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b1a2e',
  },
  serviceBadge: {
    backgroundColor: '#e9eff6',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 30,
  },
  serviceText: {
    fontSize: 11,
    color: '#55708b',
  },
  locationText: {
    fontSize: 12,
    color: '#5c728b',
    marginTop: 4,
  },
  requestBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b1a2e',
  },
  acceptButton: {
    backgroundColor: '#0b1a2e',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 40,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 30,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Action Buttons
  actionButtons: {
    marginTop: 10,
    gap: 8,
  },
  statusSelect: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#cdd8e5',
    backgroundColor: 'transparent',
  },
  statusOptionActive: {
    backgroundColor: '#1a4b6d',
    borderColor: '#1a4b6d',
  },
  statusOptionText: {
    fontSize: 11,
    color: '#1e3349',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 11,
  },

  // Tracking
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b1a2e',
  },
  refreshButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cdd8e5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 40,
  },
  refreshText: {
    fontSize: 12,
    color: '#1e3349',
  },

  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e9edf4',
    overflow: 'hidden',
  },
  mapContainer: {
    height: 400,
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: '#fafcff',
    borderTopWidth: 1,
    borderTopColor: '#e9edf4',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#33455a',
  },
  trackingInfo: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9edf4',
  },
  trackingStatus: {
    fontSize: 14,
    color: '#4a5b6e',
  },

  emptyText: {
    color: '#7a8fa5',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});