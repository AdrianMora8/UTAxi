import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { colors, fonts } from '../theme';
import { usersApi } from '../api/users.api';
import { useNotifications, TripCompletedPassengerPayload, TripCompletedDriverPayload } from '../hooks/useNotifications';
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

function PostTripManager() {
  const queryClient = useQueryClient();
  const [passengerTarget, setPassengerTarget] = useState<TripCompletedPassengerPayload | null>(null);
  const [driverQueue, setDriverQueue] = useState<TripCompletedDriverPayload['passengers']>([]);

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
  });

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
    </>
  );
}

export default function MainTabs() {
  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then(r => r.data.user),
    staleTime: 1000 * 60 * 5,
  });

  const hasVehicle = !!profile?.vehicle;

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
