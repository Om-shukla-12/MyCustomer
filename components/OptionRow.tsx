import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  showBottomBorder?: boolean;
};

export function OptionRow({ label, selected, onPress, showBottomBorder = true }: Props) {
  const c = Colors[useColorScheme()];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor: c.border, borderBottomWidth: showBottomBorder ? StyleSheet.hairlineWidth : 0 },
      ]}
    >
      <Text style={{ color: c.text, fontSize: 15 }}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={20} color={c.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
});
