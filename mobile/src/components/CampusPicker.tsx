import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { CAMPUSES, type Campus } from '../constants/campuses';

interface Props {
  value: Campus | null;
  onChange: (campus: Campus) => void;
}

export default function CampusPicker({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {CAMPUSES.map((campus) => {
        const selected = value?.id === campus.id;
        return (
          <TouchableOpacity
            key={campus.id}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(campus)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
              <Ionicons
                name="school-outline"
                size={18}
                color={selected ? colors.primaryDark : colors.textMuted}
              />
            </View>
            <View style={styles.textBlock}>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {campus.label}
              </Text>
              <Text style={styles.description}>{campus.description}</Text>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#0d2218',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSelected: {
    backgroundColor: colors.primary,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.text,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textDim,
  },
});
