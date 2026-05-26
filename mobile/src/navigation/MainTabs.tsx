import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts } from '../theme';
import { tripsApi } from '../api/trips.api';
import { requestsApi } from '../api/requests.api';
import { usersApi } from '../api/users.api';
import { useNotifications, TripCompletedPassengerPayload, TripCompletedDriverPayload, NoShowPayload, ScheduleChangedPayload, TripCancelledByDriverPayload } from '../hooks/useNotifications';
import RatingModal from '../components/RatingModal';
import { navigationRef } from './navigationRef';

import HomePasajeroScreen from '../screens/app/HomePasajeroScreen';
import TripDetailScreen from '../screens/app/TripDetailScreen';
import HomeConductorScreen from '../screens/app/HomeConductorScreen';
import CreateTripScreen from '../screens/app/CreateTripScreen';
import AvisosScreen from '../screens/app/AvisosScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import MisViajesScreen from '../screens/app/MisViajesScreen';
import EditProfileScreen from '../screens/app/EditProfileScreen';
import VehicleScreen from '../screens/app/VehicleScreen';
import SolicitudesScreen from '../screens/app/SolicitudesScreen';
import EditTripScreen from '../screens/app/EditTripScreen';
import LocationPickerScreen from '../screens/app/LocationPickerScreen';
import TripTrackingScreen from '../screens/app/TripTrackingScreen';
import WalletScreen from '../screens/app/WalletScreen';
import HistorialPasajeroScreen from '../screens/app/HistorialPasajeroScreen';

export type BuscarStackParamList = {
  HomePasajero: undefined;
  TripDetail: { tripId: string };
};

export type PublicarStackParamList = {
  HomeConductor: undefined;
  CreateTrip: undefined;
  EditTrip: { tripId: string };
  Solicitudes: { tripId: string };
  LocationPicker: undefined;
  TripTracking: {
    tripId: string;
    driverName: string;
    destZone: string;
    destLat?: number;
    destLng?: number;
    isDriver?: boolean;
  };
};

export type PerfilStackParamList = {
  Profile: undefined;
  MisViajes: undefined;
  EditProfile: undefined;
  Vehicle: undefined;
  Wallet: undefined;
};

export type HistorialStackParamList = {
  HistorialPasajero: undefined;
};

export type AvisosStackParamList = {
  AvisosMain: undefined;
  TripTracking: {
    tripId: string;
    driverName: string;
    destZone: string;
    destLat?: number;
    destLng?: number;
    isDriver?: boolean;
  };
};

const BuscarStack = createNativeStackNavigator<BuscarStackParamList>();
const PublicarStack = createNativeStackNavigator<PublicarStackParamList>();
const PerfilStack = createNativeStackNavigator<PerfilStackParamList>();
const AvisosStack = createNativeStackNavigator<AvisosStackParamList>();
const HistorialStack = createNativeStackNavigator<HistorialStackParamList>();
const Tab = createBottomTabNavigator();

function BuscarNavigator() {
  return (
    <BuscarStack.Navigator screenOptions={{ headerShown: false }}>
      <BuscarStack.Screen name="HomePasajero" component={HomePasajeroScreen} />
      <BuscarStack.Screen name="TripDetail" component={TripDetailScreen} />
    </BuscarStack.Navigator>
  );
}

