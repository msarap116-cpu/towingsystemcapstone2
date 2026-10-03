import { Platform, StyleSheet } from "react-native";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaeef2'
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 40
    },
    navbar: {
        backgroundColor: '#0046a8', // Your blue color
        paddingVertical: 12,
        paddingHorizontal: 16,
        // Add safe area padding if needed for iOS notch
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    navContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    brandText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginRight: 16, // Gives space between logo and links
    },
    navLinksContainer: {
        alignItems: 'center',
        gap: 16, // Adds space between each link
        paddingLeft: 10, // Slight padding so it doesn't touch the logo
    },
    navLink: {
        color: '#e2e8f0', // Light gray/white for links
        fontSize: 14,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#d3d9e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 30,
        elevation: 4
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: 4
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5
    },
    formGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 6
    },
    input: {
        borderWidth: 1,
        borderColor: '#d3d9e0',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: '#fafcff',
        color: '#0f172a'
    },
    inputError: {
        borderColor: '#dc3545'
    },
    passwordContainer: {
        position: 'relative',
        justifyContent: 'center'
    },
    passwordInput: {
        paddingRight: 48
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        padding: 6
    },
    eyeButtonText: {
        fontSize: 18
    },
    helperText: {
        fontSize: 12,
        color: '#5a6c7d',
        marginTop: 6,
        lineHeight: 16
    },
    errorText: {
        color: '#dc3545',
        fontSize: 13,
        marginTop: 5
    },
    statusText: {
        fontSize: 13,
        marginTop: 5
    },
    emailSuggestion: {
        color: '#856404',
        backgroundColor: '#fff3cd',
        padding: 8,
        borderRadius: 4,
        marginTop: 5,
        fontSize: 13
    },
   registerButton: {
  backgroundColor: '#0046a8',
  borderRadius: 10,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 12,
  shadowColor: '#0046a8',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 4,
  // For web/React Native hover support
  transition: 'all 0.25s ease'
},
registerButtonHover: {
  backgroundColor: '#ffffff',
  shadowColor: '#0046a8',
  shadowOpacity: 0.2,
  elevation: 3
},
registerButtonDisabled: {
  opacity: 0.6
},
registerButtonText: {
  color: '#ffffff',
  fontSize: 18,
  fontWeight: '700',
  transition: 'color 0.25s ease'
},
registerButtonTextHover: {
  color: '#0046a8'
},
    footer: {
        marginTop: 24,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 14,
        color: '#5a6c7d'
    },
    link: {
        color: '#0046a8',
        fontWeight: '600'
    }
});
export default styles;