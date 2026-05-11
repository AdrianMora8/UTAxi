import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

export default function AvisosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Avisos</Text>
      <Text style={styles.sub}>Sin notificaciones por ahora</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  text: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 8 },
});
