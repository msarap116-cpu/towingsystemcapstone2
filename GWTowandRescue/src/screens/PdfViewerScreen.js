import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import Pdf from 'react-native-pdf';
import Share from 'react-native-share';



const PdfViewerScreen = ({ route }) => {
  const { filePath, title } = route.params;
  console.log('PdfViewerScreen params:', route.params);

const saveToDownloads = async () => {
  // 1. Check if filePath exists
  if (!filePath) {
    Alert.alert('Error', 'No file to save — please try downloading again.');
    return;
  }

  // 2. Clean the path: remove any accidental 'file://' prefixes
  // so we can add it back consistently in the Share.open call.
  const cleanPath = filePath.replace('file://', '');

  try {
    await Share.open({
      title: title || 'Save Receipt',
      // 3. Use the cleaned path with the 'file://' scheme
      url: `file://${cleanPath}`,
      type: 'application/pdf',
      saveToFiles: true,
    });
  } catch (e) {
    // Share.open often rejects with "User did not share" when the dialog is dismissed.
    // This is usually not a real error.
    if (e?.message !== 'User did not share') {
      console.error('Save PDF error:', e);
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