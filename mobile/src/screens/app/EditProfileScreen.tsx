import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PerfilStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { usersApi, Vehicle } from '../../api/users.api';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<PerfilStackParamList, 'EditProfile'>;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Datos personales
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [career, setCareer] = useState(user?.career ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '');

  // Vehículo
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [existingVehicle, setExistingVehicle] = useState<Vehicle | null>(null);

  const { data: profileData } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then(r => r.data.user),
  });

  useEffect(() => {
    if (profileData?.vehicle) {
      const v = profileData.vehicle;
      setExistingVehicle(v);
      setBrand(v.brand);
      setModel(v.model);
      setYear(String(v.year));
      setPlateNumber(v.plateNumber);
      setColor(v.color);
    }
  }, [profileData]);

  // Mutación perfil
  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        fullName: fullName.trim() || undefined,
        career: career.trim() || undefined,
        phone: phone.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
      }),
    onSuccess: ({ data }) => {
      updateUser({
        fullName: data.user.fullName,
        career: data.user.career,
        phone: data.user.phone,
        neighborhood: data.user.neighborhood,
      });
      Alert.alert('Listo', 'Perfil actualizado correctamente');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo guardar los cambios';
      Alert.alert('Error', msg);
    },
  });

  // Mutación vehículo
  const { mutate: saveVehicle, isPending: savingVehicle } = useMutation({
    mutationFn: () => {
      const payload = {
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        plateNumber: plateNumber.trim().toUpperCase(),
        color: color.trim(),
      };
      return existingVehicle
        ? usersApi.updateVehicle(payload)
        : usersApi.createVehicle(payload);
    },
    onSuccess: ({ data }) => {
      setExistingVehicle(data.vehicle);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Listo', existingVehicle ? 'Vehículo actualizado' : 'Vehículo registrado');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo guardar el vehículo';
      Alert.alert('Error', msg);
    },
  });

  function handleSaveProfile() {
    if (!fullName.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío');
      return;
    }
    saveProfile();
  }

  function handleSaveVehicle() {
    if (!brand.trim() || !model.trim() || !year.trim() || !plateNumber.trim() || !color.trim()) {
      Alert.alert('Campos incompletos', 'Completa todos los datos del vehículo');
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Año inválido', 'Ingresa un año de fabricación válido');
      return;
    }
    saveVehicle();
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName?.[0]?.toUpperCase() ?? user?.fullName?.[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>

          {/* Sección datos personales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos personales</Text>
            <Field label="Nombre completo" value={fullName} onChangeText={setFullName} placeholder="Tu nombre completo" />
            <Field label="Carrera" value={career} onChangeText={setCareer} placeholder="Ej: Ingeniería en Sistemas" />
            <Field label="Teléfono" value={phone} onChangeText={setPhone} placeholder="Ej: 0987654321" keyboardType="phone-pad" autoCapitalize="none" />
            <Field label="Barrio / Sector" value={neighborhood} onChangeText={setNeighborhood} placeholder="Ej: Huachi Loreto" />

            <TouchableOpacity
              style={[styles.sectionBtn, savingProfile && styles.btnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile ? (
                <ActivityIndicator color={colors.primaryDark} />
              ) : (
                <Text style={styles.sectionBtnText}>Guardar perfil</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sección vehículo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vehículo</Text>
              {existingVehicle && (
                <View style={styles.registeredBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={styles.registeredText}>Registrado</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionHint}>
              {existingVehicle
                ? 'Actualiza los datos de tu vehículo'
                : 'Registra tu vehículo para publicar viajes'}
            </Text>

            <Field label="Marca" value={brand} onChangeText={setBrand} placeholder="Ej: Chevrolet" />
            <Field label="Modelo" value={model} onChangeText={setModel} placeholder="Ej: Sail" />
            <Field label="Año" value={year} onChangeText={setYear} placeholder="Ej: 2018" keyboardType="numeric" autoCapitalize="none" />
            <Field label="Placa" value={plateNumber} onChangeText={setPlateNumber} placeholder="Ej: ABC-1234" autoCapitalize="characters" />
            <Field label="Color" value={color} onChangeText={setColor} placeholder="Ej: Blanco" />

            <TouchableOpacity
              style={[styles.sectionBtn, savingVehicle && styles.btnDisabled]}
              onPress={handleSaveVehicle}
              disabled={savingVehicle}
              activeOpacity={0.85}
            >
              {savingVehicle ? (
                <ActivityIndicator color={colors.primaryDark} />
              ) : (
                <Text style={styles.sectionBtnText}>
                  {existingVehicle ? 'Actualizar vehículo' : 'Registrar vehículo'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 20,
    color: colors.text,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 20,
  },
  avatarBlock: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.primary,
  },
  emailText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  section: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
    marginTop: -6,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  registeredText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  sectionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  sectionBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
});
