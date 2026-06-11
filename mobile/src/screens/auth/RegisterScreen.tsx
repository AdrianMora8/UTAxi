import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { colors, fonts } from '../../theme';
import { authApi } from '../../api/auth.api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

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

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [carrera, setCarrera] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos requeridos');
      return;
    }
    if (!email.endsWith('@uta.edu.ec')) {
      Alert.alert('Error', 'Solo se permiten correos @uta.edu.ec');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Error', 'Debes aceptar los términos y condiciones');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ email, password, fullName, career: carrera || undefined });
      navigation.navigate('OTP', { email });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al registrarse';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>U-RIDE</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Únete a la vía.</Text>
        <Text style={styles.subtitle}>
          Regístrate con tu correo institucional para comenzar a moverte seguro.
        </Text>

        {/* Fields */}
        <View style={styles.form}>
          {/* Nombre */}
          <Text style={styles.label}>Nombre Completo</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor={colors.textDim}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <Text style={[styles.label, { marginTop: 16 }]}>Correo Institucional</Text>
          <View style={styles.inputRow}>
            <Ionicons name="school-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="usuario@uta.edu.ec"
              placeholderTextColor={colors.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.hint}>Solo se permiten correos terminados en @uta.edu.ec</Text>

          {/* Carrera picker */}
          <Text style={[styles.label, { marginTop: 16 }]}>Carrera</Text>
          <TouchableOpacity style={styles.inputRow} onPress={() => setShowPicker(true)}>
            <Ionicons name="book-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <Text style={[styles.input, { lineHeight: 56, color: carrera ? colors.text : colors.textDim }]}>
              {carrera || 'Selecciona tu carrera'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Contraseña */}
          <Text style={[styles.label, { marginTop: 16 }]}>Contraseña</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Repetir contraseña */}
          <Text style={[styles.label, { marginTop: 16 }]}>Repetir Contraseña</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Términos */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptTerms(!acceptTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
              {acceptTerms && <Ionicons name="checkmark" size={13} color={colors.primaryDark} />}
            </View>
            <Text style={styles.termsText}>
              Acepto los{' '}
              <Text style={styles.termsLink}>Términos de Servicio</Text>
              {' '}y la{' '}
              <Text style={styles.termsLink}>Política de Privacidad</Text>
              {' '}de U-Ride.
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={['#9cff93', '#00fc40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.registerBtn}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <Text style={styles.registerBtnText}>Crear Cuenta  →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
          <Text style={styles.loginLinkText}>
            ¿Ya tienes cuenta?{' '}
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}>Iniciar Sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal picker de carreras */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPicker(false)} activeOpacity={1}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Selecciona tu carrera</Text>
            <FlatList
              data={CARRERAS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => { setCarrera(item); setShowPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, carrera === item && { color: colors.primary }]}>
                    {item}
                  </Text>
                  {carrera === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    marginBottom: 28,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.primary,
    letterSpacing: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 28,
  },
  form: {
    marginBottom: 28,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.bodyMedium,
  },
  registerBtn: {
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
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
});
