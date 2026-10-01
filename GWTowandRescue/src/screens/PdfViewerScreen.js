import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert,Platform } from 'react-native';
import Pdf from 'react-native-pdf';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';



const PdfViewerScreen = ({ route }) => {
  const { filePath, title } = route.params;
  console.log('PdfViewerScreen params:', route.params);


const saveToDownloads = async () => {
  if (!filePath) {
    Alert.alert('Error', 'No file to save.');
    return;
  }

  // Clean the path to ensure it's a proper absolute path
  const cleanPath = filePath.startsWith('file://')
    ? filePath.replace('file://', '')
    : filePath;

  const fileName = `${title || 'receipt'}.pdf`;

  try {
    // Verify source file exists
    const exists = await ReactNativeBlobUtil.fs.exists(cleanPath);
    if (!exists) {
      Alert.alert('Error', 'Source PDF file not found.');
      return;
    }

    if (Platform.OS === 'android' && Number(Platform.Version) >= 29) {
      // Android 10+ requires MediaStore API for public Downloads
      await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
        {
          name: fileName,
          parentFolder: '', // empty = root of Downloads
          mimeType: 'application/pdf',
        },
        'Download', // Media Collection
        cleanPath  // Path to the file in the app's own storage
      );
      Alert.alert('Success', 'File saved to Downloads!');
    } else {
      // Legacy fallback for Android 9 and below
      await ReactNativeBlobUtil.fs.cp(
        cleanPath,
        `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`
      );
      Alert.alert('Success', 'File saved to Downloads!');
    }
  } catch (e) {
    console.error('Save error:', e);
    Alert.alert('Error', `Could not save file: ${e.message || 'Unknown error'}`);
  }
};

  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri: filePath }}
        style={styles.pdf}
        onError={(error) => console.error('PDF render error:', error)}
      />
      <TouchableOpacity style={styles.saveButton} onPress={saveToDownloads}>
        <Text style={styles.saveButtonText}>Save to Device</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdf: { flex: 1, width: '100%', height: '100%' },
  saveButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});

export default PdfViewerScreen;