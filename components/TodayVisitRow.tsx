import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import type { TodayVisitItem } from '@/lib/todayVisits';

type Props = {
  item: TodayVisitItem;
  onPress: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function TodayVisitRow({
  item,
  onPress,
  onToggleStatus,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const done = item.status === 'done';

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={styles.topLine}>
        <Pressable
          onPress={onToggleStatus}
          accessibilityRole="button"
          accessibilityLabel={t(done ? 'markPending' : 'markVisited')}
          style={styles.statusBtn}
        >
          <Ionicons
            name={done ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={done ? c.accent : c.textMuted}
          />
        </Pressable>
        <Text
          style={[styles.name, { color: done ? c.textMuted : c.text }, done && styles.strike]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <CallButton phoneNumber={item.primaryMobile} accessibilityLabel={`${t('call')} ${item.name}`} />
      </View>
      <View style={styles.bottomLine}>
        <Text style={[styles.area, { color: c.textMuted }]} numberOfLines={1}>
          {getAreaDisplayName({ name: item.areaName, nameGu: item.areaNameGu }, lang)}
        </Text>
        <View style={styles.utilActions}>
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            accessibilityRole="button"
            accessibilityLabel={t('reorderUpA11y')}
            style={styles.utilBtn}
          >
            <Ionicons name="chevron-up" size={18} color={canMoveUp ? c.textSecondary : c.border} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            accessibilityRole="button"
            accessibilityLabel={t('reorderDownA11y')}
            style={styles.utilBtn}
          >
            <Ionicons name="chevron-down" size={18} color={canMoveDown ? c.textSecondary : c.border} />
          </Pressable>
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={t('removeFromToday')}
            style={styles.utilBtn}
          >
            <Ionicons name="close-circle-outline" size={18} color={c.danger} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  strike: { textDecorationLine: 'line-through' },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 34,
  },
  area: { fontSize: 12, flexShrink: 1 },
  utilActions: { flexDirection: 'row', alignItems: 'center' },
  utilBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
