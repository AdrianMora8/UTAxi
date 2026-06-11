import { useState } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PerfilStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { usersApi } from '../../api/users.api';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<PerfilStackParamList, 'EditProfile'>;

const CARRERAS = [
  'Ingeniería en Sistemas',
  'Ingeniería Civil',
  'Ingeniería Industrial',
  'Ingeniería Eléctrica',
  'Ingeniería Mecánica',
  'Telecomunicaciones',
  'Diseño Industrial',
  'Arquitectura',
  'Medicina',
  'Psicología',
  'Derecho',
  'Administración de Empresas',
  'Contabilidad y Auditoría',
  'Otra',
];

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

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [career, setCareer] = useState(user?.career ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '');
  const [showCareerPicker, setShowCareerPicker] = useState(false);

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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Carrera</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCareerPicker(true)}>
                <Ionicons name="book-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.pickerBtnText, !career && { color: colors.textDim }]}>
                  {career || 'Selecciona tu carrera'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

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

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCareerPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowCareerPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Selecciona tu carrera</Text>
            <FlatList
              data={CARRERAS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => { setCareer(item); setShowCareerPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, career === item && { color: colors.primary }]}>
                    {item}
                  </Text>
                  {career === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
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
  sectionTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.textMuted,
    letterSpacing: 0.5,
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerBtnText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.surfaceHigh,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  pickerItemText: {
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
