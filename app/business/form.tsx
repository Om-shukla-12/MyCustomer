import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Control, Controller, useFieldArray, useForm } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CategoryPicker } from '@/components/CategoryPicker';
import { LabelInput } from '@/components/LabelInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { isValidMobile } from '@/lib/phone';
import {
  findDuplicateBusinessContactByPhone,
  getBusinessContactById,
  saveBusinessContact,
} from '@/lib/businessQueries';

type FormValues = {
  name: string;
  categoryName: string;
  primaryNumber: string;
  notes: string;
  numbers: { phoneNumber: string; label: string }[];
};

const EMPTY_VALUES: FormValues = {
  name: '',
  categoryName: '',
  primaryNumber: '',
  notes: '',
  numbers: [],
};

function ExtraNumberRow({
  control,
  index,
  onRemove,
}: {
  control: Control<FormValues>;
  index: number;
  onRemove: () => void;
}) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();

  return (
    <View style={[styles.extraCard, { borderColor: c.border }]}>
      <View style={styles.extraHeader}>
        <Controller
          control={control}
          name={`numbers.${index}.phoneNumber`}
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('phoneNumberPlaceholder')}
              placeholderTextColor={c.textMuted}
              keyboardType="phone-pad"
              style={[
                styles.input,
                styles.extraInput,
                { color: c.text, borderColor: c.border, backgroundColor: c.surface },
              ]}
            />
          )}
        />
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('removeNumberA11y')}
          style={styles.removeBtn}
        >
          <Ionicons name="trash-outline" size={18} color={c.danger} />
        </Pressable>
      </View>
      <Controller
        control={control}
        name={`numbers.${index}.label`}
        render={({ field }) => <LabelInput value={field.value} onChange={field.onChange} />}
      />
    </View>
  );
}

export default function BusinessContactFormScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existingId = id ? Number(id) : undefined;
  const isEdit = existingId !== undefined;

  const [loaded, setLoaded] = useState(!isEdit);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  const { fields, append, remove } = useFieldArray({ control, name: 'numbers' });

  useEffect(() => {
    if (!isEdit || !existingId) return;
    getBusinessContactById(existingId).then((contact) => {
      if (!contact) return;
      reset({
        name: contact.name,
        categoryName: contact.categoryName,
        primaryNumber: contact.primaryNumber,
        notes: contact.notes ?? '',
        numbers: contact.numbers.map((n) => ({ phoneNumber: n.phoneNumber, label: n.label })),
      });
      setLoaded(true);
    });
  }, [isEdit, existingId, reset]);

  const performSave = async (values: FormValues) => {
    await saveBusinessContact({
      id: existingId,
      name: values.name,
      categoryName: values.categoryName,
      primaryNumber: values.primaryNumber,
      notes: values.notes,
      numbers: values.numbers,
    });
    router.back();
  };

  const onSubmit = async (values: FormValues) => {
    const duplicate = await findDuplicateBusinessContactByPhone(values.primaryNumber, existingId);
    if (duplicate) {
      Alert.alert(t('duplicateTitle'), t('duplicateMessage', { name: duplicate.name }), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('editExisting'),
          onPress: () => router.replace({ pathname: '/business/form', params: { id: String(duplicate.id) } }),
        },
        { text: t('saveAnyway'), onPress: () => performSave(values) },
      ]);
      return;
    }
    await performSave(values);
  };

  if (!loaded) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: isEdit ? t('editBusinessContactTitle') : t('addBusinessContactTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('name')}</Text>
          <Controller
            control={control}
            name="name"
            rules={{ required: t('errorEnterName') }}
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('businessNamePlaceholder')}
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.name ? <Text style={[styles.error, { color: c.danger }]}>{errors.name.message}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('category')}</Text>
          <Controller
            control={control}
            name="categoryName"
            rules={{ required: t('errorSelectCategory') }}
            render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} />}
          />
          {errors.categoryName ? (
            <Text style={[styles.error, { color: c.danger }]}>{errors.categoryName.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('primaryNumberField')}</Text>
          <Controller
            control={control}
            name="primaryNumber"
            rules={{ validate: (value) => isValidMobile(value) || t('errorValidNumber') }}
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('tenDigitPlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.primaryNumber ? (
            <Text style={[styles.error, { color: c.danger }]}>{errors.primaryNumber.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('additionalNumbers')}</Text>
          {fields.map((item, index) => (
            <ExtraNumberRow key={item.id} control={control} index={index} onRemove={() => remove(index)} />
          ))}
          <Pressable
            onPress={() => append({ phoneNumber: '', label: '' })}
            style={[styles.addRowBtn, { borderColor: c.border }]}
          >
            <Ionicons name="add" size={16} color={c.accent} />
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '500' }}>{t('addAnotherNumber')}</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('notes')}</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('notesPlaceholder')}
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.notesInput,
                  { color: c.text, borderColor: c.border, backgroundColor: c.surface },
                ]}
              />
            )}
          />
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
        >
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('saveBusinessContact')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 12 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  notesInput: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  error: { fontSize: 12 },
  extraCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8, marginBottom: 10 },
  extraHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  extraInput: { flex: 1 },
  removeBtn: { padding: 6 },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 10,
    justifyContent: 'center',
  },
  saveBtn: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
