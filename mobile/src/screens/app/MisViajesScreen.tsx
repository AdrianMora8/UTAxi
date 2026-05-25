import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PerfilStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { requestsApi, TripRequest } from '../../api/requests.api';
import { paymentsApi } from '../../api/payments.api';
import { reportsApi, type ReportReason } from '../../api/reports.api';
import RatingModal from '../../components/RatingModal';
import { useNotifications } from '../../hooks/useNotifications';
import { useStripePayment } from '../../hooks/useStripePayment';

type Props = NativeStackScreenProps<PerfilStackParamList, 'MisViajes'>;

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('es-EC', { month: 'short' }).toUpperCase();
  const time = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${month}, ${time}`;
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

const MAX_REJECTIONS = 3;

function TripRequestCard({
  item,
  onCancel,
  cancelling,
  onRate,
  onRetry,
  retrying,
  onPay,
  paying,
  onReport,
}: {
  item: TripRequest;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onRate: (requestId: string, driverName: string) => void;
  onRetry: (tripId: string) => void;
  retrying: boolean;
  onPay: (requestId: string) => void;
  paying: boolean;
  onReport: (driverId: string, driverName: string) => void;
}) {
  const isCompleted = item.status === 'COMPLETED';
  const isRejected = item.status === 'REJECTED';
  const isCancelled = item.status === 'CANCELLED';
  const isDimmed = isCancelled || isRejected;
  const isPending = item.status === 'PENDING';
  const isAccepted = item.status === 'ACCEPTED';
  const canRate = isCompleted && !item.rating;
  const canRetry = isRejected && (item.rejectionCount ?? 0) < MAX_REJECTIONS;

  const tripInProgress = item.trip?.status === 'IN_PROGRESS';
  const alreadyPaid = !!item.payment && item.payment.status === 'CONFIRMED';
  const isCashPending = !!item.payment && item.payment.method === 'CASH' && item.payment.status === 'PENDING';
  const canPayBefore = isAccepted && !tripInProgress && !alreadyPaid && !isCashPending;
  const canPayDuring = isAccepted && tripInProgress && !alreadyPaid && !isCashPending;
  const canCancel = isAccepted && item.trip?.status === 'SCHEDULED';

  const trip = item.trip;
  const driver = trip?.driver;

  function buildCancelDialog() {
    if (!alreadyPaid) {
      return {
        title: 'Cancelar reserva',
        message: 'Se devolverá tu cupo al viaje. ¿Confirmas?',
      };
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
      message: `Faltan menos de 10 minutos para el viaje. No se realizará ningún reembolso. ¿Confirmas la cancelación?`,
    };
  }

  function statusBadge() {
    if (isCompleted)  return { label: 'COMPLETADO', color: colors.primary, bg: '#1a3322' };
    if (isRejected)   return { label: 'RECHAZADO',  color: '#ff6b4a', bg: '#2a1a15' };
    if (isCancelled)  return { label: 'CANCELADO',  color: '#ff6b4a', bg: '#2a1a15' };
    if (isPending)    return { label: 'PENDIENTE',  color: '#f5c518', bg: '#2a2510' };
    if (isAccepted)   return { label: 'ACEPTADO',   color: colors.primary, bg: '#1a3322' };
    return { label: item.status, color: colors.textMuted, bg: colors.surfaceHigh };
  }

  const badge = statusBadge();

  return (
    <View style={[styles.card, isDimmed && styles.cardDimmed]}>
      {/* Ruta + badge */}
      <View style={styles.cardTop}>
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, isDimmed && styles.dotDim]} />
            <View>
              <Text style={[styles.routeLabel, isDimmed && styles.textDim]}>Origen</Text>
              <Text style={[styles.routeZone, isDimmed && styles.textDim]}>
                {trip?.originZone ?? '—'}
              </Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotGreen, isDimmed && styles.dotDim]} />
            <View>
              <Text style={[styles.routeLabel, isDimmed && styles.textDim]}>Destino</Text>
              <Text style={[styles.routeZone, isDimmed && styles.textDim]}>
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.driverName, isDimmed && styles.textDim]}>
            {driver ? driver.fullName.split(' ')[0] + ' ' + driver.fullName.split(' ').slice(-1)[0][0] + '.' : 'Conductor'}
          </Text>
          {driver && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.ratingText}>{driver.reputationScore.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {isRejected && (
          <Text style={styles.rejectionCount}>
            {item.rejectionCount ?? 0}/{MAX_REJECTIONS} rechazos
          </Text>
        )}
      </View>

      {/* Footer: fecha + precio + acciones */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.dateText, isDimmed && styles.textDim]}>
            {trip?.departureTime ? formatDateTime(trip.departureTime) : '—'}
          </Text>
          <Text style={[styles.priceText, isDimmed && styles.priceStrike]}>
            ${trip?.pricePerSeat != null ? parseFloat(String(trip.pricePerSeat)).toFixed(2) : '0.00'}
          </Text>
        </View>

        {isPending && (
          <TouchableOpacity
            style={styles.cancelBtn}
            disabled={cancelling}
            onPress={() =>
              Alert.alert(
                'Cancelar solicitud',
                '¿Seguro que quieres cancelar esta solicitud?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí, cancelar', style: 'destructive', onPress: () => onCancel(item.id) },
                ]
              )
            }
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

        {canRate && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => onRate(item.id, driver?.fullName ?? 'Conductor')}
          >
            <Ionicons name="star-outline" size={14} color={colors.text} />
            <Text style={styles.rateBtnText}>Calificar</Text>
          </TouchableOpacity>
        )}

        {isCompleted && driver && (
          <TouchableOpacity
            style={styles.reportDriverBtn}
            onPress={() => onReport(driver.id, driver.fullName)}
          >
            <Ionicons name="flag-outline" size={14} color="#ff6b4a" />
            <Text style={styles.reportDriverText}>Reportar</Text>
          </TouchableOpacity>
        )}

        {canRetry && item.trip && (
          <TouchableOpacity
            style={styles.retryTripBtn}
            disabled={retrying}
            onPress={() => onRetry(item.trip!.id)}
          >
            {retrying ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={14} color={colors.primaryDark} />
                <Text style={styles.retryTripText}>Reintentar</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isRejected && !canRetry && (
          <View style={styles.blockedBadge}>
            <Ionicons name="ban-outline" size={14} color="#ff6b4a" />
            <Text style={styles.blockedText}>Bloqueado</Text>
          </View>
        )}

        {alreadyPaid && isAccepted && (
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={styles.paidText}>PAGADO</Text>
          </View>
        )}

        {isCashPending && (
          <View style={styles.cashPendingBadge}>
            <Ionicons name="cash-outline" size={14} color="#f5a623" />
            <Text style={styles.cashPendingText}>EFECTIVO</Text>
          </View>
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
      </View>
    </View>
  );
}

type TabMode = 'active' | 'history';

export default function MisViajesScreen({ navigation }: Props) {
  const [tab, setTab] = useState<TabMode>('active');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingTripId, setRetryingTripId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ requestId: string; driverName: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ driverId: string; driverName: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('INAPPROPRIATE_BEHAVIOR');
  const [reportDesc, setReportDesc] = useState('');
  const queryClient = useQueryClient();

  useNotifications({
    onRequestUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      if (payload.status === 'ACCEPTED') {
        Alert.alert('¡Solicitud aceptada!', 'El conductor aceptó tu solicitud. Ya puedes ver los detalles del viaje.');
      } else if (payload.status === 'REJECTED') {
        const intentosRestantes = 3 - payload.rejectionCount;
        if (intentosRestantes > 0) {
          Alert.alert('Solicitud rechazada', `Te quedan ${intentosRestantes} intento(s) para este viaje.`);
        } else {
          Alert.alert('Solicitud rechazada', 'Has alcanzado el límite de intentos para este viaje.');
        }
      }
    },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => requestsApi.getMyRequests().then(r => r.data.requests),
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

  const { mutate: retryRequest } = useMutation({
    mutationFn: (tripId: string) => requestsApi.createRequest(tripId),
    onMutate: (tripId) => setRetryingTripId(tripId),
    onSettled: () => setRetryingTripId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      Alert.alert('Solicitud enviada', 'Tu solicitud fue reenviada al conductor.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo reenviar la solicitud';
      Alert.alert('Error', msg);
    },
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

  const { mutate: submitReport, isPending: reportingPending } = useMutation({
    mutationFn: (data: { reportedId: string; reason: ReportReason; description: string }) =>
      reportsApi.createReport(data),
    onSuccess: () => {
      setReportTarget(null);
      setReportDesc('');
      setReportReason('INAPPROPRIATE_BEHAVIOR');
      Alert.alert('Reporte enviado', 'El reporte fue enviado correctamente.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo enviar el reporte');
    },
  });

  const allRequests = data ?? [];
  const requests = tab === 'active'
    ? allRequests.filter(r => r.status === 'PENDING' || r.status === 'ACCEPTED')
    : allRequests.filter(r => r.status === 'COMPLETED');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Viajes</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
          onPress={() => setTab('active')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabBtnText, tab === 'active' && styles.tabBtnTextActive]}>
            Activas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          onPress={() => setTab('history')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

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
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="car-outline" size={56} color={colors.textDim} />
          <Text style={styles.emptyTitle}>
            {tab === 'active' ? 'No tienes solicitudes activas' : 'Sin viajes completados'}
          </Text>
          <Text style={styles.emptySubtext}>
            {tab === 'active'
              ? 'Busca un viaje disponible y solicita unirte'
              : 'Tus viajes completados aparecerán aquí'}
          </Text>
          {tab === 'active' && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryText}>Buscar viajes</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TripRequestCard
              item={item}
              onCancel={cancelRequest}
              cancelling={cancellingId === item.id}
              onRate={(requestId, driverName) => setRatingTarget({ requestId, driverName })}
              onRetry={retryRequest}
              retrying={retryingTripId === item.trip?.id}
              onPay={handlePay}
              paying={payingId === item.id}
              onReport={(driverId, driverName) => setReportTarget({ driverId, driverName })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {ratingTarget && (
        <RatingModal
          tripRequestId={ratingTarget.requestId}
          targetName={ratingTarget.driverName}
          raterRole="passenger"
          onClose={() => setRatingTarget(null)}
        />
      )}

      <Modal
        visible={!!reportTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons name="flag" size={20} color="#ff6b4a" />
              <Text style={styles.modalTitle}>Reportar conductor</Text>
              <TouchableOpacity onPress={() => setReportTarget(null)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {reportTarget && (
              <Text style={styles.reportTargetName}>{reportTarget.driverName}</Text>
            )}

            <Text style={styles.modalSectionLabel}>MOTIVO</Text>
            {([
              ['INAPPROPRIATE_BEHAVIOR', 'Comportamiento inapropiado'],
              ['UNSAFE_DRIVING', 'Conducción peligrosa'],
              ['HARASSMENT', 'Acoso'],
              ['FRAUD', 'Fraude'],
              ['OTHER', 'Otro'],
            ] as [ReportReason, string][]).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.reasonOption, reportReason === value && styles.reasonSelected]}
                onPress={() => setReportReason(value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={reportReason === value ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={reportReason === value ? '#ff6b4a' : colors.textDim}
                />
                <Text style={[styles.reasonText, reportReason === value && styles.reasonTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>DESCRIPCIÓN</Text>
            <TextInput
              value={reportDesc}
              onChangeText={setReportDesc}
              placeholder="Describe lo que ocurrió (mínimo 10 caracteres)..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={3}
              style={styles.reportInput}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setReportTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReportBtn, reportingPending && { opacity: 0.5 }]}
                onPress={() => {
                  if (reportDesc.trim().length < 10) {
                    Alert.alert('Descripción muy corta', 'Escribe al menos 10 caracteres.');
                    return;
                  }
                  submitReport({
                    reportedId: reportTarget!.driverId,
                    reason: reportReason,
                    description: reportDesc.trim(),
                  });
                }}
                disabled={reportingPending}
                activeOpacity={0.8}
              >
                {reportingPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitReportText}>Enviar Reporte</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
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
  list: {
    padding: 20,
    gap: 12,
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
    opacity: 0.65,
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
    marginTop: 2,
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
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rateBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
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
  rejectionCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#ff6b4a',
  },
  retryTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  retryTripText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2a1a15',
  },
  blockedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: '#ff6b4a',
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
  cashPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2a2010',
  },
  cashPendingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#f5a623',
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
  reportDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#ff6b4a44',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ff6b4a10',
  },
  reportDriverText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: '#ff6b4a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHigh,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  reportTargetName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 2,
    marginBottom: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    marginBottom: 6,
  },
  reasonSelected: {
    borderColor: '#ff6b4a55',
    backgroundColor: '#ff6b4a10',
  },
  reasonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  reasonTextSelected: {
    color: '#ff6b4a',
  },
  reportInput: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    marginBottom: 20,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
  },
  cancelModalBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  submitReportBtn: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#ff6b4a',
  },
  submitReportText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  },
});
