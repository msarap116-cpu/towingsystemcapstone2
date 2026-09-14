import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const LeafletMap = ({
  customerLocation,
  driverLocation,
  routeCoordinates,
  address
}) => {
  const generateMapHtml = () => {
    const customerLat = customerLocation?.latitude || 6.1167;
    const customerLng = customerLocation?.longitude || 124.9;
    const driverLat = driverLocation?.latitude;
    const driverLng = driverLocation?.longitude;

    // Generate route polyline coordinates
    let routeCoords = '[]';
    if (routeCoordinates && routeCoordinates.length > 0) {
      routeCoords = JSON.stringify(
        routeCoordinates.map(coord => [coord.latitude, coord.longitude])
      );
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          #map {
            height: 100vh;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${customerLat}, ${customerLng}], 13);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Customer marker (blue)
          var customerIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #0046a8; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([${customerLat}, ${customerLng}], { icon: customerIcon })
            .addTo(map)
            .bindPopup('${address || "customer"}')
            .openPopup();

          // Driver marker if available (red)
          ${driverLat && driverLng ? `
            var driverIcon = L.divIcon({
              className: 'custom-marker',
              html: '<div style="background-color: #e30613; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });

            L.marker([${driverLat}, ${driverLng}], { icon: driverIcon })
              .addTo(map)
              .bindPopup('Driver Location');

            var bounds = L.latLngBounds(
              [${customerLat}, ${customerLng}],
              [${driverLat}, ${driverLng}]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
          ` : ''}

          // Route polyline if available
          var routeCoords = ${routeCoords};
          if (routeCoords.length > 0) {
            var polyline = L.polyline(routeCoords, {
              color: '#1D9E75',
              weight: 4,
              opacity: 0.8
            }).addTo(map);
          }
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateMapHtml() }}
        style={styles.map}
        scrollEnabled={false}
        onError={(error) => console.error('WebView error:', error)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});

export default LeafletMap;