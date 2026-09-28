import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const LeafletMap = ({ driverLocation, customerLocation, routeCoordinates, heading, povMode }) => {
  const webviewRef = useRef(null);

  // Build the static HTML ONCE — no location values baked in here
  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js"></script>
      <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { rotate: true, touchRotate: true }).setView([0,0], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var driverIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:#e30613;width:20px;height:20px;border-radius:50%;border:3px solid white;"></div>',
          iconSize: [20,20], iconAnchor: [10,10]
        });
        var customerIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:#0046a8;width:20px;height:20px;border-radius:50%;border:3px solid white;"></div>',
          iconSize: [20,20], iconAnchor: [10,10]
        });

        var driverMarker = L.marker([0,0], { icon: driverIcon }).addTo(map);
        var customerMarker = null;
        var route = null;
        var initialized = false;

        function updateDriver(lat, lng, bearing) {
          driverMarker.setLatLng([lat, lng]);
          map.panTo([lat, lng], { animate: true, duration: 0.8 });
          if (bearing != null) map.setBearing(bearing);
          if (!initialized) { map.setView([lat, lng], 17); initialized = true; }
        }

        function updateCustomer(lat, lng) {
          if (!customerMarker) {
            customerMarker = L.marker([lat, lng], { icon: customerIcon }).addTo(map);
          } else {
            customerMarker.setLatLng([lat, lng]);
          }
        }

        function updateRoute(coords) {
          if (route) map.removeLayer(route);
          if (coords.length) {
            route = L.polyline(coords, { color: '#1D9E75', weight: 4, opacity: 0.8 }).addTo(map);
          }
        }
        true;
      </script>
    </body>
    </html>
  `, []);

  useEffect(() => {
    if (!driverLocation || !webviewRef.current) return;
    webviewRef.current.injectJavaScript(`
      updateDriver(${driverLocation.latitude}, ${driverLocation.longitude}, ${heading ?? 'null'});
      true;
    `);
  }, [driverLocation, heading]);

  useEffect(() => {
    if (!customerLocation || !webviewRef.current) return;
    webviewRef.current.injectJavaScript(`
      updateCustomer(${customerLocation.latitude}, ${customerLocation.longitude});
      true;
    `);
  }, [customerLocation]);

  useEffect(() => {
    if (!driverLocation || !webviewRef.current) return;
    const bearingToSend = povMode ? (heading ?? 'null') : 0;
    webviewRef.current.injectJavaScript(`
      updateDriver(${driverLocation.latitude}, ${driverLocation.longitude}, ${bearingToSend});
      true;
    `);
  }, [driverLocation, heading, povMode]);
  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onError={(e) => console.error('WebView error:', e)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
});

export default LeafletMap;