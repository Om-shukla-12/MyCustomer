import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';

export type FabAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type Props = {
  href?: Href;
  accessibilityLabel?: string;
  actions?: FabAction[];
};

export function Fab({ href = '/customer/form', accessibilityLabel, actions }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!actions) {
    return (
      <Pressable
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? t('addCustomerLabel')}
        style={[styles.fab, { backgroundColor: c.accentBg, borderColor: c.accent }]}
      >
        <Ionicons name="add" size={26} color={c.accent} />
      </Pressable>
    );
  }

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menuWrap}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                style={[styles.menuItem, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>{action.label}</Text>
                <View style={[styles.menuIcon, { backgroundColor: c.accentBg }]}>
                  <Ionicons name={action.icon} size={18} color={c.accent} />
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? t('addCustomerLabel')}
        style={[styles.fab, { backgroundColor: c.accentBg, borderColor: c.accent }]}
      >
        <Ionicons name="add" size={26} color={c.accent} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  menuWrap: {
    position: 'absolute',
    right: 20,
    bottom: 88,
    gap: 10,
    alignItems: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
