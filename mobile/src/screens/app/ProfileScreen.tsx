import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors, fonts } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { requestsApi } from '../../api/requests.api';
import { usersApi } from '../../api/users.api';
import { paymentsApi } from '../../api/payments.api';
import type { PerfilStackParamList } from '../../navigation/MainTabs';

type NavProp = NativeStackNavigationProp<PerfilStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, clearAuth } = useAuthStore();

  const { data: requests } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => requestsApi.getMyRequests().then(r => r.data.requests),
  });

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then(r => r.data.user),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsApi.getWallet().then(r => r.data),
  });
  const hasVehicle = !!profile?.vehicle;
  const viajesPasajero = (requests ?? []).filter(r => r.status === 'COMPLETED').length;
  const viajesConductor = profile?.totalTrips ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>U-RIDE</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.fullName ?? 'Usuario'}</Text>
        <Text style={styles.career}>{user?.career?.toUpperCase() ?? 'UTA'}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color={colors.primary} style={{ marginBottom: 2 }} />
            <Text style={styles.statValue}>{profile?.reputationScore?.toFixed(1) ?? user?.reputationScore?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.statLabel}>PUNTUACIÓN</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} style={{ marginBottom: 2 }} />
            <Text style={[styles.statValue, { color: colors.text }]}>{viajesPasajero}</Text>
            <Text style={styles.statLabel}>PASAJERO</Text>
          </View>
          {hasVehicle && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="car-outline" size={14} color={colors.textMuted} style={{ marginBottom: 2 }} />
                <Text style={[styles.statValue, { color: colors.text }]}>{viajesConductor}</Text>
                <Text style={styles.statLabel}>CONDUCTOR</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>U-Wallet</Text>
            {wallet != null && (
              <Text style={styles.menuSub}>
                Saldo: ${wallet.walletBalance.toFixed(2)}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MisViajes')}
        >
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.menuText}>Historial</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Vehicle')}
        >
          <Ionicons name="car-sport-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Mi Vehículo</Text>
            {profile?.vehicle && (
              <Text style={styles.menuSub}>
                {profile.vehicle.brand} {profile.vehicle.model} · {profile.vehicle.plateNumber}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.menuText}>Ayuda</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={clearAuth}>
        <Ionicons name="log-out-outline" size={18} color="#ff6b4a" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 1,
  },
  editBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  avatarBlock: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    gap: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.primary,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
  },
  career: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.surfaceHigh,
  },
  menu: {
    paddingHorizontal: 20,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  menuText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  menuSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingBottom: 24,
  },
  logoutText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#ff6b4a',
  },
});
