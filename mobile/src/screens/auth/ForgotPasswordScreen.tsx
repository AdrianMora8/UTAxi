import { useRef, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { colors, fonts } from '../../theme';
import { authApi } from '../../api/auth.api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const OTP_LENGTH = 6;

export default function ForgotPasswordScreen({ navigation }: Props) {
  // Paso 1
  const [email, setEmail] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);

  // Paso 2
  const [step, setStep] = useState<1 | 2>(1);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  async function handleSendCode() {
    if (!email) {
      Alert.alert('Error', 'Ingresa tu correo institucional');
      return;
    }
    if (!email.endsWith('@uta.edu.ec')) {
      Alert.alert('Error', 'Solo se permiten correos @uta.edu.ec');
      return;
    }
    setLoadingSend(true);
    try {
      await authApi.forgotPassword(email);
      setStep(2);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo enviar el código';
      Alert.alert('Error', msg);
    } finally {
      setLoadingSend(false);
    }
  }

  function handleDigitChange(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleReset() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert('Error', 'Ingresa el código completo de 6 dígitos');
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Ingresa y confirma tu nueva contraseña');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    setLoadingReset(true);
    try {
      await authApi.resetPassword(email, code, newPassword);
      Alert.alert('¡Listo!', 'Contraseña restablecida correctamente.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Código incorrecto o expirado';
      Alert.alert('Error', msg);
    } finally {
      setLoadingReset(false);
    }
  }

  if (step === 1) {
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
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.textMuted} />
            <Text style={styles.backText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Recuperar{'\n'}Cuenta</Text>
          <Text style={styles.subtitle}>
            Ingrese su correo institucional para recibir un código de recuperación.
          </Text>

          <Text style={styles.labelCaps}>CORREO INSTITUCIONAL</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="estudiante@uta.edu.ec"
              placeholderTextColor={colors.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity onPress={handleSendCode} disabled={loadingSend} activeOpacity={0.85} style={{ marginTop: 28 }}>
            <LinearGradient
              colors={['#9cff93', '#00fc40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              {loadingSend
                ? <ActivityIndicator color={colors.primaryDark} />
                : <Text style={styles.btnText}>Enviar Código  →</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, styles.step2Scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step2Title}>Ingresa el código</Text>
        <Text style={styles.step2Subtitle}>
          Enviamos un código de 6 dígitos a tu correo institucional
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor={colors.primary}
              cursorColor={colors.primary}
            />
          ))}
        </View>

        {/* Nueva contraseña */}
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor={colors.textDim}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
            <Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Confirmar contraseña */}
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
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

        <TouchableOpacity onPress={handleReset} disabled={loadingReset} activeOpacity={0.85} style={{ marginTop: 28 }}>
          <LinearGradient
            colors={['#9cff93', '#00fc40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            {loadingReset
              ? <ActivityIndicator color={colors.primaryDark} />
              : <Text style={styles.btnText}>Restablecer Contraseña  →</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backRowCentered} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backTextCenter}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  step2Scroll: {
    justifyContent: 'center',
    paddingTop: 60,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  backText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.text,
    lineHeight: 48,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 36,
  },
  labelCaps: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 10,
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
  btn: {
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
  // Paso 2
  step2Title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  step2Subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 28,
  },
  otpBox: {
    width: 46,
    height: 56,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHigh,
  },
  backRowCentered: {
    alignItems: 'center',
    marginTop: 24,
  },
  backTextCenter: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
});
