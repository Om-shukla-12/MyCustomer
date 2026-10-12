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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { AreaPicker } from '@/components/AreaPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { isValidMobile } from '@/lib/phone';
import { findDuplicatePolicyNo, getLicCustomerById, saveLicCustomer } from '@/lib/licQueries';
import type { TranslationKey } from '@/lib/translations';

type FormValues = {
  policyNo: string;
  assuredName: string;
  phoneNumber: string;
  areaName: string;
  dateOfCommencement: string;
  planTerm: string;
  mode: string;
  fupDate: string;
  flag: string;
  installmentPremium: string;
  installmentsDue: string;
  notes: string;
};

const EMPTY_VALUES: FormValues = {
  policyNo: '',
  assuredName: '',
  phoneNumber: '',
  areaName: '',
  dateOfCommencement: '',
  planTerm: '',
  mode: '',
  fupDate: '',
  flag: '',
  installmentPremium: '',
  installmentsDue: '',
  notes: '',
};

const MODE_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Monthly', labelKey: 'modeMonthly' },
  { value: 'Quarterly', labelKey: 'modeQuarterly' },
  { value: 'Half-Yearly', labelKey: 'modeHalfYearly' },
  { value: 'Yearly', labelKey: 'modeYearly' },
];

export default function LicFormScreen() {
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

  useEffect(() => {
    if (!isEdit || !existingId) return;
    getLicCustomerById(existingId).then((item) => {
      if (!item) return;
      reset({
        policyNo: item.policyNo,
        assuredName: item.assuredName,
        phoneNumber: item.phoneNumber ?? '',
        areaName: item.areaName ?? '',
        dateOfCommencement: item.dateOfCommencement ?? '',
        planTerm: item.planTerm ?? '',
        mode: item.mode ?? '',
        fupDate: item.fupDate ?? '',
        flag: item.flag ?? '',
        installmentPremium: item.installmentPremium != null ? String(item.installmentPremium) : '',
        installmentsDue: item.installmentsDue != null ? String(item.installmentsDue) : '',
        notes: item.notes ?? '',
      });
      setLoaded(true);
    });
  }, [isEdit, existingId, reset]);

  const performSave = async (values: FormValues) => {
    await saveLicCustomer({
      id: existingId,
      policyNo: values.policyNo,
      assuredName: values.assuredName,
      phoneNumber: values.phoneNumber || undefined,
      areaName: values.areaName || undefined,
      dateOfCommencement: values.dateOfCommencement || undefined,
      planTerm: values.planTerm || undefined,
      mode: values.mode || undefined,
      fupDate: values.fupDate || undefined,
      flag: values.flag || undefined,
      installmentPremium: values.installmentPremium ? Number(values.installmentPremium) : undefined,
      installmentsDue: values.installmentsDue ? Number(values.installmentsDue) : undefined,
      notes: values.notes || undefined,
    });
    router.back();
  };

  const onSubmit = async (values: FormValues) => {
    const duplicate = await findDuplicatePolicyNo(values.policyNo, existingId);
    if (duplicate) {
      Alert.alert(t('duplicatePolicyTitle'), t('duplicatePolicyMessage', { name: duplicate.assuredName }), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('editExisting'),
          onPress: () => router.replace({ pathname: '/lic/form', params: { id: String(duplicate.id) } }),
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
      <Stack.Screen options={{ title: isEdit ? t('editLicTitle') : t('addLicTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('policyNo')}</Text>
          <Controller
            control={control}
            name="policyNo"
            rules={{ required: t('errorEnterPolicyNo') }}
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('policyNoPlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="number-pad"
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.policyNo ? <Text style={[styles.error, { color: c.danger }]}>{errors.policyNo.message}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('name')}</Text>
          <Controller
            control={control}
            name="assuredName"
            rules={{ required: t('errorEnterAssuredName') }}
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('assuredNamePlaceholder')}
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.assuredName ? (
            <Text style={[styles.error, { color: c.danger }]}>{errors.assuredName.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('phoneOptionalLabel')}</Text>
          <Controller
            control={control}
            name="phoneNumber"
            rules={{ validate: (value) => !value || isValidMobile(value) || t('errorValidMobile') }}
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
          {errors.phoneNumber ? (
            <Text style={[styles.error, { color: c.danger }]}>{errors.phoneNumber.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('area')}</Text>
          <Controller
            control={control}
            name="areaName"
            render={({ field }) => <AreaPicker value={field.value} onChange={field.onChange} />}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('dateOfCommencement')}</Text>
          <Controller
            control={control}
            name="dateOfCommencement"
            render={({ field }) => (
              <View style={styles.sinceRow}>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('dateOfCommencementPlaceholder')}
                  placeholderTextColor={c.textMuted}
                  style={[styles.input, styles.sinceInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
                <Pressable
                  onPress={() =>
                    field.onChange(
                      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    )
                  }
                  style={[styles.todayBtn, { borderColor: c.border }]}
                >
                  <Text style={{ color: c.accent, fontSize: 13, fontWeight: '500' }}>{t('today')}</Text>
                </Pressable>
              </View>
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('planTerm')}</Text>
          <Controller
            control={control}
            name="planTerm"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('planTermPlaceholder')}
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('mode')}</Text>
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <View style={styles.modeWrap}>
                {MODE_OPTIONS.map((opt) => {
                  const selected = field.value === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => field.onChange(selected ? '' : opt.value)}
                      style={[
                        styles.modePill,
                        { backgroundColor: selected ? c.accentBg : c.surface, borderColor: selected ? c.accent : c.border },
                      ]}
                    >
                      <Text style={{ color: selected ? c.accent : c.textSecondary, fontSize: 13, fontWeight: '500' }}>
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('fupLabel')}</Text>
          <Controller
            control={control}
            name="fupDate"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('fupDatePlaceholder')}
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.rowItem]}>
            <Text style={[styles.label, { color: c.textSecondary }]}>{t('installmentPremium')}</Text>
            <Controller
              control={control}
              name="installmentPremium"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('installmentPremiumPlaceholder')}
                  placeholderTextColor={c.textMuted}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
              )}
            />
          </View>

          <View style={[styles.field, styles.rowItem]}>
            <Text style={[styles.label, { color: c.textSecondary }]}>{t('installmentsDue')}</Text>
            <Controller
              control={control}
              name="installmentsDue"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={t('installmentsDuePlaceholder')}
                  placeholderTextColor={c.textMuted}
                  keyboardType="number-pad"
                  style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('flag')}</Text>
          <Controller
            control={control}
            name="flag"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('flagPlaceholder')}
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
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
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('saveLic')}</Text>
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
  sinceRow: { flexDirection: 'row', gap: 8 },
  sinceInput: { flex: 1 },
  todayBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  modeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  saveBtn: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
