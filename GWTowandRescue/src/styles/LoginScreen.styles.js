
//LoginScreen.style.js
import { StyleSheet,Dimensions } from "react-native";

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaeef2',
  },

  // Navbar - Caltex Blue (#0046a8)
  navbar: {
    backgroundColor: '#0046a8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    width: '100%',
  },
  navbarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  navLink: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 40,
  },

  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Login Card - White background like your web
  loginCard: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d3d9e0',
    width: '100%',
    maxWidth: 460,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 5,
  },

  loginHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 15,
    color: '#5a6c7d',
  },

  form: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 22,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d3d9e0',
    borderRadius: 16,
    fontSize: 15,
    backgroundColor: '#fafcff',
    color: '#0f172a',
  },

  // Password wrapper with PNG icons
  passwordWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  togglePassword: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    opacity: 0.6,
  },

  submitButton: {
    width: '100%',
    padding: 14,
    backgroundColor: '#0046a8', // Caltex Red
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#051730',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  formFooter: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#5a6c7d',
  },
  footerLink: {
    color: '#0046a8',
    fontWeight: '600',
  },
});

export default styles;