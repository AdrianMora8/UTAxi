import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../../theme';
import { requestsApi, TripRequest } from '../../api/requests.api';
import { tripsApi } from '../../api/trips.api';
import { reportsApi, type ReportReason } from '../../api/reports.api';
import RatingModal from '../../components/RatingModal';
import type { PublicarStackParamList } from '../../navigation/MainTabs';
import { useNotifications } from '../../hooks/useNotifications';

type Props = NativeStackScreenProps<PublicarStackParamList, 'Solicitudes'>;

const MAX_REJECTIONS = 3;

function minutesUntil(dateStr: string): string {
  const diff = Math.round((new Date(dateStr).getTime() - Date.now()) / 60000);
  if (diff <= 0) return 'Saliendo ahora';
  if (diff < 60) return `Salida en ${diff} min`;
  return `Salida en ${Math.floor(diff / 60)}h`;
}

function Initials({ name, size = 44 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0][0];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>
        {initials.toUpperCase()}
      </Text>
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function PassengerHeader({ request }: { request: TripRequest }) {
  const p = request.passenger!;
  const firstName = p.fullName.split(' ')[0];
  const lastName = p.fullName.split(' ').slice(-1)[0];
  const shortName = `${firstName} ${lastName[0]}.`;

  return (
    <View style={styles.cardHeader}>
      <Initials name={p.fullName} />
      <View style={styles.passengerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.passengerName}>{shortName}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.primary} />
            <Text style={styles.ratingText}>{p.reputationScore.toFixed(1)}</Text>
          </View>
        </View>
        {p.career && <Text style={styles.careerText}>{p.career}</Text>}
        {p.totalTrips !== undefined && (
          <Text style={styles.tripsText}>{p.totalTrips} viajes completados</Text>
        )}
      </View>
    </View>
  );
}

