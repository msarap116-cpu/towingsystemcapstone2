

//RequestFormScren.styles.js
import { StyleSheet,Platform } from "react-native";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6f9',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    navbar: {
        backgroundColor: '#0d6efd',
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    navbarBrand: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    navbarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
        color: '#333',
    },
    formContainer: {
        backgroundColor: '#0066cc',
        borderRadius: 12,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#fff',
    },
    subLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: '#fff',
        opacity: 0.9,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#333',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    locationButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 8,
    },
    locationButtonDisabled: {
        opacity: 0.6,
    },
    locationButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    locationStatus: {
        fontSize: 12,
        marginTop: 5,
        marginBottom: 10,
    },
    manualAddress: {
        marginTop: 10,
    },
    submitButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    successText: {
        color: '#28a745',
    },
    errorText: {
        color: '#dc3545',
    },
});

export default styles;