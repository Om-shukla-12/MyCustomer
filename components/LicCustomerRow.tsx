import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import type { LicCustomerListItem } from '@/lib/licQueries';
import { licModeTranslationKey } from '@/lib/translations';

type Props = {
  item: LicCustomerListItem;
  onPress: () => void;
};

export function LicCustomerRow({ item, onPress }: Props) {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();

  const areaLabel = item.areaName ? getAreaDisplayName({ name: item.areaName, nameGu: item.areaNameGu }, lang) : null;
  const subtitleParts = [item.policyNo, areaLabel].filter(Boolean);

  const modeKey = item.mode ? licModeTranslationKey(item.mode) : null;
  const modeLabel = item.mode ? (modeKey ? t(modeKey) : item.mode) : null;
  const totalDue =
    item.installmentPremium != null && item.installmentsDue != null
      ? item.installmentPremium * item.installmentsDue
      : null;
  const leadParts = [
    modeLabel,
    item.installmentsDue != null ? t('installmentsDueShort', { count: String(item.installmentsDue) }) : null,
  ].filter(Boolean);
  const totalDueColor = totalDue != null && totalDue > 10000 ? c.danger : totalDue != null && totalDue > 5000 ? c.warning : c.accent;

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={styles.textCol}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {item.assuredName}
        </Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
          {subtitleParts.join(' · ')}
        </Text>
        {leadParts.length > 0 || totalDue != null ? (
          <Text style={[styles.fup, { color: c.accent }]} numberOfLines={1}>
            {leadParts.join(' · ')}
            {totalDue != null ? (
              <Text style={{ color: totalDueColor }}>
                {leadParts.length > 0 ? ' · ' : ''}₹{totalDue}
              </Text>
            ) : null}
          </Text>
        ) : null}
      </View>
      {item.phoneNumber ? (
        <CallButton phoneNumber={item.phoneNumber} accessibilityLabel={`${t('call')} ${item.assuredName}`} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textCol: { flexShrink: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14 },
  fup: { fontSize: 14, fontWeight: '600' },
});
