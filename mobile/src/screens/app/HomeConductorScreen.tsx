import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../../theme';
import { tripsApi, Trip } from '../../api/trips.api';
import { requestsApi, TripRequest } from '../../api/requests.api';
import { paymentsApi, PassengerPaymentStatus } from '../../api/payments.api';
import { useAuthStore } from '../../store/authStore';
import type { PublicarStackParamList } from '../../navigation/MainTabs';
import { useLocationTracking } from '../../hooks/useLocationTracking';

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

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulsingDot, { opacity }]} />;
}

function ActiveTripTracker({ tripId }: { tripId: string }) {
  useLocationTracking(tripId);
  return (
    <View style={styles.trackingBanner}>
      <PulsingDot />
      <Text style={styles.trackingText}>Transmitiendo ubicación</Text>
    </View>
  );
}

function TripCard({
  trip,
  onManage,
  onStart,
  onComplete,
  onEdit,
  onCancel,
  onViewMap,
}: {
  trip: Trip;
  onManage: () => void;
  onStart: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onViewMap: () => void;
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

      {isInProgress && <ActiveTripTracker tripId={trip.id} />}

      <View style={styles.cardActions}>
        {isScheduled && (
          <TouchableOpacity style={styles.actionBtnGreen} onPress={onStart}>
            <Ionicons name="play" size={14} color={colors.primaryDark} />
            <Text style={styles.actionBtnGreenText}>Iniciar</Text>
          </TouchableOpacity>
        )}
        {isInProgress && (
          <TouchableOpacity style={styles.actionBtnMap} onPress={onViewMap}>
            <Ionicons name="navigate-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.actionBtnMapText}>Ver mapa</Text>
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

function PaymentsModal({
  tripId,
  onAllConfirmed,
  onClose,
}: {
  tripId: string;
  onAllConfirmed: () => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trip-payment-status', tripId],
    queryFn: () => paymentsApi.getTripPaymentStatus(tripId).then(r => r.data.passengers),
  });

  const { mutate: confirmCash, isPending: confirmingId } = useMutation({
    mutationFn: (requestId: string) => paymentsApi.confirmCashPayment(requestId),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'No se pudo confirmar el pago'),
  });

  const passengers = data ?? [];
  const allConfirmed = passengers.length > 0 && passengers.every(p => p.paymentStatus === 'CONFIRMED');

  function statusLabel(p: PassengerPaymentStatus) {
    if (p.paymentStatus === 'CONFIRMED') {
      const methodLabel = p.paymentMethod === 'CASH' ? 'Efectivo' : p.paymentMethod === 'WALLET' ? 'U-Wallet' : 'Tarjeta';
      return { label: `Pagado · ${methodLabel}`, color: colors.primary, bg: '#1a3322' };
    }
    if (p.paymentMethod === 'CASH' && p.paymentStatus === 'PENDING') {
      return { label: 'Efectivo pendiente', color: '#f5a623', bg: '#2a2010' };
    }
    return { label: 'Sin pago', color: '#ff6b4a', bg: '#2a1a15' };
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={pmStyles.overlay}>
        <View style={pmStyles.sheet}>
          <View style={pmStyles.handle} />

          <View style={pmStyles.titleRow}>
            <Ionicons name="cash" size={20} color={colors.primary} />
            <Text style={pmStyles.title}>Estado de Pagos</Text>
          </View>
          <Text style={pmStyles.subtitle}>Confirma todos los pagos antes de completar el viaje</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : passengers.length === 0 ? (
            <Text style={pmStyles.emptyText}>No hay pasajeros en este viaje.</Text>
          ) : (
            <ScrollView style={pmStyles.list} showsVerticalScrollIndicator={false}>
              {passengers.map(p => {
                const { label, color, bg } = statusLabel(p);
                const isCashPending = p.paymentMethod === 'CASH' && p.paymentStatus === 'PENDING';
                return (
                  <View key={p.requestId} style={pmStyles.row}>
                    <View style={pmStyles.avatar}>
                      <Text style={pmStyles.avatarText}>{p.passengerName[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={pmStyles.rowInfo}>
                      <Text style={pmStyles.passengerName}>{p.passengerName}</Text>
                      <View style={[pmStyles.statusBadge, { backgroundColor: bg }]}>
                        <Text style={[pmStyles.statusBadgeText, { color }]}>{label}</Text>
                      </View>
                    </View>
                    {isCashPending && (
                      <TouchableOpacity
                        style={pmStyles.confirmBtn}
                        onPress={() => confirmCash(p.requestId)}
                        disabled={confirmingId}
                      >
                        {confirmingId ? (
                          <ActivityIndicator size="small" color={colors.primaryDark} />
                        ) : (
                          <Text style={pmStyles.confirmBtnText}>Confirmar</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {!allConfirmed && passengers.length > 0 && (
            <View style={pmStyles.warningBox}>
              <Ionicons name="warning-outline" size={14} color="#f5a623" />
              <Text style={pmStyles.warningText}>
                Aún hay pagos pendientes. Confirma todos antes de completar el viaje.
              </Text>
            </View>
          )}

          <View style={pmStyles.actions}>
            <TouchableOpacity style={pmStyles.cancelBtn} onPress={onClose}>
              <Text style={pmStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pmStyles.completeBtn, !allConfirmed && pmStyles.completeBtnDisabled]}
              onPress={onAllConfirmed}
              disabled={!allConfirmed}
            >
              <Ionicons name="checkmark-circle" size={16} color={allConfirmed ? colors.primaryDark : colors.textDim} />
              <Text style={[pmStyles.completeBtnText, !allConfirmed && pmStyles.completeBtnTextDisabled]}>
                Completar viaje
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BoardingModal({
  trip,
  onConfirm,
  onClose,
  isLoading,
}: {
  trip: Trip;
  onConfirm: (boardedIds: string[]) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const { data, isLoading: loadingPassengers } = useQuery({
    queryKey: ['trip-requests', trip.id],
    queryFn: () => requestsApi.getRequestsByTrip(trip.id).then(r => r.data.requests),
    select: (reqs) => reqs.filter(r => r.status === 'ACCEPTED'),
  });

  const passengers = data ?? [];
  const [absent, setAbsent] = useState<Set<string>>(new Set());

  function togglePassenger(requestId: string) {
    setAbsent(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  }

  const boardedCount = passengers.length - absent.size;

  function handleConfirm() {
    if (boardedCount === 0) {
      Alert.alert('Sin pasajeros', 'Debes tener al menos un pasajero para iniciar el viaje.');
      return;
    }
    const boardedIds = passengers.filter(p => !absent.has(p.id)).map(p => p.id);
    onConfirm(boardedIds);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={bStyles.overlay}>
        <View style={bStyles.sheet}>
          <View style={bStyles.handle} />

          <View style={bStyles.titleRow}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={bStyles.title}>Lista de Asistencia</Text>
          </View>
          <Text style={bStyles.subtitle}>
            {trip.originZone} → {trip.destinationZone}
          </Text>

          <View style={bStyles.counter}>
            <Text style={bStyles.counterNum}>{boardedCount}</Text>
            <Text style={bStyles.counterOf}> / {passengers.length}</Text>
            <Text style={bStyles.counterLabel}> pasajeros presentes</Text>
          </View>

          {loadingPassengers ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : passengers.length === 0 ? (
            <Text style={bStyles.emptyText}>No hay pasajeros aceptados en este viaje.</Text>
          ) : (
            <ScrollView style={bStyles.list} showsVerticalScrollIndicator={false}>
              {passengers.map(req => {
                const isAbsent = absent.has(req.id);
                return (
                  <TouchableOpacity
                    key={req.id}
                    style={[bStyles.row, isAbsent && bStyles.rowAbsent]}
                    onPress={() => togglePassenger(req.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[bStyles.avatar, isAbsent && bStyles.avatarAbsent]}>
                      <Text style={[bStyles.avatarText, isAbsent && bStyles.avatarTextAbsent]}>
                        {req.passenger?.fullName?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={bStyles.rowInfo}>
                      <Text style={[bStyles.passengerName, isAbsent && bStyles.passengerNameAbsent]}>
                        {req.passenger?.fullName ?? 'Pasajero'}
                      </Text>
                      {req.passenger?.career ? (
                        <Text style={bStyles.passengerCareer}>{req.passenger.career}</Text>
                      ) : null}
                    </View>
                    <View style={[bStyles.toggle, isAbsent ? bStyles.toggleAbsent : bStyles.togglePresent]}>
                      <Ionicons
                        name={isAbsent ? 'close' : 'checkmark'}
                        size={16}
                        color={isAbsent ? '#ff6b4a' : colors.primaryDark}
                      />
                      <Text style={[bStyles.toggleText, isAbsent ? bStyles.toggleTextAbsent : bStyles.toggleTextPresent]}>
                        {isAbsent ? 'No llegó' : 'Llegó'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {absent.size > 0 && (
            <View style={bStyles.warningBox}>
              <Ionicons name="warning-outline" size={14} color="#f5a623" />
              <Text style={bStyles.warningText}>
                {absent.size} pasajero{absent.size > 1 ? 's' : ''} marcado{absent.size > 1 ? 's' : ''} como ausente{absent.size > 1 ? 's' : ''}. Su pago no será reembolsado.
              </Text>
            </View>
          )}

          <View style={bStyles.actions}>
            <TouchableOpacity style={bStyles.cancelBtn} onPress={onClose} disabled={isLoading}>
              <Text style={bStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[bStyles.startBtn, (isLoading || boardedCount === 0) && bStyles.startBtnDisabled]}
              onPress={handleConfirm}
              disabled={isLoading || boardedCount === 0}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <>
                  <Ionicons name="play" size={16} color={colors.primaryDark} />
                  <Text style={bStyles.startBtnText}>Iniciar viaje</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type TabMode = 'active' | 'history';

export default function HomeConductorScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabMode>('active');
  const [boardingTrip, setBoardingTrip] = useState<Trip | null>(null);
  const [paymentsTrip, setPaymentsTrip] = useState<Trip | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-trips', user?.id],
    queryFn: () => tripsApi.getMyTrips(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const { mutate: startTrip, isPending: startingTrip } = useMutation({
    mutationFn: ({ id, boardedRequestIds }: { id: string; boardedRequestIds: string[] }) =>
      tripsApi.startTrip(id, boardedRequestIds),
    onSuccess: () => {
      setBoardingTrip(null);
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
    },
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

  function handleStart(trip: Trip) {
    setBoardingTrip(trip);
  }

  function handleCancel(id: string) {
    Alert.alert('Cancelar viaje', '¿Seguro que quieres cancelar este viaje? Esta acción notificará a los pasajeros.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelTrip(id) },
    ]);
  }

  function handleComplete(trip: Trip) {
    setPaymentsTrip(trip);
  }

  const trips = data?.trips ?? [];
  const activeTrips = trips.filter(t => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS');
  const historyTrips = trips.filter(t => t.status === 'COMPLETED');
  const displayedTrips = tab === 'active' ? activeTrips : historyTrips;

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
        data={displayedTrips}
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

            {/* Tab selector */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
                onPress={() => setTab('active')}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, tab === 'active' && styles.tabBtnTextActive]}>
                  Activos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
                onPress={() => setTab('history')}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
                  Completados
                </Text>
              </TouchableOpacity>
            </View>

            {displayedTrips.length > 0 && (
              <Text style={styles.sectionTitle}>
                {tab === 'active' ? 'Mis Viajes Activos' : 'Historial de Viajes'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onManage={() => navigation.navigate('Solicitudes', { tripId: item.id })}
            onStart={() => handleStart(item)}
            onComplete={() => handleComplete(item)}
            onEdit={() => navigation.navigate('EditTrip', { tripId: item.id })}
            onCancel={() => handleCancel(item.id)}
            onViewMap={() => navigation.navigate('TripTracking', {
              tripId: item.id,
              driverName: user?.fullName ?? 'Conductor',
              destZone: item.destinationZone,
              destLat: item.destLat ?? undefined,
              destLng: item.destLng ?? undefined,
              isDriver: true,
            })}
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
              <Ionicons
                name={tab === 'active' ? 'git-branch-outline' : 'checkmark-done-outline'}
                size={40}
                color={colors.textDim}
              />
              <Text style={styles.emptyTitle}>
                {tab === 'active' ? 'Sin viajes activos' : 'Sin viajes completados'}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'active' ? 'Publica tu primer viaje.' : 'Tus viajes completados aparecerán aquí.'}
              </Text>
            </View>
          )
        }
      />

      {boardingTrip && (
        <BoardingModal
          trip={boardingTrip}
          isLoading={startingTrip}
          onConfirm={(boardedIds) => startTrip({ id: boardingTrip.id, boardedRequestIds: boardedIds })}
          onClose={() => setBoardingTrip(null)}
        />
      )}

      {paymentsTrip && (
        <PaymentsModal
          tripId={paymentsTrip.id}
          onAllConfirmed={() => {
            setPaymentsTrip(null);
            completeTrip(paymentsTrip.id);
          }}
          onClose={() => setPaymentsTrip(null)}
        />
      )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceHigh,
  },
  tabBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textDim,
  },
  tabBtnTextActive: {
    color: colors.text,
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
  actionBtnMap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 36,
  },
  actionBtnMapText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
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
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a3322',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  trackingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
});

const pmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHigh,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  list: {
    maxHeight: 260,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    marginVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primary,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  passengerName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#2a2010',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#f5a623',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  completeBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeBtnDisabled: {
    backgroundColor: colors.surfaceHigh,
  },
  completeBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
  completeBtnTextDisabled: {
    color: colors.textDim,
  },
});

const bStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHigh,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  counterNum: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primary,
  },
  counterOf: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textMuted,
  },
  counterLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  list: {
    maxHeight: 260,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    marginVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHigh,
  },
  rowAbsent: {
    opacity: 0.6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a3322',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAbsent: {
    backgroundColor: '#2a1a15',
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primary,
  },
  avatarTextAbsent: {
    color: '#ff6b4a',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  passengerName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  passengerNameAbsent: {
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  passengerCareer: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  togglePresent: {
    backgroundColor: '#1a3322',
  },
  toggleAbsent: {
    backgroundColor: '#2a1a15',
  },
  toggleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  toggleTextPresent: {
    color: colors.primary,
  },
  toggleTextAbsent: {
    color: '#ff6b4a',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#2a2010',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#f5a623',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  startBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
});
