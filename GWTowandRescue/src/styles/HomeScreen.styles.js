// styles/HomeScreen.styles.js
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ============ TOP BAR ============
  topBar: {
    backgroundColor: '#003580',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  topBarText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
  },

  // ============ NAVBAR ============
  navbar: {
    backgroundColor: '#0046a8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  brand: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginRight: 12,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 4,
  },
  navLink: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  logoutLink: {
    color: '#ff6b6b',
    fontWeight: '600',
  },
  helpButton: {
    backgroundColor: '#e30613',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 4,
  },
  helpButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ============ HERO ============
  heroSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  heroBadge: {
    backgroundColor: '#0046a8',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 34,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: '#0046a8',
  },
  heroDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
    marginBottom: 18,
    fontStyle: 'italic',
  },
  checklist: {
    marginBottom: 20,
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  checkText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    flex: 1,
    backgroundColor: '#0046a8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0046a8',
  },
  registerButtonText: {
    color: '#0046a8',
    fontSize: 15,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0046a8',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // ============ FEATURES ============
  featuresSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#6b7280',
  },

  // ============ SERVICES ============
  servicesSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: (width - 44) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  serviceEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 15,
  },
  priceTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  priceText: {
    color: '#0046a8',
    fontWeight: '700',
    fontSize: 13,
  },
  serviceButton: {
    backgroundColor: '#0046a8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  serviceButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ============ MODAL ============
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.85,
    width: '100%',
  },
  emergencyModal: {
    maxHeight: height * 0.92,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    paddingRight: 40,
  },
  stepsContainer: {
    maxHeight: height * 0.5,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalFooter: {
    marginTop: 20,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ============ FORM ============
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  subLabel: {
    fontWeight: '500',
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#111827',
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  locationButton: {
    backgroundColor: '#0046a8',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.7,
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationStatus: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  successText: {
    color: '#16a34a',
  },
  errorText: {
    color: '#dc2626',
  },
  manualAddress: {
    marginTop: 12,
  },
  addressSearchWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 0,
    borderRadius: 10,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 20,
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  noVehiclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  noVehiclesText: {
    fontSize: 13,
    color: '#6b7280',
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#0046a8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ============ CONFIRMATION ============
  confirmationBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmationIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  confirmationText: {
    fontSize: 14,
    color: '#374151',
    marginVertical: 2,
    textAlign: 'center',
  },
  confirmationStrong: {
    fontWeight: '700',
    color: '#1d4ed8',
  },
  dashboardButton: {
    backgroundColor: '#0046a8',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 14,
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ============ FOOTER ============
  footer: {
    backgroundColor: '#1e2f3a',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerEmergency: {
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 6,
  },
});

export default styles;
