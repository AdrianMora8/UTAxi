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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { colors, fonts } from '../../theme';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setAuth(data.user, data.accessToken);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al iniciar sesión';
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
        <View style={styles.header}>
          <Text style={styles.logo}>U-Ride</Text>
          <Text style={styles.tagline}>THE ACADEMIC KINETIC</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Correo Institucional</Text>
          <View style={styles.inputRow}>
            <Ionicons name="at" size={20} color={colors.textMuted} style={styles.inputIcon} />
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

          <Text style={[styles.label, { marginTop: 20 }]}>Contraseña</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
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
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={['#9cff93', '#00fc40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loginBtn}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <Text style={styles.loginBtnText}>Iniciar Sesión  →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta?{' '}
            <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
              Registrarse
            </Text>
          </Text>
          <View style={styles.legalRow}>
            <Text style={styles.legalText}>TÉRMINOS</Text>
            <Text style={styles.legalDot}> • </Text>
            <Text style={styles.legalText}>PRIVACIDAD</Text>
          </View>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 52,
    color: colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 4,
    marginTop: 6,
  },
  form: {
    marginBottom: 40,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  forgotText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  loginBtn: {
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 48,
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  registerLink: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1.5,
  },
  legalDot: {
    color: colors.textDim,
    fontSize: 11,
  },
});
