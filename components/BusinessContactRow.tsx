import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BusinessContactListItem } from '@/lib/businessQueries';

type Props = {
  contact: BusinessContactListItem;
  onPress: () => void;
};

export function BusinessContactRow({ contact, onPress }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={styles.left}>
        <View style={[styles.icon, { backgroundColor: c.accentBg }]}>
          <Ionicons name="business-outline" size={18} color={c.accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {contact.name}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
            {contact.categoryName}
          </Text>
        </View>
      </View>
      <CallButton phoneNumber={contact.primaryNumber} accessibilityLabel={`${t('call')} ${contact.name}`} />
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
});
