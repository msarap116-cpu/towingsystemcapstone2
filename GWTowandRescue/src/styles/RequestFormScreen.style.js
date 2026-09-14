// styles/RequestFormScreen.style.js
import { StyleSheet, Dimensions } from 'react-native';
import styles from './RegisterScreen.styles';

const { width, height } = Dimensions.get('window');

const Styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaeef2',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 60,
    },
    navbar: {
        backgroundColor: '#0046a8',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 60,
        justifyContent: 'center',
    },
    navContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navbarBrand: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    navbarTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
        letterSpacing: -0.3,
    },
    formContainer: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    formGroup: {
        marginBottom: 20,
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
    input: {
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
        minHeight: 80,
        textAlignVertical: 'top',
    },
    locationButton: {
        backgroundColor: '#0046a8',
        paddingVertical: 10,
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
        fontWeight: '500',
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
        marginTop: 14,
    },
    addressSearchWrapper: {
        position: 'relative',
        zIndex: 10,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 90,
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
    noticeText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 8,
    },
    linkText: {
        color: '#2563eb',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    submitButton: {
        backgroundColor: '#0046a8',
        paddingVertical: 12,
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
        fontSize: 15,
        fontWeight: '600',
    },
    confirmationBox: {
        marginTop: 24,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmationIcon: {
        fontSize: 40,
        marginBottom: 6,
    },
    confirmationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e40af',
        marginBottom: 6,
    },
    confirmationText: {
        fontSize: 14,
        color: '#374151',
        marginVertical: 2,
    },
    confirmationStrong: {
        fontWeight: '600',
        color: '#1d4ed8',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: width * 0.85,
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginBottom: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalButtonLogin: {
        backgroundColor: '#0046a8',
    },
    modalButtonRegister: {
        backgroundColor: '#e30613',
    },
    modalButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 15,
    },
    modalCancel: {
        paddingVertical: 8,
    },
    modalCancelText: {
        color: '#6b7280',
        fontSize: 14,
    },
});

export default styles;