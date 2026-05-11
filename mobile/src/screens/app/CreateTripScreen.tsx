import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../../theme';
import { tripsApi } from '../../api/trips.api';
import type { PublicarStackParamList } from '../../navigation/MainTabs';

type NavProp = NativeStackNavigationProp<PublicarStackParamList, 'CreateTrip'>;

function SectionLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.sectionLabelText}>{label}</Text>
    </View>
  );
}

export default function CreateTripScreen() {
  const navigation = useNavigation<NavProp>();
  const queryClient = useQueryClient();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('');

  const { mutate: createTrip, isPending } = useMutation({
    mutationFn: () => {
      const departure = new Date(date);
      departure.setHours(time.getHours(), time.getMinutes(), 0, 0);
      return tripsApi.createTrip({
        originZone: origin.trim(),
        destinationZone: destination.trim(),
        departureTime: departure.toISOString(),
        totalSeats: seats,
        pricePerSeat: parseFloat(price) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      Alert.alert('¡Viaje publicado!', 'Tu viaje ya está visible para los pasajeros.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo publicar el viaje';
      Alert.alert('Error', msg);
    },
  });

  function handleSubmit() {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Error', 'Ingresa el origen y destino del viaje');
      return;
    }
    const departure = new Date(date);
    departure.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (departure <= new Date()) {
      Alert.alert('Error', 'La fecha y hora deben ser en el futuro');
      return;
    }
    createTrip();
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Publicar Viaje</Text>
        <Text style={styles.subtitle}>Organiza tu ruta y comparte el viaje.</Text>

        {/* Origen */}
        <View style={styles.fieldBlock}>
          <SectionLabel icon="locate-outline" label="ORIGEN" />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Campus, Estación..."
              placeholderTextColor={colors.textDim}
              value={origin}
              onChangeText={setOrigin}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Destino */}
        <View style={styles.fieldBlock}>
          <SectionLabel icon="location-outline" label="DESTINO" />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Zona, Calle..."
              placeholderTextColor={colors.textDim}
              value={destination}
              onChangeText={setDestination}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Fecha + Hora */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldBlock, { flex: 1 }]}>
            <SectionLabel icon="calendar-outline" label="FECHA" />
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowDate(true)}
            >
              <Text style={styles.pickerText}>{formatDate(date)}</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.fieldBlock, { flex: 1 }]}>
            <SectionLabel icon="time-outline" label="HORA" />
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowTime(true)}
            >
              <Text style={styles.pickerText}>{formatTime(time)}</Text>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {showDate && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_, selected) => {
              setShowDate(false);
              if (selected) setDate(selected);
            }}
          />
        )}
        {showTime && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            onChange={(_, selected) => {
              setShowTime(false);
              if (selected) setTime(selected);
            }}
          />
        )}

        {/* Asientos */}
        <View style={styles.fieldBlock}>
          <SectionLabel icon="people-outline" label="ASIENTOS DISPONIBLES" />
          <View style={styles.stepperCard}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setSeats(Math.max(1, seats - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{seats}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setSeats(Math.min(8, seats + 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Precio */}
        <View style={styles.fieldBlock}>
          <SectionLabel icon="cash-outline" label="APORTE SUGERIDO" />
          <View style={styles.priceCard}>
            <View style={styles.inputRow}>
              <Text style={styles.priceCurrency}>$</Text>
              <TextInput
                style={[styles.input, { fontSize: 22, fontFamily: fonts.display }]}
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
                value={price}
                onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón fijo */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSubmit} disabled={isPending} activeOpacity={0.85}>
          <LinearGradient
            colors={['#9cff93', '#00fc40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitBtn}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="arrow-up-circle-outline" size={20} color={colors.primaryDark} />
                <Text style={styles.submitBtnText}>Publicar Viaje</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 20,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -12,
  },
  fieldBlock: {
    gap: 8,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  pickerText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 56,
    height: 56,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
  },
  priceCurrency: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 28,
    backgroundColor: colors.background,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    height: 56,
  },
  submitBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.primaryDark,
  },
});
