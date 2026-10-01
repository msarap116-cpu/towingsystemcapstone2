import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
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

  // Clean the path to ensure it's a proper file URI
  const sourcePath = filePath.startsWith('file://')
    ? filePath.replace('file://', '')
    : filePath;

  // Define a filename (you can make this dynamic)
  const fileName = `${title || 'receipt'}.pdf`;

  try {
    // This method handles both modern (Android 10+) and legacy storage
    await ReactNativeBlobUtil.fs.cp(
      sourcePath,
      `content://media/external/downloads/${fileName}` // Note: This is a simplified example
    );
    Alert.alert('Success', 'File saved to Downloads!');
  } catch (e) {
    console.error('Save error:', e);
    // Fallback for older Android or other issues
    try {
      await ReactNativeBlobUtil.fs.cp(
        sourcePath,
        `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`
      );
      Alert.alert('Success', 'File saved to Downloads!');
    } catch (err) {
      Alert.alert('Error', 'Could not save file to Downloads.');
    }
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