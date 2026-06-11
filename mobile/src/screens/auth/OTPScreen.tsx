import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { colors, fonts } from '../../theme';
import { authApi } from '../../api/auth.api';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTP_LENGTH = 6;

export default function OTPScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  function handleChange(text: string, index: number) {
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

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert('Error', 'Ingresa el código completo de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyEmail(email, code);
      Alert.alert('¡Listo!', 'Correo verificado. Ahora puedes iniciar sesión.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Código incorrecto o expirado';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await authApi.resendCode(email);
      Alert.alert('Código reenviado', `Revisa tu correo ${email}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo reenviar el código';
      Alert.alert('Error', msg);
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Ícono sobre */}
        <View style={styles.iconWrapper}>
          <Ionicons name="mail-outline" size={52} color={colors.primary} />
          <View style={styles.iconDot} />
        </View>

        {/* Título */}
        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Hemos enviado un código de 6 dígitos a{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* 6 inputs */}
        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor={colors.primary}
              cursorColor={colors.primary}
            />
          ))}
        </View>

        {/* Reenviar */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>¿No recibiste el código? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            {resending
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.resendLink}>Reenviar código</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={['#9cff93', '#00fc40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verifyBtn}
          >
            {loading
              ? <ActivityIndicator color={colors.primaryDark} />
              : <Text style={styles.verifyBtnText}>Verificar</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  backBtn: {
    marginTop: 56,
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 36,
  },
  iconDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.text,
    marginBottom: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  emailText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  otpBox: {
    width: 48,
    height: 58,
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
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  resendLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  footer: {
    paddingBottom: 40,
  },
  verifyBtn: {
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
});
