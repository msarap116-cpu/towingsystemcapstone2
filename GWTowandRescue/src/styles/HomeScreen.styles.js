
//HomeScreen.styles.js
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    backgroundColor: '#0047ab',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  phoneRow: {
    flexDirection: 'row',
  },
  phoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hoursText: {
    color: '#e0e0e0',
    fontSize: 13,
  },
  navbar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexWrap: 'wrap',
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dd0000',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  navLink: {
    fontSize: 14,
    color: '#333',
  },
  helpButton: {
    backgroundColor: '#dd0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroBg: {
    width: '100%',
    minHeight: 520,
    backgroundColor: '#e8e8e8',
  },
  heroOverlay: {
    padding: 25,
    paddingTop: 40,
    backgroundColor: 'rgba(255,255,255,0.85)',
    minHeight: 520,
  },
  tagline: {
    color: '#dd0000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  heroMain: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#002b5c',
  },
  heroSub: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dd0000',
    textDecorationLine: 'underline',
    marginBottom: 15,
  },
  heroVerse: {
    fontSize: 14,
    color: '#444',
    marginBottom: 25,
    lineHeight: 20,
  },
  bulletList: {
    gap: 10,
    marginBottom: 30,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    fontSize: 14,
  },
  bulletText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  authRow: {
    flexDirection: 'row',
    gap: 15,
  },
  loginBtn: {
    backgroundColor: '#dd0000',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  registerBtn: {
    borderWidth: 2,
    borderColor: '#0047ab',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  registerText: {
    color: '#0047ab',
    fontWeight: 'bold',
    fontSize: 15,
  },
  featureSection: {
    flexDirection: width >= 768 ? 'row' : 'column',
    padding: 20,
    gap: 15,
    backgroundColor: '#fff',
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});

export default styles;