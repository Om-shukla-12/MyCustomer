import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { findDuplicateStockSerial, getStockItemById, saveStockItem, todayIsoDate } from '@/lib/salesQueries';

type FormValues = {
  itemName: string;
  serialNumber: string;
  modelNumber: string;
  dealerPrice: string;
  billingDate: string;
};

export default function StockFormScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existingId = id ? Number(id) : undefined;
  const [loaded, setLoaded] = useState(!existingId);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { itemName: '', serialNumber: '', modelNumber: '', dealerPrice: '', billingDate: todayIsoDate() },
  });

  useEffect(() => {
    if (!existingId) return;
    getStockItemById(existingId).then((item) => {
      if (!item) return;
      reset({
        itemName: item.itemName,
        serialNumber: item.serialNumber,
        modelNumber: item.modelNumber,
        dealerPrice: String(item.dealerPrice),
        billingDate: item.billingDate,
      });
      setLoaded(true);
    });
  }, [existingId, reset]);

  const onSubmit = async (values: FormValues) => {
    const duplicate = await findDuplicateStockSerial(values.serialNumber, existingId);
    if (duplicate) {
      Alert.alert('Duplicate serial number', `${duplicate.itemName} already uses this serial number.`);
      return;
    }
    await saveStockItem({
      id: existingId,
      itemName: values.itemName,
      serialNumber: values.serialNumber,
      modelNumber: values.modelNumber,
      dealerPrice: Number(values.dealerPrice),
      billingDate: values.billingDate,
    });
    router.back();
  };

  if (!loaded) return <View style={[styles.container, { backgroundColor: c.background }]} />;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existingId ? 'Edit stock item' : 'Add stock item' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Item name" name="itemName" control={control} error={errors.itemName?.message} required keyboardType="default" />
        <Field label="Serial number" name="serialNumber" control={control} error={errors.serialNumber?.message} required keyboardType="default" />
        <Field label="Model number" name="modelNumber" control={control} error={errors.modelNumber?.message} required keyboardType="default" />
        <Field label="Dealer price" name="dealerPrice" control={control} error={errors.dealerPrice?.message} required keyboardType="decimal-pad" />
        <Field label="Billing date" name="billingDate" control={control} error={errors.billingDate?.message} required keyboardType="default" />
        <Pressable onPress={handleSubmit(onSubmit)} style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}>
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>Save stock item</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  name,
  control,
  error,
  required,
  keyboardType,
}: {
  label: string;
  name: keyof FormValues;
  control: any;
  error?: string;
  required?: boolean;
  keyboardType: 'default' | 'decimal-pad';
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
            placeholder={label}
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
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
  error: { fontSize: 12 },
  saveBtn: { height: 48, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
