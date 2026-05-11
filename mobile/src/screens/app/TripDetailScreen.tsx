import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BuscarStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { tripsApi } from '../../api/trips.api';
import { requestsApi } from '../../api/requests.api';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<BuscarStackParamList, 'TripDetail'>;

function Initials({ name, size = 52 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0][0];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>
        {initials.toUpperCase()}
      </Text>
    </View>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function TripDetailScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTripById(tripId).then(r => r.data.trip),
  });

  const { mutate: sendRequest } = useMutation({
    mutationFn: () => requestsApi.createRequest(tripId),
    onMutate: () => setRequesting(true),
    onSuccess: () => {
      setRequesting(false);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      Alert.alert('¡Solicitud enviada!', 'El conductor revisará tu solicitud pronto.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      setRequesting(false);
      const msg = err?.response?.data?.error || 'No se pudo enviar la solicitud';
      Alert.alert('Error', msg);
    },
  });

  function handleRequest() {
    if (!data) return;
    if (data.driverId === user?.id) {
      Alert.alert('No disponible', 'No puedes solicitar tu propio viaje');
      return;
    }
    Alert.alert(
      'Confirmar solicitud',
      `¿Confirmas tu solicitud para el viaje de ${data.driver.fullName}?\n${data.originZone} → ${data.destinationZone}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Solicitar', onPress: () => sendRequest() },
      ]
    );
  }

  const rules = data?.rules
    ? data.rules.split('\n').filter(Boolean)
    : data?.notes
      ? [data.notes]
      : [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.loadingBox}>
          <Ionicons name="wifi-outline" size={48} color={colors.textDim} />
          <Text style={styles.errorText}>No se pudo cargar el viaje</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnTrip = data.driverId === user?.id;
  const firstName = data.driver.fullName.split(' ')[0];
  const lastName = data.driver.fullName.split(' ').slice(-1)[0];
  const shortName = `${firstName} ${lastName[0]}.`;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Viaje</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Conductor */}
        <View style={styles.section}>
          <View style={styles.driverRow}>
            <Initials name={data.driver.fullName} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{shortName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.primary} />
                <Text style={styles.ratingText}>{data.driver.reputationScore.toFixed(1)}</Text>
                {data.driver.career && (
                  <>
                    <Text style={styles.dot}> • </Text>
                    <Text style={styles.careerText}>{data.driver.career}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Vehículo */}
          {data.driver.vehicle && (
            <View style={styles.vehicleCard}>
              <View>
                <Text style={styles.vehicleName}>
                  {data.driver.vehicle.brand} {data.driver.vehicle.model}
                </Text>
                <Text style={styles.vehicleSub}>
                  {data.driver.vehicle.color}
                  {data.driver.vehicle.year ? ` • ${data.driver.vehicle.year}` : ''}
                </Text>
              </View>
              {data.driver.vehicle.plateNumber && (
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{data.driver.vehicle.plateNumber}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Ruta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruta del Viaje</Text>
          <Text style={styles.dateText}>{formatDate(data.departureTime)}</Text>

          <View style={styles.routeContainer}>
            {/* Origen */}
            <View style={styles.routeRow}>
              <View style={styles.routeLeft}>
                <View style={styles.dotWhite} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeContent}>
                <View style={styles.routeTopRow}>
                  <Text style={styles.routeZone}>{data.originZone}</Text>
                  <Text style={styles.routeTime}>{formatTime(data.departureTime)}</Text>
                </View>
              </View>
            </View>

            {/* Destino */}
            <View style={styles.routeRow}>
              <View style={styles.routeLeft}>
                <View style={styles.dotGreen} />
              </View>
              <View style={styles.routeContent}>
                <View style={styles.routeTopRow}>
                  <Text style={[styles.routeZone, { color: colors.primary }]}>
                    {data.destinationZone}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats precio + asientos */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="cash-outline" size={22} color={colors.primary} />
              <Text style={styles.statValue}>${parseFloat(String(data.pricePerSeat)).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Aporte sugerido</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
              <Text style={styles.statValue}>{data.availableSeats}</Text>
              <Text style={styles.statLabel}>Asientos disp.</Text>
            </View>
          </View>
        </View>

        {/* Reglas */}
        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reglas del Viaje</Text>
            <View style={styles.rulesList}>
              {rules.map((rule, i) => (
                <View key={i} style={styles.ruleItem}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón fijo abajo */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleRequest}
          disabled={requesting || isOwnTrip || data.availableSeats === 0}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isOwnTrip || data.availableSeats === 0
              ? [colors.surfaceHigh, colors.surfaceHigh]
              : ['#9cff93', '#00fc40']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.requestBtn}
          >
            {requesting ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <Text style={[
                styles.requestBtnText,
                (isOwnTrip || data.availableSeats === 0) && { color: colors.textMuted },
              ]}>
                {isOwnTrip
                  ? 'Tu viaje'
                  : data.availableSeats === 0
                    ? 'Sin asientos disponibles'
                    : 'Solicitar Unirse  →'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.text,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  section: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.text,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'capitalize',
    marginTop: -4,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  driverInfo: {
    gap: 6,
  },
  driverName: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  dot: {
    color: colors.textDim,
    fontSize: 14,
  },
  careerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  vehicleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  vehicleName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  vehicleSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  plateBadge: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  plateText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1,
  },
  routeContainer: {
    gap: 0,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  routeLeft: {
    alignItems: 'center',
    width: 16,
    paddingTop: 4,
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.textDim,
    marginVertical: 4,
    minHeight: 24,
  },
  dotWhite: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeContent: {
    flex: 1,
    paddingBottom: 16,
  },
  routeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeZone: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  routeTime: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.background,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  rulesList: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    padding: 12,
  },
  ruleText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  requestBtn: {
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
});
