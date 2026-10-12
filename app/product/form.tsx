import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { isValidMobile } from '@/lib/phone';
import { getCustomerById } from '@/lib/queries';
import {
  findDuplicateProductSerial,
  getAvailableStockItems,
  getProductById,
  saveProduct,
  todayIsoDate,
  type StockListItem,
} from '@/lib/salesQueries';

type FormValues = {
  productName: string;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  salePrice: string;
  nextFollowUpDate: string;
  productNote: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  guarantorName: string;
  guarantorMobile: string;
  guarantorAddress: string;
  guarantorVillage: string;
};

export default function ProductFormScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const { id, customerId } = useLocalSearchParams<{ id?: string; customerId?: string }>();
  const existingId = id ? Number(id) : undefined;
  const linkedCustomerId = customerId ? Number(customerId) : undefined;
  const [loaded, setLoaded] = useState(!existingId && !linkedCustomerId);
  const [stockItems, setStockItems] = useState<StockListItem[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const { control, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      productName: '',
      modelNumber: '',
      serialNumber: '',
      purchaseDate: todayIsoDate(),
      salePrice: '',
      nextFollowUpDate: '',
      productNote: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      guarantorName: '',
      guarantorMobile: '',
      guarantorAddress: '',
      guarantorVillage: '',
    },
  });

  useEffect(() => {
    getAvailableStockItems().then(setStockItems);
  }, []);

  useEffect(() => {
    if (!existingId) return;
    getProductById(existingId).then((item) => {
      if (!item) return;
      reset({
        productName: item.productName,
        modelNumber: item.modelNumber,
        serialNumber: item.serialNumber,
        purchaseDate: item.purchaseDate,
        salePrice: String(item.salePrice),
        nextFollowUpDate: item.nextFollowUpDate ?? '',
        productNote: item.productNote ?? '',
        customerName: item.customerName,
        customerPhone: item.primaryMobile,
        customerAddress: item.customerAddress ?? '',
        guarantorName: item.guarantorName ?? '',
        guarantorMobile: item.guarantorMobile ?? '',
        guarantorAddress: item.guarantorAddress ?? '',
        guarantorVillage: item.guarantorVillage ?? '',
      });
      setSelectedStockId(item.stockItemId);
      setLoaded(true);
    });
  }, [existingId, reset]);

  useEffect(() => {
    if (existingId || !linkedCustomerId) return;
    getCustomerById(linkedCustomerId).then((customer) => {
      if (customer) {
        reset({
          productName: '',
          modelNumber: '',
          serialNumber: '',
          purchaseDate: todayIsoDate(),
          salePrice: '',
          nextFollowUpDate: '',
          productNote: '',
          customerName: customer.name,
          customerPhone: customer.primaryMobile,
          customerAddress: customer.address ?? '',
          guarantorName: '',
          guarantorMobile: '',
          guarantorAddress: '',
          guarantorVillage: '',
        });
      }
      setLoaded(true);
    });
  }, [existingId, linkedCustomerId, reset]);

  const pickStock = (item: StockListItem) => {
    setSelectedStockId(item.id);
    setValue('productName', item.itemName);
    setValue('modelNumber', item.modelNumber);
    setValue('serialNumber', item.serialNumber);
  };

  const onSubmit = async (values: FormValues) => {
    const duplicate = await findDuplicateProductSerial(values.serialNumber, existingId);
    if (duplicate) {
      Alert.alert('Duplicate serial number', `${duplicate.productName} already uses this serial number.`);
      return;
    }
    await saveProduct({
      id: existingId,
      productName: values.productName,
      modelNumber: values.modelNumber,
      serialNumber: values.serialNumber,
      purchaseDate: values.purchaseDate,
      salePrice: Number(values.salePrice),
      nextFollowUpDate: values.nextFollowUpDate || undefined,
      productNote: values.productNote || undefined,
      customerId: linkedCustomerId,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerAddress: values.customerAddress || undefined,
      guarantorName: values.guarantorName || undefined,
      guarantorMobile: values.guarantorMobile || undefined,
      guarantorAddress: values.guarantorAddress || undefined,
      guarantorVillage: values.guarantorVillage || undefined,
      stockItemId: selectedStockId,
    });
    router.back();
  };

  if (!loaded) return <View style={[styles.container, { backgroundColor: c.background }]} />;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existingId ? 'Edit product sale' : 'Add product sale' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {stockItems.length > 0 && !existingId ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Link stock item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stockPicker}>
              {stockItems.map((item) => {
                const selected = selectedStockId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => pickStock(item)}
                    style={[styles.stockPill, { backgroundColor: selected ? c.accentBg : c.surface, borderColor: selected ? c.accent : c.border }]}
                  >
                    <Text style={{ color: selected ? c.accent : c.text, fontSize: 13, fontWeight: '600' }}>{item.itemName}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>{item.serialNumber}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <Field label="Product name" name="productName" control={control} error={errors.productName?.message} required />
        <Field label="Model number" name="modelNumber" control={control} error={errors.modelNumber?.message} required />
        <Field label="Serial number" name="serialNumber" control={control} error={errors.serialNumber?.message} required />
        <Field label="Purchase date" name="purchaseDate" control={control} error={errors.purchaseDate?.message} required />
        <Field label="Sale price" name="salePrice" control={control} error={errors.salePrice?.message} required keyboardType="decimal-pad" />
        <Field label="Next follow-up date" name="nextFollowUpDate" control={control} error={errors.nextFollowUpDate?.message} />
        <Field label="Product note" name="productNote" control={control} error={errors.productNote?.message} multiline />
        <Field label="Customer name" name="customerName" control={control} error={errors.customerName?.message} required />
        <Field
          label="Customer phone"
          name="customerPhone"
          control={control}
          error={errors.customerPhone?.message}
          required
          keyboardType="phone-pad"
          validate={(value) => isValidMobile(value) || 'Enter a valid mobile number'}
        />
        <Field label="Customer address" name="customerAddress" control={control} error={errors.customerAddress?.message} multiline />
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Jamin giri / guarantor</Text>
        <Field label="Guarantor name" name="guarantorName" control={control} error={errors.guarantorName?.message} />
        <Field
          label="Guarantor mobile"
          name="guarantorMobile"
          control={control}
          error={errors.guarantorMobile?.message}
          keyboardType="phone-pad"
          validate={(value) => !value || isValidMobile(value) || 'Enter a valid mobile number'}
        />
        <Field label="Guarantor address" name="guarantorAddress" control={control} error={errors.guarantorAddress?.message} multiline />
        <Field label="Guarantor village" name="guarantorVillage" control={control} error={errors.guarantorVillage?.message} />
        <Pressable onPress={handleSubmit(onSubmit)} style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}>
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>Save product sale</Text>
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
  keyboardType = 'default',
  multiline,
  validate,
}: {
  label: string;
  name: keyof FormValues;
  control: any;
  error?: string;
  required?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'phone-pad';
  multiline?: boolean;
  validate?: (value: string) => true | string;
}) {
  const c = Colors[useColorScheme()];
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: required ? `Enter ${label.toLowerCase()}` : false, validate }}
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            keyboardType={keyboardType}
            multiline={multiline}
            placeholder={label}
            placeholderTextColor={c.textMuted}
            style={[
              styles.input,
              multiline ? styles.notesInput : null,
              { color: c.text, borderColor: c.border, backgroundColor: c.surface },
            ]}
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
  stockPicker: { gap: 8 },
  stockPill: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, gap: 3 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', marginTop: 4 },
  saveBtn: { height: 48, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
