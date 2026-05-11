import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AvisosStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { requestsApi, TripRequest } from '../../api/requests.api';

type Tab = 'activas' | 'historial';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'PENDIENTE',  color: '#f5c518', bg: '#2a2510' },
  ACCEPTED:  { label: 'ACEPTADO',   color: colors.primary, bg: '#1a3322' },
  COMPLETED: { label: 'COMPLETADO', color: colors.primary, bg: '#1a3322' },
  REJECTED:  { label: 'RECHAZADO',  color: '#ff6b4a', bg: '#2a1a15' },
  CANCELLED: { label: 'CANCELADO',  color: '#888',    bg: '#1e1e1e' },
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function Initials({ name, size = 40 }: { name: string; size?: number }) {
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

function RequestCard({
  item,
  onCancel,
  cancelling,
  onTrack,
  onPay,
}: {
  item: TripRequest;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onTrack: (item: TripRequest) => void;
  onPay: (requestId: string) => void;
}) {
  const trip = item.trip;
  const driver = trip?.driver;
  const badge = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
  const isPending = item.status === 'PENDING';
  const isCancelled = item.status === 'CANCELLED' || item.status === 'REJECTED';
  const isAccepted = item.status === 'ACCEPTED';
  const canTrack = isAccepted && trip?.status === 'IN_PROGRESS';
  const alreadyPaid = !!item.payment;
  const canPayBefore = isAccepted && trip?.status !== 'IN_PROGRESS' && !alreadyPaid;
  const canPayDuring = isAccepted && trip?.status === 'IN_PROGRESS' && !alreadyPaid;

  function handleCancel() {
    Alert.alert(
      'Cancelar solicitud',
      '¿Seguro que quieres cancelar esta solicitud?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => onCancel(item.id) },
      ]
    );
  }

  return (
    <View style={[styles.card, isCancelled && styles.cardDimmed]}>
      {/* Badge + ruta */}
      <View style={styles.cardTop}>
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, isCancelled && styles.dotDim]} />
            <View>
              <Text style={styles.routeLabel}>Origen</Text>
              <Text style={[styles.routeZone, isCancelled && styles.textDim]}>
                {trip?.originZone ?? '—'}
              </Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotGreen, isCancelled && styles.dotDim]} />
            <View>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={[styles.routeZone, isCancelled && styles.textDim]}>
                {trip?.destinationZone ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Conductor */}
      <View style={styles.driverRow}>
        {driver ? (
          <Initials name={driver.fullName} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { width: 40, height: 40, borderRadius: 20 }]}>
            <Ionicons name="person-outline" size={18} color={colors.textDim} />
          </View>
        )}
        <View style={{ gap: 2 }}>
          <Text style={[styles.driverName, isCancelled && styles.textDim]}>
            {driver
              ? `${driver.fullName.split(' ')[0]} ${driver.fullName.split(' ').slice(-1)[0][0]}.`
              : 'Buscando conductor...'}
          </Text>
          {driver && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.ratingText}>{driver.reputationScore.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer: fecha + precio + acción */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.dateText, isCancelled && styles.textDim]}>
            {trip?.departureTime ? formatDateTime(trip.departureTime) : '—'}
          </Text>
          <Text style={[styles.priceText, isCancelled && styles.priceStrike]}>
            ${trip?.pricePerSeat != null ? parseFloat(String(trip.pricePerSeat)).toFixed(2) : '0.00'}
          </Text>
        </View>

        <View style={styles.actionsCol}>
          {canTrack && (
            <TouchableOpacity style={styles.trackBtn} onPress={() => onTrack(item)}>
              <Ionicons name="navigate-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.trackBtnText}>Ver en mapa</Text>
            </TouchableOpacity>
          )}

          {canPayDuring && (
            <TouchableOpacity style={styles.payNowBtn} onPress={() => onPay(item.id)}>
              <Ionicons name="card" size={14} color={colors.primaryDark} />
              <Text style={styles.payNowText}>Pagar ahora</Text>
            </TouchableOpacity>
          )}

          {canPayBefore && (
            <TouchableOpacity style={styles.payBeforeBtn} onPress={() => onPay(item.id)}>
              <Ionicons name="card-outline" size={14} color="#1a1a1a" />
              <Text style={styles.payBeforeText}>Pagar reserva</Text>
            </TouchableOpacity>
          )}

          {alreadyPaid && isAccepted && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.paidText}>PAGADO</Text>
            </View>
          )}

          {isPending && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#ff6b4a" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<AvisosStackParamList, 'Avisos'>;

export default function AvisosScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('activas');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => requestsApi.getMyRequests().then(r => r.data.requests),
    refetchInterval: 15_000,
  });

  const { mutate: cancelRequest } = useMutation({
    mutationFn: (id: string) => requestsApi.cancelRequest(id),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => setCancellingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-requests'] }),
    onError: () => Alert.alert('Error', 'No se pudo cancelar la solicitud'),
  });

  const requests = data ?? [];
  const activas = requests.filter(r => r.status === 'PENDING' || r.status === 'ACCEPTED');
  const historial = requests.filter(r =>
    r.status === 'COMPLETED' || r.status === 'REJECTED' || r.status === 'CANCELLED'
  );
  const displayed = tab === 'activas' ? activas : historial;

  const emptyMessage = tab === 'activas'
    ? { title: 'Sin solicitudes activas', sub: 'Busca un viaje y solicita unirte' }
    : { title: 'Sin historial aún', sub: 'Tus viajes completados aparecerán aquí' };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>U-RIDE</Text>
        <Text style={styles.pageTitle}>Mis Solicitudes</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'activas' && styles.tabBtnActive]}
          onPress={() => setTab('activas')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'activas' && styles.tabTextActive]}>
            Activas
          </Text>
          {activas.length > 0 && (
            <View style={styles.badge2}>
              <Text style={styles.badge2Text}>{activas.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'historial' && styles.tabBtnActive]}
          onPress={() => setTab('historial')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'historial' && styles.tabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="wifi-outline" size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>Error de conexión</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onCancel={cancelRequest}
              cancelling={cancellingId === item.id}
              onPay={() => Alert.alert('Pago próximamente', 'La funcionalidad de pago estará disponible muy pronto.')}
              onTrack={(req) => navigation.navigate('TripTracking', {
                tripId: req.trip!.id,
                driverName: req.trip?.driver?.fullName ?? 'Conductor',
                destZone: req.trip?.destinationZone ?? '',
                destLat: req.trip?.destLat ?? undefined,
                destLng: req.trip?.destLng ?? undefined,
              })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="car-outline" size={56} color={colors.textDim} />
              <Text style={styles.emptyTitle}>{emptyMessage.title}</Text>
              <Text style={styles.emptySubtext}>{emptyMessage.sub}</Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 2,
  },
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
    marginTop: 4,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceHigh,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  badge2: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badge2Text: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.primaryDark,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 40,
  },
  emptyTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
  },
  retryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  // Card
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardDimmed: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeBlock: {
    gap: 4,
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
    marginTop: 4,
  },
  dotGreen: {
    backgroundColor: colors.primary,
  },
  dotDim: {
    backgroundColor: colors.textDim,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: colors.textDim,
    marginLeft: 4,
  },
  routeLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  routeZone: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  textDim: {
    color: colors.textDim,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    borderColor: colors.textDim,
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  driverName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  priceText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  priceStrike: {
    textDecorationLine: 'line-through',
    color: colors.textDim,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#ff6b4a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#ff6b4a',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trackBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  actionsCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1a3322',
  },
  paidText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  payBeforeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5c518',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  payBeforeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#1a1a1a',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  payNowText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
});
