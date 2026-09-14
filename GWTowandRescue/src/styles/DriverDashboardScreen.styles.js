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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerGreen: {
    color: '#047857',
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
    backgroundColor: '#1e40af',
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
});
export default styles;