function PublicarNavigator() {
  return (
    <PublicarStack.Navigator screenOptions={{ headerShown: false }}>
      <PublicarStack.Screen name="HomeConductor" component={HomeConductorScreen} />
      <PublicarStack.Screen name="CreateTrip" component={CreateTripScreen} />
      <PublicarStack.Screen name="EditTrip" component={EditTripScreen} />
      <PublicarStack.Screen name="Solicitudes" component={SolicitudesScreen} />
      <PublicarStack.Screen
        name="LocationPicker"
        component={LocationPickerScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <PublicarStack.Screen name="TripTracking" component={TripTrackingScreen} />
    </PublicarStack.Navigator>
  );
}

function PerfilNavigator() {
  return (
    <PerfilStack.Navigator screenOptions={{ headerShown: false }}>
      <PerfilStack.Screen name="Profile" component={ProfileScreen} />
      <PerfilStack.Screen name="MisViajes" component={MisViajesScreen} />
      <PerfilStack.Screen name="EditProfile" component={EditProfileScreen} />
      <PerfilStack.Screen name="Vehicle" component={VehicleScreen} />
      <PerfilStack.Screen name="Wallet" component={WalletScreen} />
    </PerfilStack.Navigator>
  );
}

function HistorialNavigator() {
  return (
    <HistorialStack.Navigator screenOptions={{ headerShown: false }}>
      <HistorialStack.Screen name="HistorialPasajero" component={HistorialPasajeroScreen} />
    </HistorialStack.Navigator>
  );
}

function AvisosNavigator() {
  return (
    <AvisosStack.Navigator screenOptions={{ headerShown: false }}>
      <AvisosStack.Screen name="AvisosMain" component={AvisosScreen} />
      <AvisosStack.Screen name="TripTracking" component={TripTrackingScreen} />
    </AvisosStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Buscar:    { active: 'search',        inactive: 'search-outline' },
  Publicar:  { active: 'add-circle',    inactive: 'add-circle-outline' },
  Historial: { active: 'time',          inactive: 'time-outline' },
  Avisos:    { active: 'notifications', inactive: 'notifications-outline' },
  Perfil:    { active: 'person',        inactive: 'person-outline' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-EC', {
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function PostTripManager() {
  const queryClient = useQueryClient();
  const [passengerTarget, setPassengerTarget] = useState<TripCompletedPassengerPayload | null>(null);
  const [driverQueue, setDriverQueue] = useState<TripCompletedDriverPayload['passengers']>([]);
  const [schedulePayload, setSchedulePayload] = useState<ScheduleChangedPayload | null>(null);

  const { mutate: confirmSchedule, isPending: confirmingSchedule } = useMutation({
    mutationFn: (tripId: string) => tripsApi.confirmSchedule(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      setSchedulePayload(null);
      Alert.alert('Confirmado', 'Has confirmado el nuevo horario del viaje.');
    },
    onError: () => Alert.alert('Error', 'No se pudo confirmar el horario. Intenta de nuevo.'),
  });

  const { mutate: cancelAfterChange, isPending: cancellingAfterChange } = useMutation({
    mutationFn: (requestId: string) => requestsApi.cancelRequest(requestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setSchedulePayload(null);
      Alert.alert(
        'Reserva cancelada',
        data.data.refunded
          ? `Se reembolsaron $${data.data.amount?.toFixed(2)} a tu U-Wallet.`
          : 'Tu reserva fue cancelada.',
      );
    },
    onError: () => Alert.alert('Error', 'No se pudo cancelar la reserva. Intenta de nuevo.'),
  });

  function navigateToBuscar() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Buscar' as never);
    }
  }

  useNotifications({
    onTripCompletedPassenger: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      setPassengerTarget(payload);
    },
    onTripCompletedDriver: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      if (payload.passengers.length > 0) {
        setDriverQueue(payload.passengers);
      }
    },
    onNoShow: (payload: NoShowPayload) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      Alert.alert(
        'No abordaste el viaje',
        `El conductor registró que no subiste al vehículo en el viaje ${payload.originZone} → ${payload.destinationZone}.\n\nTu reserva fue cancelada y el pago no es reembolsable.`,
        [{ text: 'Entendido' }],
      );
    },
    onScheduleChanged: (payload: ScheduleChangedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      if (payload.bigChange) {
        setSchedulePayload(payload);
      } else {
        Alert.alert(
          'Cambio de horario',
          `El conductor modificó la hora del viaje ${payload.originZone} → ${payload.destinationZone}.\n\nAntes: ${formatTime(payload.oldTime)}\nAhora: ${formatTime(payload.newTime)}\n\nTienes 30 minutos para cancelar sin costo si no te conviene.`,
          [{ text: 'Entendido' }],
        );
      }
    },
    onTripCancelledByDriver: (payload: TripCancelledByDriverPayload) => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      const msg = payload.refundAmount > 0
        ? `Se reembolsaron $${payload.refundAmount.toFixed(2)} a tu U-Wallet.`
        : 'No tenías pagos pendientes en este viaje.';
      Alert.alert(
        'Viaje cancelado por el conductor',
        `El viaje ${payload.originZone} → ${payload.destinationZone} fue cancelado.\n\n${msg}`,
        [{ text: 'Entendido' }],
      );
    },
  });

  const isActionPending = confirmingSchedule || cancellingAfterChange;

  return (
    <>
      {passengerTarget && (
        <RatingModal
          tripRequestId={passengerTarget.requestId}
          targetName={passengerTarget.driverName}
          raterRole="passenger"
          mandatory
          onClose={() => setPassengerTarget(null)}
          onSuccess={() => {
            setPassengerTarget(null);
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
            navigateToBuscar();
          }}
        />
      )}

      {driverQueue.length > 0 && (
        <RatingModal
          tripRequestId={driverQueue[0].requestId}
          targetName={driverQueue[0].name}
          raterRole="driver"
          mandatory
          onClose={() => setDriverQueue(prev => prev.slice(1))}
          onSuccess={() => setDriverQueue(prev => prev.slice(1))}
        />
      )}

      {schedulePayload && (
        <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
          <View style={ptStyles.overlay}>
            <View style={ptStyles.sheet}>
              <View style={ptStyles.iconRow}>
                <View style={ptStyles.iconBg}>
                  <Ionicons name="time" size={28} color="#f5a623" />
                </View>
              </View>
              <Text style={ptStyles.title}>Cambio de horario</Text>
              <Text style={ptStyles.route}>
                {schedulePayload.originZone} → {schedulePayload.destinationZone}
              </Text>

              <View style={ptStyles.timeBox}>
                <View style={ptStyles.timeRow}>
                  <Text style={ptStyles.timeLabel}>Antes</Text>
                  <Text style={ptStyles.timeOld}>{formatTime(schedulePayload.oldTime)}</Text>
                </View>
                <Ionicons name="arrow-down" size={16} color={colors.textDim} style={{ alignSelf: 'center' }} />
                <View style={ptStyles.timeRow}>
                  <Text style={ptStyles.timeLabel}>Ahora</Text>
                  <Text style={ptStyles.timeNew}>{formatTime(schedulePayload.newTime)}</Text>
                </View>
              </View>

              <Text style={ptStyles.body}>
                El conductor cambió el horario más de 1 hora. Tienes 30 minutos para decidir.
              </Text>

              <TouchableOpacity
                style={[ptStyles.confirmBtn, isActionPending && ptStyles.btnDisabled]}
                onPress={() => confirmSchedule(schedulePayload.tripId)}
                disabled={isActionPending}
              >
                {confirmingSchedule
                  ? <ActivityIndicator size="small" color={colors.primaryDark} />
                  : <><Ionicons name="checkmark-circle" size={18} color={colors.primaryDark} /><Text style={ptStyles.confirmBtnText}>Confirmar nuevo horario</Text></>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[ptStyles.cancelBtn, isActionPending && ptStyles.btnDisabled]}
                onPress={() => cancelAfterChange(schedulePayload.requestId)}
                disabled={isActionPending}
              >
                {cancellingAfterChange
                  ? <ActivityIndicator size="small" color="#ff6b4a" />
                  : <Text style={ptStyles.cancelBtnText}>Cancelar y recibir reembolso</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const ptStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  iconRow: { alignItems: 'center', marginBottom: 4 },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  route: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  timeBox: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginVertical: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  timeOld: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  timeNew: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#f5a623',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 50,
  },
  confirmBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
  cancelBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ff6b4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#ff6b4a',
  },
  btnDisabled: { opacity: 0.4 },
});

export default function MainTabs() {
  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then(r => r.data.user),
    staleTime: 1000 * 60 * 5,
  });

  const hasVehicle = profile?.vehicle?.status === 'APPROVED';

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surfaceHigh,
            borderTopWidth: 0,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
          tabBarLabelStyle: {
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
          },
          tabBarIcon: ({ focused, color }) => {
            const icon = TAB_ICONS[route.name];
            if (!icon) return null;
            return <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Buscar"     component={BuscarNavigator} />
        {hasVehicle && (
          <Tab.Screen name="Publicar"  component={PublicarNavigator} />
        )}
        <Tab.Screen name="Historial"  component={HistorialNavigator} />
        <Tab.Screen name="Avisos"     component={AvisosNavigator} />
        <Tab.Screen name="Perfil"     component={PerfilNavigator} />
      </Tab.Navigator>
      <PostTripManager />
    </>
  );
}
