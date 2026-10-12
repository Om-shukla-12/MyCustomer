import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPhoneDisplay } from '@/lib/phone';
import type { CustomerListItem } from '@/lib/queries';

type Props = {
  customer: CustomerListItem;
  onPress: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  addedToToday?: boolean;
  onToggleToday?: () => void;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function CustomerRow({ customer, onPress, selectionMode, selected, addedToToday, onToggleToday }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const subtitle = customer.customerSince
    ? `${t('customerSincePrefix')} ${customer.customerSince}`
    : formatPhoneDisplay(customer.primaryMobile);

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={styles.left}>
        {selectionMode ? (
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? c.accent : c.textMuted}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: c.accentBg }]}>
            <Text style={[styles.avatarText, { color: c.accent }]}>{getInitials(customer.name)}</Text>
          </View>
        )}
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      {!selectionMode ? (
        <View style={styles.actions}>
          {onToggleToday ? (
            <Pressable
              onPress={onToggleToday}
              accessibilityRole="button"
              accessibilityLabel={t(addedToToday ? 'removeFromToday' : 'addToToday')}
              style={styles.todayBtn}
            >
              <Ionicons
                name={addedToToday ? 'calendar' : 'calendar-outline'}
                size={20}
                color={addedToToday ? c.accent : c.textMuted}
              />
            </Pressable>
          ) : null}
          <CallButton phoneNumber={customer.primaryMobile} accessibilityLabel={`${t('call')} ${customer.name}`} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  textCol: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todayBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600' },
  name: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
});
