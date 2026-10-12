import { useEffect, useState } from 'react';
import {
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
import { Controller, useForm, useWatch } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { addLicLedgerEntry, getLicBalance, getLicCustomerById } from '@/lib/licQueries';
import type { TranslationKey } from '@/lib/translations';

type FormValues = {
  date: string;
  requiredAmount: string;
  amountPaid: string;
  paymentMethod: string;
  notes: string;
};

const METHOD_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Cash', labelKey: 'methodCash' },
  { value: 'UPI', labelKey: 'methodUpi' },
  { value: 'Bank Transfer', labelKey: 'methodBankTransfer' },
  { value: 'Cheque', labelKey: 'methodCheque' },
  { value: 'Other', labelKey: 'methodOther' },
];

function todayDisplay(): string {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LicPaymentFormScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const licCustomerId = Number(id);

  const [loaded, setLoaded] = useState(false);
  const [assuredName, setAssuredName] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { date: todayDisplay(), requiredAmount: '', amountPaid: '', paymentMethod: '', notes: '' },
  });

  useEffect(() => {
    if (Number.isNaN(licCustomerId)) return;
    Promise.all([getLicCustomerById(licCustomerId), getLicBalance(licCustomerId)]).then(([item, balance]) => {
      if (item) {
        setAssuredName(item.assuredName);
        reset({
          date: todayDisplay(),
          requiredAmount: item.installmentPremium != null ? String(item.installmentPremium) : '',
          amountPaid: '',
          paymentMethod: '',
          notes: '',
        });
      }
      setCurrentBalance(balance);
      setLoaded(true);
    });
  }, [licCustomerId, reset]);

  const requiredAmountWatch = useWatch({ control, name: 'requiredAmount' });
  const amountPaidWatch = useWatch({ control, name: 'amountPaid' });

  const requiredNum = Number(requiredAmountWatch);
  const paidNum = Number(amountPaidWatch);
  const hasPreview = requiredAmountWatch !== '' && amountPaidWatch !== '' && !Number.isNaN(requiredNum) && !Number.isNaN(paidNum);
  const diff = requiredNum - paidNum;

  const performSave = async (values: FormValues) => {
    await addLicLedgerEntry({
      licCustomerId,
      date: values.date,
      requiredAmount: Number(values.requiredAmount),
      amountPaid: Number(values.amountPaid),
      paymentMethod: values.paymentMethod || undefined,
      notes: values.notes || undefined,
    });
    router.back();
  };

  if (!loaded) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: t('recordPayment') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.contextLine, { color: c.textMuted }]}>
          {assuredName} · {t('balanceLabel')}: ₹{currentBalance}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('dateLabel')}</Text>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <View style={styles.sinceRow}>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  style={[styles.input, styles.sinceInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
                <Pressable
                  onPress={() => field.onChange(todayDisplay())}
                  style={[styles.todayBtn, { borderColor: c.border }]}
                >
                  <Text style={{ color: c.accent, fontSize: 13, fontWeight: '500' }}>{t('today')}</Text>
                </Pressable>
              </View>
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('requiredAmount')}</Text>
          <Controller
            control={control}
            name="requiredAmount"
            rules={{ required: t('errorEnterRequiredAmount') }}
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('requiredAmountPlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.requiredAmount ? (
            <Text style={[styles.error, { color: c.danger }]}>{errors.requiredAmount.message}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('amountPaid')}</Text>
          <Controller
            control={control}
            name="amountPaid"
            rules={{ required: t('errorEnterAmountPaid') }}
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('amountPaidPlaceholder')}
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.amountPaid ? <Text style={[styles.error, { color: c.danger }]}>{errors.amountPaid.message}</Text> : null}
        </View>

        {hasPreview ? (
          <Text
            style={[
              styles.preview,
              { color: diff > 0 ? c.danger : diff < 0 ? c.whatsapp : c.textSecondary },
            ]}
          >
            {diff > 0
              ? t('shortfallPreview', { amount: String(diff) })
              : diff < 0
                ? t('creditPreview', { amount: String(-diff) })
                : t('settledPreview')}
          </Text>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('paymentMethod')}</Text>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <View style={styles.modeWrap}>
                {METHOD_OPTIONS.map((opt) => {
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
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('notes')}</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={t('referenceNotesPlaceholder')}
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
          onPress={handleSubmit(performSave)}
          style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
        >
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('savePayment')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  contextLine: { fontSize: 13, marginBottom: -4 },
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
  preview: { fontSize: 14, fontWeight: '600', marginTop: -8 },
  modeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  saveBtn: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
