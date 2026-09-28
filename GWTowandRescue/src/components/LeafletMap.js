import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const LeafletMap = ({
  mode = 'driver', // 'driver' = follow driver (POV) | 'customer' = free camera
  driverLocation,
  customerLocation,
  routeCoordinates,
  heading,
  povMode = true,
  customerName,
  driverName,
  address,
  distanceKm,
  durationMin,
}) => {
  const webviewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [following, setFollowing] = useState(true);

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
        function log(m) {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(m));
        }
        window.onerror = function (msg, src, line) {
          log('JS ERROR: ' + msg + ' (line ' + line + ')');
        };

        var mode = 'driver';
        var following = true;
        var initialized = false;
        var fitted = false;
        var customerPopupHtml = 'Customer';
        var driverPopupHtml = 'Driver';

        var map = L.map('map', { rotate: true, touchRotate: true }).setView([6.51, 124.85], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // user drags the map -> stop auto-follow, tell React Native
        map.on('dragstart', function () {
          if (following) { following = false; log('follow:off'); }
        });

        var driverIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:#e30613;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
          iconSize: [20,20], iconAnchor: [10,10]
        });
        var customerIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:#0046a8;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
          iconSize: [20,20], iconAnchor: [10,10]
        });

        // popups read the latest text every time they open
        var driverMarker = L.marker([0,0], { icon: driverIcon })
          .bindPopup(function () { return driverPopupHtml; });
        var customerMarker = null;
        var route = null;

        function setMode(m) { mode = m; }

        function updateInfo(c, d) {
          customerPopupHtml = c;
          driverPopupHtml = d;
          if (customerMarker && customerMarker.isPopupOpen()) customerMarker.getPopup().setContent(c);
          if (driverMarker.isPopupOpen()) driverMarker.getPopup().setContent(d);
        }

        function fitAll() {
          var pts = [];
          if (map.hasLayer(driverMarker)) pts.push(driverMarker.getLatLng());
          if (customerMarker) pts.push(customerMarker.getLatLng());
          if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 17 });
          else if (pts.length === 1) map.setView(pts[0], 15);
        }

        function maybeFit() {
          if (mode !== 'customer' || fitted || !following) return;
          fitAll();
          if (map.hasLayer(driverMarker) && customerMarker) fitted = true;
        }

        function updateDriver(lat, lng, bearing) {
          if (!map.hasLayer(driverMarker)) driverMarker.addTo(map);
          driverMarker.setLatLng([lat, lng]);

          if (mode === 'driver') {
            if (!initialized) {
              map.setView([lat, lng], 17);
              initialized = true;
            } else if (following) {
              map.panTo([lat, lng], { animate: true, duration: 0.8 });
            }
            if (bearing != null) map.setBearing(bearing);
          } else {
            maybeFit();
          }
        }

        function updateCustomer(lat, lng) {
          if (!customerMarker) {
            customerMarker = L.marker([lat, lng], { icon: customerIcon })
              .addTo(map)
              .bindPopup(function () { return customerPopupHtml; })
              .openPopup();
          } else {
            customerMarker.setLatLng([lat, lng]);
          }
          maybeFit();
        }

        function updateRoute(coords) {
          log('updateRoute called with ' + coords.length + ' points');
          if (route) map.removeLayer(route);
          if (coords.length) {
            route = L.polyline(coords, { color: '#1D9E75', weight: 4, opacity: 0.8 }).addTo(map);
          }
        }

        function recenter() {
          following = true;
          if (mode === 'driver') {
            if (map.hasLayer(driverMarker)) {
              map.setView(driverMarker.getLatLng(), Math.max(map.getZoom(), 17), { animate: true });
            }
          } else {
            fitAll();
          }
        }

        log('page ready. setBearing: ' + (typeof L.Map.prototype.setBearing));
        true;
      </script>
    </body>
    </html>
  `, []);

  const inject = (code) => webviewRef.current?.injectJavaScript(code + '; true;');

  // 1) mode first (effects run in declaration order)
  useEffect(() => {
    if (!mapReady) return;
    inject(`setMode(${JSON.stringify(mode)})`);
  }, [mapReady, mode]);

  // 2) popup text
  useEffect(() => {
    if (!mapReady) return;
    const customerHtml = `📍 ${esc(customerName || 'Customer')}<br>${esc(address || 'Customer location')}`;
    let driverHtml = `<strong>🚗 ${esc(driverName || 'Driver')}</strong>`;
    if (distanceKm && durationMin) {
      driverHtml += `<br>Distance: <strong>${esc(distanceKm)} km</strong><br>Est. arrival: <strong>${esc(durationMin)} min</strong>`;
    } else if (distanceKm) {
      driverHtml += `<br>~${esc(distanceKm)} km away`;
    } else {
      driverHtml += '<br>Calculating route…';
    }
    inject(`updateInfo(${JSON.stringify(customerHtml)}, ${JSON.stringify(driverHtml)})`);
  }, [mapReady, customerName, address, driverName, distanceKm, durationMin]);

  // 3) customer marker
  useEffect(() => {
    if (!mapReady || !customerLocation) return;
    inject(`updateCustomer(${customerLocation.latitude}, ${customerLocation.longitude})`);
  }, [mapReady, customerLocation]);

  // 4) driver marker (+ POV rotation in driver mode)
  useEffect(() => {
    if (!mapReady || !driverLocation) return;
    const bearing = povMode ? (heading ?? 'null') : 0;
    inject(`updateDriver(${driverLocation.latitude}, ${driverLocation.longitude}, ${bearing})`);
  }, [mapReady, driverLocation, heading, povMode]);

  // 5) route
  useEffect(() => {
    if (!mapReady || !routeCoordinates?.length) return;
    const coords = JSON.stringify(routeCoordinates.map((c) => [c.latitude, c.longitude]));
    inject(`updateRoute(${coords})`);
  }, [mapReady, routeCoordinates]);

  const handleMessage = (e) => {
    const msg = e.nativeEvent.data;
    if (msg === 'follow:off') setFollowing(false);
    else console.log('[WebView]', msg);
  };

  const handleRecenter = () => {
    inject('recenter()');
    setFollowing(true);
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html, baseUrl: 'https://localhost' }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        cacheEnabled
        onLoadEnd={() => setMapReady(true)}
        onMessage={handleMessage}
        onError={(e) => console.error('WebView error:', e)}
      />
      {!following && (
        <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
          <Text style={styles.recenterText}>{mode === 'driver' ? '📍 Recenter' : '🗺️ Show both'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
  recenterBtn: {
    position: 'absolute',
    bottom: 16,
    right: 12,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    elevation: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  recenterText: { fontWeight: '600', color: '#0f172a' },
});

export default LeafletMap;