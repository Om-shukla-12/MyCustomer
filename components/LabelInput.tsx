import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUsedLabels } from '@/lib/businessQueries';

const SEED_LABELS = ['Sales', 'Support', 'Accounts', 'WhatsApp', 'Manager', 'Complaint', 'Emergency', 'Office'];

type Props = {
  value: string;
  onChange: (label: string) => void;
};

export function LabelInput({ value, onChange }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<string[]>(SEED_LABELS);

  useEffect(() => {
    getUsedLabels().then((used) => {
      const merged = [...used];
      SEED_LABELS.forEach((label) => {
        if (!merged.some((m) => m.toLowerCase() === label.toLowerCase())) merged.push(label);
      });
      setSuggestions(merged);
    });
  }, []);

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('businessLabelPlaceholder')}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />
      <View style={styles.pillWrap}>
        {suggestions.slice(0, 8).map((label) => {
          const selected = label.toLowerCase() === value.trim().toLowerCase();
          return (
            <Pressable
              key={label}
              onPress={() => onChange(label)}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? c.accentBg : c.surface,
                  borderColor: selected ? c.accent : c.border,
                },
              ]}
            >
              <Text style={{ color: selected ? c.accent : c.textSecondary, fontSize: 12, fontWeight: '500' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
});
