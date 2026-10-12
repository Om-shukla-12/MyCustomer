import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { addProductPayment, todayIsoDate } from '@/lib/salesQueries';

type FormValues = {
  amountReceived: string;
  dateReceived: string;
  notes: string;
};

export default function ProductPaymentScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { amountReceived: '', dateReceived: todayIsoDate(), notes: '' },
  });

  const onSubmit = async (values: FormValues) => {
    await addProductPayment({
      productId,
      amountReceived: Number(values.amountReceived),
      dateReceived: values.dateReceived,
      notes: values.notes || undefined,
    });
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Record payment' }} />
      <Field label="Amount received" name="amountReceived" control={control} error={errors.amountReceived?.message} required keyboardType="decimal-pad" />
      <Field label="Date received" name="dateReceived" control={control} error={errors.dateReceived?.message} required />
      <Field label="Note" name="notes" control={control} error={errors.notes?.message} multiline />
      <Pressable onPress={handleSubmit(onSubmit)} style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}>
        <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>Save payment</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  name,
  control,
  error,
  required,
  keyboardType = 'default',
  multiline,
}: {
  label: string;
  name: keyof FormValues;
  control: any;
  error?: string;
  required?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  multiline?: boolean;
}) {
  const c = Colors[useColorScheme()];
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: required ? `Enter ${label.toLowerCase()}` : false }}
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            keyboardType={keyboardType}
            multiline={multiline}
            placeholder={label}
            placeholderTextColor={c.textMuted}
            style={[styles.input, multiline ? styles.notesInput : null, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
        )}
      />
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 12 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  notesInput: { height: 78, textAlignVertical: 'top', paddingTop: 10 },
  error: { fontSize: 12 },
  saveBtn: { height: 48, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