function PendingCard({
  request,
  onAccept,
  onReject,
  loading,
}: {
  request: TripRequest;
  onAccept: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  if (!request.passenger) return null;
  return (
    <View style={styles.card}>
      <PassengerHeader request={request} />
      {request.rejectionCount > 0 && (
        <View style={styles.retryBanner}>
          <Ionicons name="refresh-circle-outline" size={14} color="#f59e0b" />
          <Text style={styles.retryText}>
            Reenvío · {request.rejectionCount}/{MAX_REJECTIONS} rechazos anteriores
          </Text>
        </View>
      )}
      {request.message && (
        <Text style={styles.message}>"{request.message}"</Text>
      )}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={onReject}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.rejectText}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={onAccept}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.primaryDark} />
            : <Text style={styles.acceptText}>Aceptar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AcceptedCard({
  request,
  onToggleArrival,
  onRate,
  onReport,
  arrivalLoading,
}: {
  request: TripRequest;
  onToggleArrival: () => void;
  onRate: () => void;
  onReport: () => void;
  arrivalLoading: boolean;
}) {
  if (!request.passenger) return null;
  const arrived = !!request.arrivedAt;

  return (
    <View style={[styles.card, arrived && styles.cardArrived]}>
      <PassengerHeader request={request} />
      <View style={styles.acceptedFooter}>
        <TouchableOpacity
          style={[styles.arrivalBtn, arrived && styles.arrivalBtnActive]}
          onPress={onToggleArrival}
          disabled={arrivalLoading}
          activeOpacity={0.7}
        >
          {arrivalLoading ? (
            <ActivityIndicator size="small" color={arrived ? colors.primaryDark : colors.primary} />
          ) : (
            <>
              <Ionicons
                name={arrived ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={arrived ? colors.primaryDark : colors.primary}
              />
              <Text style={[styles.arrivalText, arrived && styles.arrivalTextActive]}>
                {arrived ? 'Llegó' : 'Marcar llegada'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!request.rating ? (
          <TouchableOpacity style={styles.rateBtn} onPress={onRate} activeOpacity={0.7}>
            <Ionicons name="star-outline" size={16} color={colors.primary} />
            <Text style={styles.rateBtnText}>Calificar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ratedBadge}>
            <Ionicons name="star" size={14} color={colors.primary} />
            <Text style={styles.ratedText}>{request.rating.score}/5</Text>
          </View>
        )}

        <TouchableOpacity style={styles.reportBtn} onPress={onReport} activeOpacity={0.7} testID="report-passenger-btn">
          <Ionicons name="flag-outline" size={16} color="#ff6b4a" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HistoryCard({ request }: { request: TripRequest }) {
  if (!request.passenger) return null;
  const statusLabel = request.status === 'REJECTED' ? 'Rechazado' : 'Cancelado';
  const statusColor = request.status === 'REJECTED' ? '#ff6b4a' : colors.textDim;
  const p = request.passenger;
  const firstName = p.fullName.split(' ')[0];
  const lastName = p.fullName.split(' ').slice(-1)[0];

  return (
    <View style={[styles.card, styles.cardMuted]}>
      <View style={styles.cardHeader}>
        <Initials name={p.fullName} size={38} />
        <View style={styles.passengerInfo}>
          <Text style={[styles.passengerName, { color: colors.textMuted }]}>
            {firstName} {lastName[0]}.
          </Text>
          {p.career && <Text style={styles.careerText}>{p.career}</Text>}
        </View>
        <View style={[styles.historyBadge, { borderColor: statusColor }]}>
          <Text style={[styles.historyBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      {request.status === 'REJECTED' && (
        <Text style={styles.rejectionNote}>
          Intentos: {request.rejectionCount}/{MAX_REJECTIONS}
          {request.rejectionCount >= MAX_REJECTIONS && ' · Bloqueado'}
        </Text>
      )}
    </View>
  );
}

export default function SolicitudesScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const queryClient = useQueryClient();
  const [ratingTarget, setRatingTarget] = useState<TripRequest | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ passengerId: string; passengerName: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('INAPPROPRIATE_BEHAVIOR');
  const [reportDesc, setReportDesc] = useState('');

  useNotifications({
    onRequestNew: (payload) => {
      if (payload.tripId !== tripId) return;
      queryClient.invalidateQueries({ queryKey: ['requests', tripId] });
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      Alert.alert('Nueva solicitud', `${payload.passengerName} quiere unirse a tu viaje.`);
    },
  });

  const { data: tripData } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTripById(tripId).then(r => r.data.trip),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['requests', tripId],
    queryFn: () => requestsApi.getRequestsByTrip(tripId).then(r => r.data.requests),
    refetchInterval: 15000,
  });

  const { mutate: respond, variables: respondingVars, isPending: isResponding } = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      requestsApi.respondToRequest(id, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['requests', tripId] });
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      const msg = action === 'ACCEPT' ? 'Solicitud aceptada' : 'Solicitud rechazada';
      Alert.alert(msg, action === 'ACCEPT'
        ? 'El pasajero ha sido notificado.'
        : 'La solicitud fue rechazada.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo procesar la solicitud');
    },
  });

  const { mutate: toggleArrival } = useMutation({
    mutationFn: ({ id, arrived }: { id: string; arrived: boolean }) =>
      requestsApi.markArrival(id, arrived),
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => setTogglingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', tripId] }),
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'No se pudo actualizar'),
  });

  const { mutate: submitReport, isPending: reportingPending } = useMutation({
    mutationFn: (data: { reportedId: string; reason: ReportReason; description: string }) =>
      reportsApi.createReport(data),
    onSuccess: () => {
      setReportTarget(null);
      setReportDesc('');
      setReportReason('INAPPROPRIATE_BEHAVIOR');
      Alert.alert('Reporte enviado', 'El reporte fue enviado correctamente.');
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'No se pudo enviar el reporte'),
  });

  function handleRespond(id: string, action: 'ACCEPT' | 'REJECT') {
    const label = action === 'ACCEPT' ? 'aceptar' : 'rechazar';
    Alert.alert(`¿Confirmas ${label} esta solicitud?`, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: action === 'ACCEPT' ? 'Aceptar' : 'Rechazar', onPress: () => respond({ id, action }) },
    ]);
  }

  const all = data ?? [];
  const pending = all.filter(r => r.status === 'PENDING');
  const accepted = all.filter(r => r.status === 'ACCEPTED');
  const history = all.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Solicitudes</Text>
          {tripData && (
            <Text style={styles.headerSub}>
              {tripData.originZone} → {tripData.destinationZone} · {minutesUntil(tripData.departureTime)}
            </Text>
          )}
        </View>
        {pending.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* — Pendientes — */}
          <SectionHeader title="PENDIENTES" count={pending.length} />
          {pending.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.textDim} />
              <Text style={styles.emptySectionText}>Sin solicitudes pendientes</Text>
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={styles.refreshText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pending.map(item => (
              <PendingCard
                key={item.id}
                request={item}
                loading={isResponding && respondingVars?.id === item.id}
                onAccept={() => handleRespond(item.id, 'ACCEPT')}
                onReject={() => handleRespond(item.id, 'REJECT')}
              />
            ))
          )}

          {/* — Aceptados — */}
          {accepted.length > 0 && (
            <>
              <SectionHeader title="PASAJEROS ACEPTADOS" count={accepted.length} />
              {accepted.map(item => (
                <AcceptedCard
                  key={item.id}
                  request={item}
                  arrivalLoading={togglingId === item.id}
                  onToggleArrival={() =>
                    toggleArrival({ id: item.id, arrived: !item.arrivedAt })
                  }
                  onRate={() => setRatingTarget(item)}
                  onReport={() => setReportTarget({
                    passengerId: item.passenger!.id,
                    passengerName: item.passenger!.fullName,
                  })}
                />
              ))}
            </>
          )}

          {/* — Historial — */}
          {history.length > 0 && (
            <>
              <SectionHeader title="HISTORIAL" count={history.length} />
              {history.map(item => (
                <HistoryCard key={item.id} request={item} />
              ))}
            </>
          )}

          {all.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={56} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Aún no hay solicitudes</Text>
              <Text style={styles.emptySub}>Las solicitudes de pasajeros aparecerán aquí</Text>
            </View>
          )}
        </ScrollView>
      )}

      {ratingTarget && (
        <RatingModal
          tripRequestId={ratingTarget.id}
          targetName={ratingTarget.passenger?.fullName ?? ''}
          raterRole="driver"
          onClose={() => setRatingTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['requests', tripId] });
            setRatingTarget(null);
          }}
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
              <Text style={styles.modalTitle}>Reportar pasajero</Text>
              <TouchableOpacity onPress={() => setReportTarget(null)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {reportTarget && (
              <Text style={styles.reportTargetName}>{reportTarget.passengerName}</Text>
            )}

            <Text style={styles.modalSectionLabel}>MOTIVO</Text>
            {([
              ['INAPPROPRIATE_BEHAVIOR', 'Comportamiento inapropiado'],
              ['NO_SHOW', 'No se presentó'],
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
                style={styles.cancelBtn}
                onPress={() => setReportTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReportBtn, reportingPending && { opacity: 0.5 }]}
                onPress={() => {
                  if (reportDesc.trim().length < 10) {
                    Alert.alert('Descripción muy corta', 'Escribe al menos 10 caracteres.');
                    return;
                  }
                  submitReport({
                    reportedId: reportTarget!.passengerId,
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
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center' },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  sectionBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptySectionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDim,
  },
  refreshText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardArrived: {
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  cardMuted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  passengerInfo: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerName: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.text,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  careerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  tripsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.textDim,
  },
  rejectText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  acceptBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  acceptText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  acceptedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHigh,
    paddingTop: 10,
  },
  arrivalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  arrivalBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  arrivalText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  arrivalTextActive: {
    color: colors.primaryDark,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceHigh,
  },
  rateBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceHigh,
  },
  ratedText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  historyBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  rejectionNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
    paddingHorizontal: 4,
  },
  retryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#f59e0b44',
  },
  retryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: '#f59e0b',
  },
  reportBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ff6b4a18',
    borderWidth: 1,
    borderColor: '#ff6b4a33',
    justifyContent: 'center',
    alignItems: 'center',
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
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
  },
  cancelBtnText: {
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
