import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../../theme';
import { tripsApi, Trip } from '../../api/trips.api';
import { useAuthStore } from '../../store/authStore';
import type { PublicarStackParamList } from '../../navigation/MainTabs';

type NavProp = NativeStackNavigationProp<PublicarStackParamList, 'HomeConductor'>;

function minutesUntil(dateStr: string): string {
  const diff = Math.round((new Date(dateStr).getTime() - Date.now()) / 60000);
  if (diff <= 0) return 'Saliendo ahora';
  if (diff < 60) return `Sale en ${diff} min`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = new Date(dateStr);
  if (d.toDateString() === tomorrow.toDateString()) {
    return `Mañana, ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  const h = Math.floor(diff / 60);
  return `Sale en ${h}h`;
}

function statusConfig(status: Trip['status']) {
  switch (status) {
    case 'IN_PROGRESS': return { label: 'En curso', color: colors.primary, bg: '#1a3322', icon: 'car' as const };
    case 'SCHEDULED':   return { label: 'Programado', color: colors.textMuted, bg: colors.surfaceHigh, icon: 'calendar' as const };
    case 'COMPLETED':   return { label: 'Completado', color: colors.textDim, bg: colors.surfaceHigh, icon: 'checkmark-circle' as const };
    case 'CANCELLED':   return { label: 'Cancelado', color: '#ff6b4a', bg: '#2a1a15', icon: 'close-circle' as const };
  }
}

function TripCard({
  trip,
  onManage,
  onStart,
  onComplete,
  onEdit,
  onCancel,
}: {
  trip: Trip;
  onManage: () => void;
  onStart: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const cfg = statusConfig(trip.status);
  const accepted = trip.totalSeats - trip.availableSeats;
  const isScheduled = trip.status === 'SCHEDULED';
  const isInProgress = trip.status === 'IN_PROGRESS';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.tripIcon, { backgroundColor: isInProgress ? '#1a3322' : colors.surfaceHigh }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={styles.cardRoute}>
        {trip.originZone} → {trip.destinationZone}
      </Text>
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={styles.timeText}>{minutesUntil(trip.departureTime)}</Text>
      </View>

      <View style={styles.passengersRow}>
        <Ionicons name="people-outline" size={16} color={colors.textMuted} />
        <Text style={styles.passengersText}>
          {accepted}/{trip.totalSeats} Pasajeros
        </Text>
      </View>

      <View style={styles.cardActions}>
        {isScheduled && (
          <TouchableOpacity style={styles.actionBtnGreen} onPress={onStart}>
            <Ionicons name="play" size={14} color={colors.primaryDark} />
            <Text style={styles.actionBtnGreenText}>Iniciar</Text>
          </TouchableOpacity>
        )}
        {isInProgress && (
          <TouchableOpacity style={styles.actionBtnComplete} onPress={onComplete}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
            <Text style={styles.actionBtnCompleteText}>Completar</Text>
          </TouchableOpacity>
        )}
        {isScheduled && (
          <TouchableOpacity style={styles.actionBtnOutline} onPress={onManage}>
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={styles.actionBtnOutlineText}>Solicitudes</Text>
          </TouchableOpacity>
        )}
        {isScheduled && (
          <TouchableOpacity style={styles.actionBtnGhost} onPress={onEdit}>
            <Ionicons name="create-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {isScheduled && (
          <TouchableOpacity style={styles.actionBtnDanger} onPress={onCancel}>
            <Ionicons name="trash-outline" size={14} color="#ff6b4a" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function HomeConductorScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-trips', user?.id],
    queryFn: () => tripsApi.getMyTrips(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const { mutate: startTrip } = useMutation({
    mutationFn: (id: string) => tripsApi.updateTripStatus(id, 'IN_PROGRESS'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-trips'] }),
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'No se pudo iniciar el viaje'),
  });

  const { mutate: cancelTrip } = useMutation({
    mutationFn: (id: string) => tripsApi.cancelTrip(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-trips'] }),
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'No se pudo cancelar el viaje'),
  });

  const { mutate: completeTrip } = useMutation({
    mutationFn: (id: string) => tripsApi.updateTripStatus(id, 'COMPLETED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-trips'] }),
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'No se pudo completar el viaje'),
  });

  function handleStart(id: string) {
    Alert.alert('Iniciar viaje', '¿Estás listo para iniciar este viaje?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Iniciar', onPress: () => startTrip(id) },
    ]);
  }

  function handleCancel(id: string) {
    Alert.alert('Cancelar viaje', '¿Seguro que quieres cancelar este viaje? Esta acción notificará a los pasajeros.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelTrip(id) },
    ]);
  }

  function handleComplete(id: string) {
    Alert.alert('Completar viaje', '¿Confirmas que el viaje ha finalizado?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, completar', onPress: () => completeTrip(id) },
    ]);
  }

  const trips = data?.trips ?? [];
  const activeTrips = trips.filter(t => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>U-Ride</Text>
          <Text style={styles.logoSub}>Movilidad Universitaria</Text>
        </View>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>
            {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
          </Text>
        </View>
      </View>

      <FlatList
        data={activeTrips}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.pageTitle}>Panel del Conductor</Text>

            {/* CTA Publicar */}
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateTrip')}
              activeOpacity={0.85}
              style={{ marginBottom: 20 }}
            >
              <LinearGradient
                colors={['#9cff93', '#00fc40']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.publishBtn}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primaryDark} />
                <Text style={styles.publishBtnText}>Publicar Viaje</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Estado */}
            <View style={styles.statusCard}>
              <View>
                <Text style={styles.statusLabel}>ESTADO</Text>
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={styles.statusText}>Activo y listo</Text>
                </View>
              </View>
              <Ionicons name="car" size={48} color={colors.surfaceHigh} />
            </View>

            {activeTrips.length > 0 && (
              <Text style={styles.sectionTitle}>Mis Viajes Activos</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onManage={() => navigation.navigate('Solicitudes', { tripId: item.id })}
            onStart={() => handleStart(item.id)}
            onComplete={() => handleComplete(item.id)}
            onEdit={() => navigation.navigate('EditTrip', { tripId: item.id })}
            onCancel={() => handleCancel(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="git-branch-outline" size={40} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Publicar otro viaje</Text>
              <Text style={styles.emptySub}>Optimiza tu ruta.</Text>
            </View>
          )
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
  },
  logoSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  avatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
  },
  listHeader: {
    paddingTop: 16,
  },
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.text,
    marginBottom: 20,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    height: 56,
  },
  publishBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  statusLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  cardRoute: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  passengersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passengersText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
    paddingTop: 10,
    marginTop: 2,
  },
  actionBtnGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 36,
  },
  actionBtnGreenText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    height: 36,
  },
  actionBtnOutlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  actionBtnGhost: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a1a15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnComplete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#1a5c3a',
    borderRadius: 10,
    height: 36,
  },
  actionBtnCompleteText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#9cff93',
  },
  centered: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
  },
});
