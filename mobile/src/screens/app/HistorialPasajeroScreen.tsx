import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistorialStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { requestsApi, TripRequest } from '../../api/requests.api';
import { reportsApi, type ReportReason } from '../../api/reports.api';
import RatingModal from '../../components/RatingModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'COMPLETADO', color: colors.primary,  bg: '#1a3322' },
  REJECTED:  { label: 'RECHAZADO',  color: '#ff6b4a',       bg: '#2a1a15' },
  CANCELLED: { label: 'CANCELADO',  color: '#888',           bg: '#1e1e1e' },
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

function StarRow({ score, size = 16 }: { score: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(s => (
        <Ionicons
          key={s}
          name={s <= score ? 'star' : 'star-outline'}
          size={size}
          color={s <= score ? '#f5c518' : colors.textDim}
        />
      ))}
    </View>
  );
}

function HistorialCard({
  item,
  onRate,
  onRetry,
  retrying,
  onReport,
}: {
  item: TripRequest;
  onRate: (item: TripRequest) => void;
  onRetry: (tripId: string) => void;
  retrying: boolean;
  onReport: (driverId: string, driverName: string) => void;
}) {
  const trip = item.trip;
  const driver = trip?.driver;
  const badge = STATUS_CONFIG[item.status];
  const isCompleted = item.status === 'COMPLETED';
  const isRejected = item.status === 'REJECTED';
  const hasRating = !!item.rating;
  const canRetry = isRejected && item.rejectionCount < 3;
  const isBlocked = isRejected && item.rejectionCount >= 3;

  return (
    <View style={styles.card}>
      {/* Route + badge */}
      <View style={styles.cardTop}>
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotDim]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Origen</Text>
              <Text style={[styles.routeZone, styles.textDim]} numberOfLines={1}>
                {trip?.originZone ?? '—'}
              </Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotDim]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={[styles.routeZone, styles.textDim]} numberOfLines={1}>
                {trip?.destinationZone ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        )}
      </View>

      {/* Driver */}
      {driver ? (
        <View style={styles.driverRow}>
          <Initials name={driver.fullName} />
          <View style={{ gap: 2 }}>
            <Text style={[styles.driverName, styles.textDim]}>
              {`${driver.fullName.split(' ')[0]} ${driver.fullName.split(' ').slice(-1)[0][0]}.`}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.ratingText}>{driver.reputationScore.toFixed(1)}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.dateText}>
            {trip?.departureTime ? formatDateTime(trip.departureTime) : '—'}
          </Text>
          <Text style={[styles.priceText, styles.textDim]}>
            ${trip?.pricePerSeat != null ? parseFloat(String(trip.pricePerSeat)).toFixed(2) : '0.00'}
          </Text>
        </View>

        <View style={styles.actionsCol}>
          {isCompleted && !hasRating && (
            <TouchableOpacity style={styles.rateBtn} onPress={() => onRate(item)}>
              <Ionicons name="star-outline" size={14} color="#1a1a1a" />
              <Text style={styles.rateBtnText}>Calificar</Text>
            </TouchableOpacity>
          )}

          {isCompleted && hasRating && (
            <View style={styles.ratedBox}>
              <StarRow score={item.rating!.score} />
              {item.rating!.comment ? (
                <Text style={styles.ratedComment} numberOfLines={1}>
                  "{item.rating!.comment}"
                </Text>
              ) : null}
            </View>
          )}

          {isCompleted && driver && (
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => onReport(driver.id, driver.fullName)}
            >
              <Ionicons name="flag-outline" size={13} color="#ff6b4a" />
              <Text style={styles.reportBtnText}>Reportar</Text>
            </TouchableOpacity>
          )}

          {canRetry && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => onRetry(item.tripId)}
              disabled={retrying}
            >
              {retrying
                ? <ActivityIndicator size="small" color={colors.primaryDark} />
                : <><Ionicons name="refresh" size={14} color={colors.primaryDark} /><Text style={styles.retryBtnText}>Reintentar</Text></>
              }
            </TouchableOpacity>
          )}

          {isBlocked && (
            <View style={styles.blockedBadge}>
              <Ionicons name="ban-outline" size={13} color="#888" />
              <Text style={styles.blockedText}>BLOQUEADO</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<HistorialStackParamList, 'HistorialPasajero'>;

export default function HistorialPasajeroScreen(_props: Props) {
  const [ratingTarget, setRatingTarget] = useState<TripRequest | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ driverId: string; driverName: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('INAPPROPRIATE_BEHAVIOR');
  const [reportDesc, setReportDesc] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => requestsApi.getMyRequests().then(r => r.data.requests),
    refetchInterval: 30_000,
  });

  const { mutate: retryRequest } = useMutation({
    mutationFn: (tripId: string) => requestsApi.createRequest(tripId),
    onMutate: (tripId) => setRetryingId(tripId),
    onSettled: () => setRetryingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      Alert.alert('Solicitud enviada', 'Tu solicitud fue reenviada al conductor.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo reenviar la solicitud';
      Alert.alert('Error', msg);
    },
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
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo enviar el reporte');
    },
  });

  const historial = (data ?? []).filter(r =>
    r.status === 'COMPLETED' || r.status === 'REJECTED' || r.status === 'CANCELLED'
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>U-RIDE</Text>
        <Text style={styles.pageTitle}>Historial</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="wifi-outline" size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>Error de conexión</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryTouchable}>
            <Text style={styles.retryTouchableText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={historial}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistorialCard
              item={item}
              onRate={setRatingTarget}
              onRetry={retryRequest}
              retrying={retryingId === item.tripId}
              onReport={(driverId, driverName) => setReportTarget({ driverId, driverName })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="time-outline" size={56} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Sin historial aún</Text>
              <Text style={styles.emptySubtext}>Tus viajes completados aparecerán aquí</Text>
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

      {ratingTarget && (
        <RatingModal
          tripRequestId={ratingTarget.id}
          targetName={ratingTarget.trip?.driver?.fullName ?? ''}
          raterRole="passenger"
          onClose={() => setRatingTarget(null)}
          onSuccess={() => {
            setRatingTarget(null);
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
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
  root: { flex: 1, backgroundColor: colors.background },
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
  retryTouchable: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
  },
  retryTouchableText: {
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
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeBlock: {
    gap: 4,
    flex: 1,
    marginRight: 8,
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
    borderColor: colors.textDim,
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.textDim,
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
  },
  actionsCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  // Rate button
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5c518',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rateBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#1a1a1a',
  },
  ratedBox: {
    alignItems: 'flex-end',
    gap: 3,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratedComment: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    maxWidth: 140,
    textAlign: 'right',
  },
  // Retry button
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  // Blocked badge
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1e1e1e',
  },
  blockedText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#888',
    letterSpacing: 0.5,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff6b4a33',
    backgroundColor: '#ff6b4a0d',
  },
  reportBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
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
  modalClose: { padding: 4 },
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
  reasonTextSelected: { color: '#ff6b4a' },
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
  modalActions: { flexDirection: 'row', gap: 12 },
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
