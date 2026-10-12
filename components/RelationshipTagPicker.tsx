import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { tagTranslationKey } from '@/lib/translations';

type Props = {
  tags: { id: number; name: string }[];
  value: string;
  onChange: (name: string) => void;
};

export function RelationshipTagPicker({ tags, value, onChange }: Props) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      {tags.map((tag) => {
        const selected = tag.name === value;
        const key = tagTranslationKey(tag.name);
        const label = key ? t(key) : tag.name;
        return (
          <Pressable
            key={tag.id}
            onPress={() => onChange(tag.name)}
            style={[
              styles.pill,
              {
                backgroundColor: selected ? c.accentBg : c.surface,
                borderColor: selected ? c.accent : c.border,
              },
            ]}
          >
            <Text style={{ color: selected ? c.accent : c.textSecondary, fontSize: 13, fontWeight: '500' }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
});
