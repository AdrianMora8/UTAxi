import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { colors, fonts } from '../../theme';
import { useTripTracking } from '../../hooks/useTripTracking';
import type { AvisosStackParamList, PublicarStackParamList } from '../../navigation/MainTabs';

type TrackingParams = AvisosStackParamList['TripTracking'];

const AMBATO_LAT = -1.2543;
const AMBATO_LNG = -78.6229;

function buildMapHtml(destLat?: number, destLng?: number): string {
  const centerLat = destLat ?? AMBATO_LAT;
  const centerLng = destLng ?? AMBATO_LNG;
  const hasDestCoords = !!(destLat && destLng);
  const destMarker = hasDestCoords
    ? `L.marker([${destLat}, ${destLng}], { icon: destIcon }).addTo(map);`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#0e0e0e; }
    #map { width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false })
      .setView([${centerLat}, ${centerLng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Car icon
    var carIcon = L.divIcon({
      className: '',
      html: '<div style="width:36px;height:36px;background:#9cff93;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid #fff;">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="#001a00">' +
            '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>' +
            '</svg></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Destination pin icon
    var destIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;background:#ff4444;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    var driverMarker = L.marker([${centerLat}, ${centerLng}], { icon: carIcon, opacity: 0 }).addTo(map);
    var centeredOnce = false;
    var routeLayer = null;
    var routeCoords = [];
    var lastRouteTime = 0;
    var updateCount = 0;
    var DEST_LAT = ${hasDestCoords ? destLat : 'null'};
    var DEST_LNG = ${hasDestCoords ? destLng : 'null'};

    ${destMarker}

    // Point-to-segment distance in degrees
    function distToSegmentDeg(p, a, b) {
      var dx = b[0]-a[0], dy = b[1]-a[1];
      if (dx===0 && dy===0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
      var t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx+dy*dy)));
      return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
    }

    // Degrees → meters (approximate)
    function degToMeters(deg) { return deg * 111320; }

    function distFromRoute(lat, lng) {
      if (routeCoords.length < 2) return Infinity;
      var min = Infinity;
      for (var i = 0; i < routeCoords.length-1; i++) {
        var d = degToMeters(distToSegmentDeg([lat, lng], routeCoords[i], routeCoords[i+1]));
        if (d < min) min = d;
      }
      return min;
    }

    function fetchRoute(lat, lng) {
      if (!DEST_LAT || !DEST_LNG) return;
      var url = 'https://router.project-osrm.org/route/v1/driving/'
        + lng + ',' + lat + ';'
        + DEST_LNG + ',' + DEST_LAT
        + '?overview=full&geometries=geojson';
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.routes || !data.routes[0]) return;
          if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
          var geom = data.routes[0].geometry;
          routeLayer = L.geoJSON(geom, {
            style: { color: '#ff4444', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }
          }).addTo(map);
          routeLayer.bringToBack();
          routeCoords = geom.coordinates.map(function(c) { return [c[1], c[0]]; });
          lastRouteTime = Date.now();
        })
        .catch(function() {});
    }

    function updateDriverPosition(lat, lng) {
      driverMarker.setLatLng([lat, lng]);
      driverMarker.setOpacity(1);

      if (!centeredOnce) {
        map.setView([lat, lng], 15);
        centeredOnce = true;
        fetchRoute(lat, lng);
      } else {
        updateCount++;
        // Check deviation every 5 updates (~15s). Reroute if >60m off and >25s since last route.
        if (updateCount % 5 === 0 && DEST_LAT) {
          var dist = distFromRoute(lat, lng);
          if (dist > 60 && Date.now() - lastRouteTime > 25000) {
            fetchRoute(lat, lng);
          }
        }
      }

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
      }
    }
  </script>
</body>
</html>`;
}

export default function TripTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AvisosStackParamList, 'TripTracking'>>();
  const { tripId, driverName, destZone, destLat, destLng, isDriver } = route.params as TrackingParams;
  const webViewRef = useRef<WebView>(null);
  const [hasPosition, setHasPosition] = useState(false);

  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    webViewRef.current?.injectJavaScript(`updateDriverPosition(${lat}, ${lng}); true;`);
    setHasPosition(true);
  }, []);

  // Passenger: receive driver position via socket
  const { connected: socketConnected } = useTripTracking(
    isDriver ? '' : tripId,
    { onLocationUpdate: handleLocationUpdate }
  );

  // Driver: show own GPS position locally (already transmitting via useLocationTracking)
  useEffect(() => {
    if (!isDriver) return;
    let sub: Location.LocationSubscription | null = null;
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (active) handleLocationUpdate(current.coords.latitude, current.coords.longitude);

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 0 },
        (loc) => { if (active) handleLocationUpdate(loc.coords.latitude, loc.coords.longitude); }
      );
    })();

    return () => { active = false; sub?.remove(); };
  }, [isDriver, handleLocationUpdate]);

  const connected = isDriver ? true : socketConnected;

  const mapHtml = buildMapHtml(destLat, destLng);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seguimiento</Text>
        <View style={styles.connectionIndicator}>
          <View style={[styles.connectionDot, { backgroundColor: connected ? colors.primary : '#ff6b4a' }]} />
          <Text style={styles.connectionText}>{connected ? 'Conectado' : 'Conectando...'}</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          scrollEnabled={false}
        />

        {/* Waiting overlay */}
        {!hasPosition && (
          <View style={styles.waitingOverlay}>
            <View style={styles.waitingCard}>
              <Ionicons name="locate-outline" size={24} color={colors.primary} />
              <Text style={styles.waitingText}>Esperando ubicación del conductor...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Driver info card */}
      <View style={styles.infoCard}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {driverName?.[0]?.toUpperCase() ?? 'C'}
            </Text>
          </View>
          <View>
            <Text style={styles.driverLabel}>Conductor</Text>
            <Text style={styles.driverName}>{driverName}</Text>
          </View>
        </View>
        <View style={styles.destInfo}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={styles.destText} numberOfLines={1}>{destZone}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(14,14,14,0.6)',
  },
  waitingCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  waitingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.surfaceContainer,
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: colors.primary,
  },
  driverLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  driverName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text,
  },
  destInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
});
