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
import { paymentsApi } from '../../api/payments.api';
import { useStripePayment } from '../../hooks/useStripePayment';

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
  paying,
}: {
  item: TripRequest;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onTrack: (item: TripRequest) => void;
  onPay: (requestId: string) => void;
  paying: boolean;
}) {
  const trip = item.trip;
  const driver = trip?.driver;
  const badge = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
  const isPending = item.status === 'PENDING';
  const isCancelled = item.status === 'CANCELLED' || item.status === 'REJECTED';
  const isAccepted = item.status === 'ACCEPTED';
  const canTrack = isAccepted && trip?.status === 'IN_PROGRESS';
  const alreadyPaid = !!item.payment && item.payment.status === 'CONFIRMED';
  const canPayBefore = isAccepted && trip?.status !== 'IN_PROGRESS' && !alreadyPaid;
  const canPayDuring = isAccepted && trip?.status === 'IN_PROGRESS' && !alreadyPaid;
  const canCancel = isAccepted && trip?.status === 'SCHEDULED';

  function buildCancelDialog() {
    if (!alreadyPaid) {
      return { title: 'Cancelar reserva', message: 'Se devolverá tu cupo al viaje. ¿Confirmas?' };
    }
    const minsLeft = trip?.departureTime
      ? (new Date(trip.departureTime).getTime() - Date.now()) / 60_000
      : 999;
    const amount = item.payment!.amount.toFixed(2);
    if (minsLeft >= 10) {
      return {
        title: 'Cancelar reserva',
        message: `Se reembolsarán $${amount} a tu U-Wallet. ¿Confirmas la cancelación?`,
      };
    }
    return {
      title: 'Cancelar sin reembolso',
      message: `Faltan menos de 10 minutos para el viaje. No se realizará ningún reembolso. ¿Confirmas?`,
    };
  }

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
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={() => onPay(item.id)}
              disabled={paying}
            >
              {paying
                ? <ActivityIndicator size="small" color={colors.primaryDark} />
                : <><Ionicons name="card" size={14} color={colors.primaryDark} /><Text style={styles.payNowText}>Pagar ahora</Text></>
              }
            </TouchableOpacity>
          )}

          {canPayBefore && (
            <TouchableOpacity
              style={styles.payBeforeBtn}
              onPress={() => onPay(item.id)}
              disabled={paying}
            >
              {paying
                ? <ActivityIndicator size="small" color="#1a1a1a" />
                : <><Ionicons name="card-outline" size={14} color="#1a1a1a" /><Text style={styles.payBeforeText}>Pagar reserva</Text></>
              }
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

          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              disabled={cancelling}
              onPress={() => {
                const { title, message } = buildCancelDialog();
                Alert.alert(title, message, [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí, cancelar', style: 'destructive', onPress: () => onCancel(item.id) },
                ]);
              }}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#ff6b4a" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancelar reserva</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<AvisosStackParamList, 'AvisosMain'>;

export default function AvisosScreen({ navigation }: Props) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      if (data.data.refunded) {
        Alert.alert('Reserva cancelada', data.data.message);
      }
    },
    onError: () => Alert.alert('Error', 'No se pudo cancelar la solicitud'),
  });

  const { mutate: walletPay } = useMutation({
    mutationFn: (requestId: string) => paymentsApi.payWithWallet(requestId),
    onMutate: (id) => setPayingId(id),
    onSettled: () => setPayingId(null),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert('Pago exitoso', `Se descontaron $${data.data.amount.toFixed(2)} de tu U-Wallet.`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo procesar el pago';
      Alert.alert('Error al pagar', msg);
    },
  });

  const { mutate: cashPay } = useMutation({
    mutationFn: (requestId: string) => paymentsApi.markAsCash(requestId),
    onMutate: (id) => setPayingId(id),
    onSettled: () => setPayingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      Alert.alert('Efectivo registrado', 'El conductor confirmará tu pago en efectivo al finalizar el viaje.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo registrar el pago en efectivo';
      Alert.alert('Error', msg);
    },
  });

  const { payWithCard } = useStripePayment();

  function handlePay(requestId: string) {
    Alert.alert(
      '¿Cómo quieres pagar?',
      '',
      [
        {
          text: 'U-Wallet',
          onPress: () => walletPay(requestId),
        },
        {
          text: 'Tarjeta de crédito',
          onPress: () => {
            setPayingId(requestId);
            payWithCard(requestId, () => {
              setPayingId(null);
              queryClient.invalidateQueries({ queryKey: ['my-requests'] });
              Alert.alert('¡Pago exitoso!', 'Tu pago con tarjeta fue procesado por Stripe.');
            }).finally(() => setPayingId(null));
          },
        },
        {
          text: 'Pagar en efectivo',
          onPress: () => {
            Alert.alert(
              'Pago en efectivo',
              'Deberás pagar en efectivo al conductor antes de que termine el viaje. ¿Confirmas?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => cashPay(requestId) },
              ],
            );
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  const requests = data ?? [];
  const activas = requests.filter(r => r.status === 'PENDING' || r.status === 'ACCEPTED');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>U-RIDE</Text>
        <Text style={styles.pageTitle}>Mis Solicitudes</Text>
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
          data={activas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onCancel={cancelRequest}
              cancelling={cancellingId === item.id}
              onPay={handlePay}
              paying={payingId === item.id}
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
              <Text style={styles.emptyTitle}>Sin solicitudes activas</Text>
              <Text style={styles.emptySubtext}>Busca un viaje y solicita unirte</Text>
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
    marginBottom: 8,
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
