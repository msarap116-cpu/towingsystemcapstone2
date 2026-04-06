import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const TestMap = () => {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { margin: 0; padding: 20px; font-family: sans-serif; }
                .success { color: green; font-size: 24px; text-align: center; margin-top: 100px; }
            </style>
        </head>
        <body>
            <div class="success">
                ✅ WebView is working!<br>
                🗺️ Your Leaflet map will go here
            </div>
        </body>
        </html>
    `;
    
    return (
        <View style={styles.container}>
            <WebView
                source={{ html: htmlContent }}
                style={styles.webview}
                javaScriptEnabled={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
});

export default TestMap;