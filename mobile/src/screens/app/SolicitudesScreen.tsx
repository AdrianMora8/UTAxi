import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../../theme';
import { requestsApi, TripRequest } from '../../api/requests.api';
import { tripsApi } from '../../api/trips.api';
import type { PublicarStackParamList } from '../../navigation/MainTabs';

type Props = NativeStackScreenProps<PublicarStackParamList, 'Solicitudes'>;

function minutesUntil(dateStr: string): string {
  const diff = Math.round((new Date(dateStr).getTime() - Date.now()) / 60000);
  if (diff <= 0) return 'Saliendo ahora';
  if (diff < 60) return `Salida en ${diff} min`;
  return `Salida en ${Math.floor(diff / 60)}h`;
}

function Initials({ name, size = 48 }: { name: string; size?: number }) {
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

function RequestCard({
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
  const p = request.passenger;
  if (!p) return null;

  const firstName = p.fullName.split(' ')[0];
  const lastName = p.fullName.split(' ').slice(-1)[0];
  const shortName = `${firstName} ${lastName[0]}.`;

  return (
    <View style={styles.card}>
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
          {p.career && (
            <Text style={styles.careerText}>{p.career}</Text>
          )}
        </View>
      </View>

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

export default function SolicitudesScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const queryClient = useQueryClient();

  const { data: tripData } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTripById(tripId).then(r => r.data.trip),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['requests', tripId],
    queryFn: () => requestsApi.getRequestsByTrip(tripId).then(r => r.data.requests),
    refetchInterval: 15000,
  });

  const { mutate: respond, variables: respondingId } = useMutation({
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
      const msg = err?.response?.data?.error || 'No se pudo procesar la solicitud';
      Alert.alert('Error', msg);
    },
  });

  function handleRespond(id: string, action: 'ACCEPT' | 'REJECT') {
    const label = action === 'ACCEPT' ? 'aceptar' : 'rechazar';
    Alert.alert(
      `¿Confirmas ${label} esta solicitud?`,
      undefined,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: action === 'ACCEPT' ? 'Aceptar' : 'Rechazar', onPress: () => respond({ id, action }) },
      ]
    );
  }

  const pending = (data ?? []).filter(r => r.status === 'PENDING');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Solicitudes</Text>
          <Text style={styles.headerSub}>
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.statusDot, { opacity: pending.length > 0 ? 1 : 0.3 }]} />
      </View>

      {/* Info del viaje */}
      {tripData && (
        <View style={styles.tripInfo}>
          <Text style={styles.tripTitle}>
            Próximo Viaje: {tripData.destinationZone}
          </Text>
          <View style={styles.tripTimeRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.tripTimeText}>
              {minutesUntil(tripData.departureTime)}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.textDim} />
          <Text style={styles.emptyTitle}>Sin solicitudes pendientes</Text>
          <Text style={styles.emptySub}>
            Las nuevas solicitudes aparecerán aquí automáticamente
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
            <Text style={styles.refreshText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              loading={respondingId?.id === item.id}
              onAccept={() => handleRespond(item.id, 'ACCEPT')}
              onReject={() => handleRespond(item.id, 'REJECT')}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 'auto',
  },
  tripInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 6,
  },
  tripTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
  },
  tripTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripTimeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
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
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
  },
  refreshBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
  },
  refreshText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 14,
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
  passengerInfo: {
    flex: 1,
    gap: 4,
  },
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
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
  message: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
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
});
