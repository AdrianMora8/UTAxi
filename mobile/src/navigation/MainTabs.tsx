import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, fonts } from '../theme';
import { usersApi } from '../api/users.api';

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
};

export type PerfilStackParamList = {
  Profile: undefined;
  MisViajes: undefined;
  EditProfile: undefined;
  Vehicle: undefined;
};

const BuscarStack = createNativeStackNavigator<BuscarStackParamList>();
const PublicarStack = createNativeStackNavigator<PublicarStackParamList>();
const PerfilStack = createNativeStackNavigator<PerfilStackParamList>();
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
    </PerfilStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Buscar:   { active: 'search',        inactive: 'search-outline' },
  Publicar: { active: 'add-circle',    inactive: 'add-circle-outline' },
  Avisos:   { active: 'notifications', inactive: 'notifications-outline' },
  Perfil:   { active: 'person',        inactive: 'person-outline' },
};

export default function MainTabs() {
  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then(r => r.data.user),
    staleTime: 1000 * 60 * 5,
  });

  const hasVehicle = !!profile?.vehicle;

  return (
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
      <Tab.Screen name="Buscar"   component={BuscarNavigator} />
      {hasVehicle && (
        <Tab.Screen name="Publicar" component={PublicarNavigator} />
      )}
      <Tab.Screen name="Avisos"   component={AvisosScreen} />
      <Tab.Screen name="Perfil"   component={PerfilNavigator} />
    </Tab.Navigator>
  );
}
