import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Pdf from 'react-native-pdf';
import Share from 'react-native-share';


const PdfViewerScreen = ({ route }) => {
  const { filePath, title } = route.params;
  console.log('PdfViewerScreen params:', route.params);

const saveToDownloads = async () => {
  if (!filePath) {
    Alert.alert('Error', 'No file to save — please try downloading again.');
    return;
  }
  try {
    await Share.open({
      title: title || 'Save Receipt',
      url: `file://${filePath}`,
      type: 'application/pdf',
      saveToFiles: true,
    });
  } catch (e) {
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