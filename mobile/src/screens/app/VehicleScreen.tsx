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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PerfilStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { usersApi, Vehicle } from '../../api/users.api';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Vehicle'>;

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
  keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'characters';
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

export default function VehicleScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [existing, setExisting] = useState<Vehicle | null>(null);
  // URI de foto pendiente (elegida pero aún no subida — solo en flujo de creación)
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);

  const { isLoading, data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then(r => r.data.user),
  });

  useEffect(() => {
    if (profile?.vehicle) {
      const v = profile.vehicle;
      setExisting(v);
      setBrand(v.brand);
      setModel(v.model);
      setYear(String(v.year));
      setPlateNumber(v.plateNumber);
      setColor(v.color);
    } else {
      setExisting(null);
    }
  }, [profile]);

  // Mutación crear/actualizar datos del vehículo
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => {
      const payload = {
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        plateNumber: plateNumber.trim().toUpperCase(),
        color: color.trim(),
      };
      return existing ? usersApi.updateVehicle(payload) : usersApi.createVehicle(payload);
    },
    onSuccess: ({ data }) => {
      const savedVehicle = data.vehicle;
      setExisting(savedVehicle);
      queryClient.invalidateQueries({ queryKey: ['me'] });

      // Si hay foto pendiente (flujo de creación), subirla automáticamente
      if (pendingPhotoUri) {
        uploadPhoto({ uri: pendingPhotoUri, isNew: true });
      } else {
        Alert.alert(
          'Listo',
          existing ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo guardar el vehículo';
      Alert.alert('Error', msg);
    },
  });

  // Mutación subir foto (ya sea tras crear o al cambiar foto existente)
  const { mutate: uploadPhoto, isPending: uploadingPhoto } = useMutation({
    mutationFn: ({ uri }: { uri: string; isNew?: boolean }) =>
      usersApi.uploadVehiclePhoto(uri),
    onSuccess: (_, variables) => {
      setPendingPhotoUri(null);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert(
        'Listo',
        variables.isNew ? 'Vehículo registrado con foto' : 'Foto actualizada correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo subir la foto';
      Alert.alert('Error al subir la foto', msg);
    },
  });

  // Mutación eliminar vehículo
  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => usersApi.deleteVehicle(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo eliminar el vehículo';
      Alert.alert('Error', msg);
    },
  });

  async function handlePickPhoto(autoUpload: boolean) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir la foto');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    if (autoUpload) {
      // Vehículo ya existe → subir directamente
      uploadPhoto({ uri, isNew: false });
    } else {
      // Vehículo aún no existe → guardar URI para subirla tras crear
      setPendingPhotoUri(uri);
    }
  }

  function handleSave() {
    if (!brand.trim() || !model.trim() || !year.trim() || !plateNumber.trim() || !color.trim()) {
      Alert.alert('Campos incompletos', 'Completa todos los datos del vehículo');
      return;
    }
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Año inválido', 'Ingresa un año de fabricación válido');
      return;
    }
    save();
  }

  function handleDelete() {
    Alert.alert(
      'Eliminar vehículo',
      '¿Seguro que quieres eliminar tu vehículo? Ya no podrás publicar viajes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => remove() },
      ]
    );
  }

  const isBusy = saving || uploadingPhoto || removing;
  const photoUrl = existing?.photoUrl ?? null;

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
          <Text style={styles.headerTitle}>Mi Vehículo</Text>
          {existing ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={removing}>
              {removing
                ? <ActivityIndicator size="small" color="#ff6b4a" />
                : <Ionicons name="trash-outline" size={20} color="#ff6b4a" />
              }
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Estado visual del vehículo */}
            <View style={styles.iconBlock}>
              <View style={[styles.iconCircle, existing && styles.iconCircleActive]}>
                <Ionicons
                  name="car-sport-outline"
                  size={40}
                  color={existing ? colors.primary : colors.textDim}
                />
              </View>
              <Text style={styles.iconTitle}>
                {existing ? `${existing.brand} ${existing.model}` : 'Sin vehículo registrado'}
              </Text>
              {existing && (
                <View style={styles.platePill}>
                  <Text style={styles.platePillText}>{existing.plateNumber}</Text>
                </View>
              )}
              <Text style={styles.iconSub}>
                {existing
                  ? 'Edita los datos o usa el ícono de arriba para eliminar'
                  : 'Registra tu vehículo para poder publicar viajes'}
              </Text>
            </View>

            {/* Sección foto */}
            <View style={styles.photoSection}>
              <Text style={styles.sectionLabel}>Foto del vehículo</Text>
              <Text style={styles.photoHint}>
                Foto clara mostrando placa, color y carrocería
              </Text>

              {/* Preview: foto real, foto pendiente o placeholder */}
              {(photoUrl || pendingPhotoUri) ? (
                <Image
                  source={{ uri: photoUrl ?? pendingPhotoUri! }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={36} color={colors.textDim} />
                  <Text style={styles.photoPlaceholderText}>Sin foto aún</Text>
                </View>
              )}

              {/* Botón de foto */}
              {existing ? (
                // Vehículo existe → sube directamente al elegir
                <TouchableOpacity
                  style={[styles.photoBtn, uploadingPhoto && styles.photoBtnBusy]}
                  onPress={() => handlePickPhoto(true)}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color={colors.primaryDark} />
                    : <Ionicons name="camera-outline" size={18} color={colors.primaryDark} />
                  }
                  <Text style={styles.photoBtnText}>
                    {uploadingPhoto ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Agregar foto'}
                  </Text>
                </TouchableOpacity>
              ) : (
                // Vehículo no existe → guarda URI, se sube tras crear
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={() => handlePickPhoto(false)}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.photoBtnText}>
                    {pendingPhotoUri ? 'Cambiar foto elegida' : 'Elegir foto (opcional)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Formulario de datos */}
            <View style={styles.section}>
              <Field label="Marca" value={brand} onChangeText={setBrand} placeholder="Ej: Chevrolet" />
              <Field label="Modelo" value={model} onChangeText={setModel} placeholder="Ej: Sail" />
              <Field
                label="Año de fabricación"
                value={year}
                onChangeText={setYear}
                placeholder="Ej: 2018"
                keyboardType="numeric"
                autoCapitalize="none"
              />
              <Field
                label="Placa"
                value={plateNumber}
                onChangeText={(v) => setPlateNumber(v.toUpperCase())}
                placeholder="Ej: ABC-1234"
                autoCapitalize="characters"
              />
              <Field label="Color" value={color} onChangeText={setColor} placeholder="Ej: Blanco" />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        )}

        {!isLoading && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, isBusy && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {saving || (uploadingPhoto && pendingPhotoUri) ? (
                <ActivityIndicator color={colors.primaryDark} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {existing ? 'Actualizar vehículo' : 'Registrar vehículo'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center' },
  deleteBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  iconBlock: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCircleActive: { borderColor: colors.primary, backgroundColor: '#1a3322' },
  iconTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  platePill: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  platePillText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  iconSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 2,
  },
  photoSection: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.text,
  },
  photoHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -4,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
  },
  photoBtnBusy: { opacity: 0.6 },
  photoBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primaryDark,
  },
  section: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  fieldGroup: { gap: 6 },
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
  footer: { padding: 20, paddingBottom: 28, backgroundColor: colors.background },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.primaryDark },
});
