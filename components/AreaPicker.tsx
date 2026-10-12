import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import { getAreaNames } from '@/lib/queries';

type Props = {
  value: string;
  onChange: (name: string) => void;
};

type AreaOption = { name: string; nameGu: string | null };

export function AreaPicker({ value, onChange }: Props) {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const [allAreas, setAllAreas] = useState<AreaOption[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    getAreaNames().then(setAllAreas);
  }, []);

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const query = normalize(value);
  const matches = query
    ? allAreas.filter((a) => normalize(a.name).includes(query) || (a.nameGu && normalize(a.nameGu).includes(query)))
    : allAreas;
  const exactMatch = allAreas.some((a) => normalize(a.name) === query);
  const showCreateOption = query.length > 0 && !exactMatch;

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={t('selectOrTypeArea')}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />
      {focused && (matches.length > 0 || showCreateOption) && (
        <View style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {matches.map((area) => (
              <Pressable
                key={area.name}
                onPress={() => {
                  onChange(area.name);
                  setFocused(false);
                }}
                style={[styles.option, { borderBottomColor: c.border }]}
              >
                <Text style={{ color: c.text, fontSize: 14 }}>{getAreaDisplayName(area, lang)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {showCreateOption && (
            <Pressable onPress={() => setFocused(false)} style={styles.option}>
              <Text style={{ color: c.accent, fontSize: 14 }}>+ {t('addAsNewArea', { name: value.trim() })}</Text>
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
  dropdownScroll: {
    maxHeight: 220,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
