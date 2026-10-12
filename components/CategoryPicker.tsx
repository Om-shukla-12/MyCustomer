import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBusinessCategories } from '@/lib/businessQueries';

type Props = {
  value: string;
  onChange: (name: string) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    getBusinessCategories().then((rows) => setAllCategories(rows.map((r) => r.name)));
  }, []);

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const query = normalize(value);
  const matches = query ? allCategories.filter((a) => normalize(a).includes(query)) : allCategories;
  const exactMatch = allCategories.some((a) => normalize(a) === query);
  const showCreateOption = query.length > 0 && !exactMatch;

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={t('selectOrTypeCategory')}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />
      {focused && (matches.length > 0 || showCreateOption) && (
        <View style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border }]}>
          {matches.slice(0, 5).map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                onChange(name);
                setFocused(false);
              }}
              style={[styles.option, { borderBottomColor: c.border }]}
            >
              <Text style={{ color: c.text, fontSize: 14 }}>{name}</Text>
            </Pressable>
          ))}
          {showCreateOption && (
            <Pressable onPress={() => setFocused(false)} style={styles.option}>
              <Text style={{ color: c.accent, fontSize: 14 }}>+ {t('addAsNewCategory', { name: value.trim() })}</Text>
            </Pressable>
          )}
        </View>
      )}
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
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
