import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PerfilStackParamList } from '../../navigation/MainTabs';
import { colors, fonts } from '../../theme';
import { paymentsApi, WalletTransaction } from '../../api/payments.api';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Wallet'>;

const CONCEPT_CONFIG: Record<WalletTransaction['concept'], { label: string; icon: string; color: string }> = {
  TOPUP:            { label: 'Recarga',          icon: 'arrow-down-circle', color: colors.primary },
  PAYMENT:          { label: 'Pago de reserva',  icon: 'card',              color: '#ff6b4a' },
  REFUND:           { label: 'Reembolso',         icon: 'return-down-back',  color: colors.primary },
  CANCELLATION_FEE: { label: 'Compensación',      icon: 'cash',              color: '#f5c518' },
  TRIP_EARNING:     { label: 'Ganancia de viaje', icon: 'cash',              color: colors.primary },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function TransactionRow({ item }: { item: WalletTransaction }) {
  const cfg = CONCEPT_CONFIG[item.concept];
  const isCredit = item.type === 'CREDIT';
  const isCard = item.concept === 'PAYMENT' && item.description?.includes('(tarjeta)');
  const isWallet = item.concept === 'PAYMENT' && item.description?.includes('(U-Wallet)');
  const cleanDesc = item.description?.replace(' (tarjeta)', '').replace(' (U-Wallet)', '') ?? null;
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? '#1a3322' : '#2a1515' }]}>
        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
      </View>
      <View style={styles.txInfo}>
        <View style={styles.txLabelRow}>
          <Text style={styles.txLabel}>{cfg.label}</Text>
          {isCard && (
            <View style={styles.methodBadgeCard}>
              <Text style={styles.methodBadgeCardText}>Tarjeta</Text>
            </View>
          )}
          {isWallet && (
            <View style={styles.methodBadgeWallet}>
              <Text style={styles.methodBadgeWalletText}>Wallet</Text>
            </View>
          )}
        </View>
        {cleanDesc ? (
          <Text style={styles.txDescription} numberOfLines={1}>{cleanDesc}</Text>
        ) : null}
        <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? colors.primary : '#ff6b4a' }]}>
        {isCredit ? '+' : '-'}${item.amount.toFixed(2)}
      </Text>
    </View>
  );
}

export default function WalletScreen({ navigation }: Props) {
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [topUpInput, setTopUpInput] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsApi.getWallet().then(r => r.data),
  });

  const { mutate: doTopUp, isPending: topping } = useMutation({
    mutationFn: (amount: number) => paymentsApi.topUp(amount),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setTopUpVisible(false);
      setTopUpInput('');
      Alert.alert('Recarga exitosa', `Tu nuevo saldo es $${res.data.walletBalance.toFixed(2)}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo realizar la recarga';
      Alert.alert('Error', msg);
    },
  });

  function handleTopUp() {
    const amount = parseFloat(topUpInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un valor mayor a $0');
      return;
    }
    if (amount > 500) {
      Alert.alert('Monto inválido', 'El máximo por recarga es $500');
      return;
    }
    doTopUp(amount);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>U-Wallet</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="wifi-outline" size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>Error de conexión</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.transactions ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Tarjeta de saldo */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Saldo disponible</Text>
                <Text style={styles.balanceAmount}>
                  ${(data?.walletBalance ?? 0).toFixed(2)}
                </Text>
                {(data?.pendingBalance ?? 0) > 0 && (
                  <View style={styles.pendingRow}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.pendingText}>
                      ${data!.pendingBalance.toFixed(2)} en tránsito
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.topUpBtn}
                  onPress={() => setTopUpVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.topUpBtnText}>Recargar</Text>
                </TouchableOpacity>
              </View>

              {/* Título historial */}
              {(data?.transactions.length ?? 0) > 0 && (
                <Text style={styles.sectionTitle}>Movimientos</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={40} color={colors.textDim} />
              <Text style={styles.emptyTxText}>Sin movimientos aún</Text>
            </View>
          }
        />
      )}

      {/* Modal de recarga */}
      <Modal visible={topUpVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Recargar U-Wallet</Text>
            <Text style={styles.modalSub}>Ingresa el monto a añadir (máx. $500)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={topUpInput}
                onChangeText={setTopUpInput}
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setTopUpVisible(false); setTopUpInput(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleTopUp}
                disabled={topping}
              >
                {topping
                  ? <ActivityIndicator size="small" color={colors.primaryDark} />
                  : <Text style={styles.modalConfirmText}>Recargar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
  },
  retryText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  // Balance card
  balanceCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    gap: 8,
  },
  balanceLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.primary,
    lineHeight: 56,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pendingText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  topUpBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  // Transaction row
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { flex: 1, gap: 3 },
  txLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  methodBadgeCard: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  methodBadgeCardText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodBadgeWallet: {
    backgroundColor: 'rgba(156,255,147,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  methodBadgeWalletText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txDescription: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  txDate: { fontFamily: fonts.body, fontSize: 11, color: colors.textDim },
  txAmount: { fontFamily: fonts.display, fontSize: 16 },
  emptyTx: { alignItems: 'center', paddingTop: 24, gap: 10 },
  emptyTxText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  modalSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 4,
    marginTop: 4,
  },
  inputPrefix: { fontFamily: fonts.display, fontSize: 22, color: colors.primary },
  input: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    height: '100%',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primaryDark },
});
