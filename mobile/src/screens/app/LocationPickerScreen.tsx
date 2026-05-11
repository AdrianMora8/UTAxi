import { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { useLocationPickerStore } from '../../store/locationPickerStore';

// Ambato, Ecuador center
const AMBATO_LAT = -1.2543;
const AMBATO_LNG = -78.6229;

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { height:100%; background:#111; color:#fff; font-family:-apple-system,sans-serif; }
    body { display:flex; flex-direction:column; height:100vh; overflow:hidden; }

    #search-bar {
      position:absolute; top:0; left:0; right:0; z-index:1000;
      padding:10px 12px 0;
      background:rgba(15,15,15,0.96);
    }
    #search-input {
      width:100%; padding:11px 14px; border-radius:12px;
      border:1.5px solid #2a2a2a; background:#1a1a1a; color:#fff;
      font-size:15px; outline:none;
    }
    #search-input::placeholder { color:#555; }
    #suggestions {
      margin-top:4px; border-radius:12px; overflow:hidden;
      max-height:200px; overflow-y:auto;
    }
    .suggestion {
      padding:11px 14px; background:#1a1a1a;
      border-bottom:1px solid #222; cursor:pointer;
      font-size:13px; color:#ccc; line-height:1.3;
    }
    .suggestion:last-child { border-bottom:none; }

    #map { flex:1; position:relative; z-index:1; }

    #confirm-bar {
      padding:12px 14px 14px;
      background:rgba(15,15,15,0.96);
      border-top:1px solid #222;
    }
    #address-label {
      font-size:12px; color:#9cff93; margin-bottom:8px;
      text-align:center; min-height:18px;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    #confirm-btn {
      width:100%; padding:15px; background:#9cff93;
      color:#0a1a10; font-weight:700; font-size:15px;
      border:none; border-radius:12px; cursor:pointer;
      letter-spacing:0.5px;
    }
    #confirm-btn:disabled { opacity:0.35; }
    .leaflet-control-attribution { display:none; }
  </style>
</head>
<body>
  <div id="search-bar">
    <input id="search-input" type="text" placeholder="Buscar calle, barrio, sector..." autocomplete="off"/>
    <div id="suggestions"></div>
  </div>

  <div id="map"></div>

  <div id="confirm-bar">
    <div id="address-label">Toca el mapa o arrastra el pin para elegir</div>
    <button id="confirm-btn" disabled>Confirmar ubicación</button>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var lat = ${AMBATO_LAT}, lng = ${AMBATO_LNG};
    var currentAddress = '';
    var debounceTimer = null;
    var geocodeTimer = null;

    var map = L.map('map', { zoomControl:true, tap:true })
               .setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    var pinIcon = L.divIcon({
      className: '',
      html: '<div style="display:flex;flex-direction:column;align-items:center;width:28px">'
          + '<div style="width:28px;height:28px;background:#9cff93;border-radius:50% 50% 50% 0;'
          + 'transform:rotate(-45deg);border:3px solid #fff;'
          + 'box-shadow:0 2px 10px rgba(0,0,0,0.5)"></div>'
          + '<div style="width:3px;height:12px;background:#9cff93;border-radius:2px;margin-top:1px"></div>'
          + '</div>',
      iconSize: [28, 44],
      iconAnchor: [14, 44],
    });

    var marker = L.marker([lat, lng], { draggable:true, icon:pinIcon }).addTo(map);

    function setAddress(addr) {
      currentAddress = addr || '';
      var el = document.getElementById('address-label');
      el.textContent = currentAddress || 'Sin dirección detectada';
      document.getElementById('confirm-btn').disabled = !currentAddress;
    }

    function reverseGeocode(lt, ln) {
      clearTimeout(geocodeTimer);
      geocodeTimer = setTimeout(function() {
        fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lt + '&lon=' + ln + '&format=json&accept-language=es')
          .then(function(r){ return r.json(); })
          .then(function(d){ setAddress(d.display_name || ''); })
          .catch(function(){ setAddress(''); });
      }, 200);
    }

    marker.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      lat = pos.lat; lng = pos.lng;
      reverseGeocode(lat, lng);
    });

    map.on('click', function(e) {
      lat = e.latlng.lat; lng = e.latlng.lng;
      marker.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    reverseGeocode(lat, lng);

    // Search
    var searchInput = document.getElementById('search-input');
    var suggestionsEl = document.getElementById('suggestions');

    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var q = this.value.trim();
      if (q.length < 3) { suggestionsEl.innerHTML = ''; return; }
      debounceTimer = setTimeout(function(){ doSearch(q); }, 400);
    });

    function doSearch(q) {
      fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q)
            + '&format=json&limit=5&countrycodes=ec&accept-language=es')
        .then(function(r){ return r.json(); })
        .then(function(results){
          suggestionsEl.innerHTML = '';
          results.forEach(function(item) {
            var el = document.createElement('div');
            el.className = 'suggestion';
            el.textContent = item.display_name;
            el.addEventListener('click', function() {
              lat = parseFloat(item.lat);
              lng = parseFloat(item.lon);
              marker.setLatLng([lat, lng]);
              map.setView([lat, lng], 16);
              setAddress(item.display_name);
              suggestionsEl.innerHTML = '';
              searchInput.value = '';
              searchInput.blur();
            });
            suggestionsEl.appendChild(el);
          });
        })
        .catch(function(){});
    }

    document.getElementById('confirm-btn').addEventListener('click', function() {
      var msg = JSON.stringify({ address: currentAddress, lat: lat, lng: lng });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      }
    });

    // Fix render after WebView mount
    setTimeout(function(){ map.invalidateSize(); }, 400);
  </script>
</body>
</html>`;

export default function LocationPickerScreen() {
  const navigation = useNavigation();
  const setResult = useLocationPickerStore((s) => s.setResult);
  const webViewRef = useRef(null);

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.address && parsed.lat && parsed.lng) {
        setResult(parsed);
        navigation.goBack();
      }
    } catch {}
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seleccionar Destino</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mixedContentMode="always"
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f0f0f',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.text,
  },
  webview: {
    flex: 1,
  },
});
