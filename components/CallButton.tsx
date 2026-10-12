import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { callNumber, openWhatsApp } from '@/lib/phone';

type Props = {
  phoneNumber: string;
  size?: 'sm' | 'lg';
  accessibilityLabel?: string;
};

export function CallButton({ phoneNumber, size = 'sm', accessibilityLabel }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();

  if (size === 'lg') {
    return (
      <View style={styles.lgGroup}>
        <Pressable
          onPress={() => openWhatsApp(phoneNumber)}
          accessibilityRole="button"
          accessibilityLabel={`${t('whatsapp')} ${phoneNumber}`}
          style={[styles.lgButton, { backgroundColor: c.whatsappBg, borderColor: c.whatsapp }]}
        >
          <Ionicons name="logo-whatsapp" size={16} color={c.whatsapp} />
          <Text style={[styles.lgLabel, { color: c.whatsapp }]}>{t('whatsapp')}</Text>
        </Pressable>
        <Pressable
          onPress={() => callNumber(phoneNumber)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? `${t('call')} ${phoneNumber}`}
          style={[styles.lgButton, styles.lgButtonCall, { backgroundColor: c.accentBg, borderColor: c.accent }]}
        >
          <Ionicons name="call" size={19} color={c.accent} />
          <Text style={[styles.lgLabel, styles.lgLabelCall, { color: c.accent }]}>{t('call')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.smGroup}>
      <Pressable
        onPress={() => openWhatsApp(phoneNumber)}
        accessibilityRole="button"
        accessibilityLabel={`${t('whatsapp')} ${phoneNumber}`}
        style={[styles.smButton, { backgroundColor: c.whatsappBg }]}
      >
        <Ionicons name="logo-whatsapp" size={15} color={c.whatsapp} />
      </Pressable>
      <Pressable
        onPress={() => callNumber(phoneNumber)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${t('call')} ${phoneNumber}`}
        style={[styles.smButton, styles.smButtonCall, { backgroundColor: c.accentBg }]}
      >
        <Ionicons name="call" size={18} color={c.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  smGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smButtonCall: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  lgGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lgButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  lgButtonCall: {
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  lgLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  lgLabelCall: {
    fontSize: 15,
  },
});
