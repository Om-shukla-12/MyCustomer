import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { createArea, getAreasWithCounts, updateAreaNameGu, type AreaWithCount } from '@/lib/queries';

function AddLocationCard({ onAdded }: { onAdded: () => void }) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [nameGu, setNameGu] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError(t('errorEnterName'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createArea(name, nameGu);
      setName('');
      setNameGu('');
      onAdded();
    } catch (e) {
      if (e instanceof Error && e.message === 'duplicate') {
        setError(t('locationAlreadyExists'));
      } else {
        setError(t('saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.addCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <TextInput
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError('');
        }}
        placeholder={t('locationNamePlaceholder')}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
      />
      <TextInput
        value={nameGu}
        onChangeText={setNameGu}
        placeholder={t('gujaratiNamePlaceholder')}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
      />
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
      <Pressable
        onPress={handleAdd}
        disabled={saving}
        style={[styles.addBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
      >
        {saving ? (
          <ActivityIndicator size="small" color={c.accent} />
        ) : (
          <>
            <Ionicons name="add" size={16} color={c.accent} />
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>{t('addLocation')}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function AreaTranslationRow({ area, border }: { area: AreaWithCount; border: string }) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [value, setValue] = useState(area.nameGu ?? '');
  const [savedValue, setSavedValue] = useState(area.nameGu ?? '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = value.trim() !== savedValue;

  const handleSave = async () => {
    const trimmed = value.trim();
    setSaving(true);
    try {
      await updateAreaNameGu(area.id, trimmed || null);
      setSavedValue(trimmed);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch {
      Alert.alert(t('gujaratiNamePlaceholder'), t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.row, { borderBottomColor: border }]}>
      <Text style={[styles.name, { color: c.text }]}>{area.name}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={t('gujaratiNamePlaceholder')}
          placeholderTextColor={c.textMuted}
          style={[styles.input, styles.rowInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />
        {dirty ? (
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={c.accent} />
            ) : (
              <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>{t('save')}</Text>
            )}
          </Pressable>
        ) : justSaved ? (
          <View style={styles.savedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={c.accent} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function ManageAreasScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [areas, setAreas] = useState<AreaWithCount[]>([]);

  const refetch = useCallback(() => {
    getAreasWithCounts().then(setAreas);
  }, []);

  useFocusEffect(refetch);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: t('manageAreas') }} />
      <FlatList
        data={areas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <AreaTranslationRow area={item} border={c.border} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={[styles.hint, { color: c.textSecondary }]}>{t('manageAreasHint')}</Text>
            <AddLocationCard onAdded={refetch} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>{t('noAreasYet')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: { fontSize: 13, lineHeight: 18, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  empty: { padding: 32, alignItems: 'center' },
  addCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  error: { fontSize: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
  },
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  rowInput: { flex: 1 },
  saveBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedIndicator: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
