import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { tripsApi, Trip } from '../../api/trips.api';
import { useAuthStore } from '../../store/authStore';
import type { BuscarStackParamList } from '../../navigation/MainTabs';

type NavProp = NativeStackNavigationProp<BuscarStackParamList, 'HomePasajero'>;

const FILTERS = ['Todos', 'Campus Norte', 'Centro', 'Los Shyris', 'Ficoa', 'Huachi'];

function minutesUntil(dateStr: string): string {
  const diff = Math.round((new Date(dateStr).getTime() - Date.now()) / 60000);
  if (diff <= 0) return 'Saliendo';
  if (diff < 60) return `Sale en ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `Sale en ${h}h ${m}min` : `Sale en ${h}h`;
}

function Initials({ name, size = 42 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0][0];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
    </View>
  );
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const seatsLeft = trip.availableSeats;
  const firstName = trip.driver.fullName.split(' ')[0];
  const lastName = trip.driver.fullName.split(' ').slice(-1)[0];
  const shortName = `${firstName} ${lastName[0]}.`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.driverRow}>
          <Initials name={trip.driver.fullName} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{shortName}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.rating}>{trip.driver.reputationScore.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>${trip.pricePerSeat}</Text>
          <Text style={styles.seats}>
            {seatsLeft === 1 ? 'Queda 1 as.' : `Quedan ${seatsLeft} as.`}
          </Text>
        </View>
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={styles.dotGray} />
          <Text style={styles.routeText}>{trip.originZone}</Text>
        </View>
        <View style={styles.routeRow}>
          <View style={styles.dotGreen} />
          <Text style={[styles.routeText, { color: colors.primary }]}>{trip.destinationZone}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.timeText}>{minutesUntil(trip.departureTime)}</Text>
        </View>
        <TouchableOpacity
          style={seatsLeft <= 1 ? styles.btnOutline : styles.btnPrimary}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={seatsLeft <= 1 ? styles.btnOutlineText : styles.btnPrimaryText}>
            {seatsLeft <= 1 ? 'Ver Detalles' : 'Reservar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomePasajeroScreen() {
  const navigation = useNavigation<NavProp>();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');

  const destinationZone = activeFilter === 'Todos' ? undefined : activeFilter;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['trips', destinationZone],
    queryFn: () => tripsApi.getTrips({ destinationZone, limit: 20 }).then(r => r.data),
  });

  const trips = (data?.trips ?? []).filter(t =>
    t.status === 'SCHEDULED' &&
    t.availableSeats > 0 &&
    (search === '' ||
      t.originZone.toLowerCase().includes(search.toLowerCase()) ||
      t.destinationZone.toLowerCase().includes(search.toLowerCase()))
  );

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Ionicons name="car-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyText}>No hay viajes disponibles</Text>
      <Text style={styles.emptySubtext}>Intenta con otro destino o revisa más tarde</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>U-RIDE</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.getParent()?.navigate('Avisos')}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.pageTitle}>Buscar Viaje</Text>

      {/* Buscador */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="¿A dónde vas?"
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips de filtro */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de viajes */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Ionicons name="wifi-outline" size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>Error de conexión</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
            />
          )}
          ListEmptyComponent={renderEmpty}
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
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmallText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  chipsScroll: {
    marginBottom: 16,
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignSelf: 'flex-start',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primaryDark,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryBtn: {
    marginTop: 12,
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
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 14,
    color: colors.primary,
  },
  driverInfo: {
    gap: 4,
  },
  driverName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.primary,
  },
  seats: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  routeBlock: {
    gap: 8,
    paddingLeft: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotGray: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDim,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  routeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnPrimaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  btnOutline: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnOutlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text,
  },
});
