import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fonts } from '../theme';
import { ratingsApi } from '../api/ratings.api';

interface Props {
  tripRequestId: string;
  targetName: string;
  raterRole?: 'driver' | 'passenger';
  onClose: () => void;
  onSuccess?: () => void;
  /** Si es true, no se puede cerrar sin calificar primero */
  mandatory?: boolean;
  /** @deprecated Use targetName */
  driverName?: string;
}

export default function RatingModal({
  tripRequestId,
  targetName,
  raterRole = 'passenger',
  onClose,
  onSuccess,
  mandatory = false,
  driverName,
}: Props) {
  const resolvedName = targetName || driverName || '';
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const { mutate: submitRating, isPending } = useMutation({
    mutationFn: () => ratingsApi.createRating({ tripRequestId, score, comment: comment.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'No se pudo enviar la calificación';
      Alert.alert('Error', msg);
    },
  });

  function handleSubmit() {
    if (score === 0) {
      const who = raterRole === 'driver' ? 'al pasajero' : 'al conductor';
      Alert.alert('Selecciona una puntuación', `Toca las estrellas para calificar ${who}`);
      return;
    }
    submitRating();
  }

  const firstName = resolvedName.split(' ')[0];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={mandatory ? undefined : onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!mandatory && (
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        )}
        {mandatory && <View style={styles.backdrop} />}

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Título */}
          <Text style={styles.title}>Calificar viaje</Text>
          <Text style={styles.subtitle}>
            {raterRole === 'driver'
              ? `¿Cómo fue el comportamiento de ${firstName}?`
              : `¿Cómo fue tu experiencia con ${firstName}?`}
          </Text>

          {/* Estrellas */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setScore(n)} activeOpacity={0.7}>
                <Ionicons
                  name={n <= score ? 'star' : 'star-outline'}
                  size={40}
                  color={n <= score ? colors.primary : colors.textDim}
                />
              </TouchableOpacity>
            ))}
          </View>

          {score > 0 && (
            <Text style={styles.scoreLabel}>
              {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][score]}
            </Text>
          )}

          {/* Comentario */}
          <TextInput
            style={styles.commentInput}
            placeholder="Comentario opcional..."
            placeholderTextColor={colors.textDim}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
            returnKeyType="done"
          />

          {mandatory && (
            <Text style={styles.mandatoryNote}>Califica el viaje para continuar</Text>
          )}

          {/* Botones */}
          <View style={styles.btnRow}>
            {!mandatory && (
              <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={isPending}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btnSubmit, score === 0 && styles.btnSubmitDisabled]}
              onPress={handleSubmit}
              disabled={isPending || score === 0}
            >
              {isPending ? (
                <ActivityIndicator color={colors.primaryDark} />
              ) : (
                <Text style={styles.btnSubmitText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDim,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -8,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  scoreLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    marginTop: -8,
  },
  commentInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
  },
  btnCancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
  btnSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  btnSubmitDisabled: {
    opacity: 0.4,
  },
  btnSubmitText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
  mandatoryNote: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: -6,
  },
});
