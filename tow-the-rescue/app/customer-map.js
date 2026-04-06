import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const SERVER_URL = 'http://192.168.0.104:3000';

export default function CustomerMap() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `${SERVER_URL}/login` }}
        style={styles.webview}
        
        // Essential for session handling
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        
        // Allow form submissions
        javaScriptCanOpenWindowsAutomatically={true}
        
        // Handle HTTP (not HTTPS)
        mixedContentMode="always"
        
        // Cache and storage
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        
        // User agent to appear as mobile browser
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        
        // Debug logging
        onLoadStart={() => console.log('🟡 Loading...')}
        onLoad={() => console.log('🟢 Loaded')}
        onError={(error) => console.error('🔴 Error:', error.nativeEvent)}
        onHttpError={(error) => console.error('🔴 HTTP:', error.nativeEvent.statusCode)}
        
        // Inject script to capture form submissions
        injectedJavaScript={`
          // Log form submissions
          document.addEventListener('submit', function(e) {
            console.log('Form submitted to:', e.target.action);
          });
          
          // Store login success flag
          if (window.location.pathname === '/dashboard') {
            window.ReactNativeWebView.postMessage('LOGIN_SUCCESS');
          }
          
          true;
        `}
        
        onMessage={(event) => {
          if (event.nativeEvent.data === 'LOGIN_SUCCESS') {
            console.log('✅ Login successful, redirecting to dashboard');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});