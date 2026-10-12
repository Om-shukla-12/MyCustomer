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
import { Control, Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { AreaPicker } from '@/components/AreaPicker';
import { RelationshipTagPicker } from '@/components/RelationshipTagPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { USE_DEVICE_CONTACTS_KEY, findDeviceContactByPhone } from '@/lib/contactsSync';
import { isValidMobile, normalizePhone } from '@/lib/phone';
import {
  findCustomerByName,
  findDuplicateByPhone,
  getCustomerById,
  getRelationshipTags,
  saveCustomer,
} from '@/lib/queries';
import { getSetting } from '@/lib/settings';

type FormValues = {
  name: string;
  primaryMobile: string;
  areaName: string;
  notes: string;
  address: string;
  customerSince: string;
  additionalContacts: { phoneNumber: string; tagName: string; customLabel: string }[];
};

const EMPTY_VALUES: FormValues = {
  name: '',
  primaryMobile: '',
  areaName: '',
  notes: '',
  address: '',
  customerSince: '',
  additionalContacts: [],
};

function AdditionalContactRow({
  control,
  index,
  tags,
  onRemove,
}: {
  control: Control<FormValues>;
  index: number;
  tags: { id: number; name: string }[];
  onRemove: () => void;
}) {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const tagName = useWatch({ control, name: `additionalContacts.${index}.tagName` });

  return (
    <View style={[styles.extraCard, { borderColor: c.border }]}>
      <View style={styles.extraHeader}>
        <Controller
          control={control}
          name={`additionalContacts.${index}.phoneNumber`}
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
        name={`additionalContacts.${index}.tagName`}
        render={({ field }) => <RelationshipTagPicker tags={tags} value={field.value} onChange={field.onChange} />}
      />

      {tagName === 'Other' ? (
        <Controller
          control={control}
          name={`additionalContacts.${index}.customLabel`}
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder={t('labelPlaceholder')}
              placeholderTextColor={c.textMuted}
              style={[styles.input, { marginTop: 8, color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />
          )}
        />
      ) : null}
    </View>
  );
}

export default function CustomerFormScreen() {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existingId = id ? Number(id) : undefined;
  const isEdit = existingId !== undefined;

  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [deviceContactsEnabled, setDeviceContactsEnabled] = useState(false);
  const [deviceMatch, setDeviceMatch] = useState<{ id: string; name: string } | null>(null);
  const [dismissedForNumber, setDismissedForNumber] = useState<string | null>(null);
  const [linkedDeviceContactId, setLinkedDeviceContactId] = useState<string | undefined>(undefined);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  const { fields, append, remove } = useFieldArray({ control, name: 'additionalContacts' });
  const watchedMobile = useWatch({ control, name: 'primaryMobile' });

  useEffect(() => {
    getRelationshipTags().then(setTags);
    getSetting(USE_DEVICE_CONTACTS_KEY).then((v) => setDeviceContactsEnabled(v === 'true'));
  }, []);

  useEffect(() => {
    setLinkedDeviceContactId(undefined);
  }, [watchedMobile]);

  useEffect(() => {
    if (isEdit || !deviceContactsEnabled || !isValidMobile(watchedMobile)) {
      setDeviceMatch(null);
      return;
    }
    const normalized = normalizePhone(watchedMobile);
    if (normalized === dismissedForNumber) return;

    let cancelled = false;
    findDeviceContactByPhone(watchedMobile).then((match) => {
      if (!cancelled) setDeviceMatch(match);
    });
    return () => {
      cancelled = true;
    };
  }, [watchedMobile, isEdit, deviceContactsEnabled, dismissedForNumber]);

  const handleAcceptDeviceMatch = () => {
    if (!deviceMatch) return;
    setValue('name', deviceMatch.name);
    setLinkedDeviceContactId(deviceMatch.id);
    setDeviceMatch(null);
  };

  const handleDismissDeviceMatch = () => {
    setDismissedForNumber(normalizePhone(watchedMobile));
    setDeviceMatch(null);
  };

  useEffect(() => {
    if (!isEdit || !existingId) return;
    getCustomerById(existingId).then((customer) => {
      if (!customer) return;
      reset({
        name: customer.name,
        primaryMobile: customer.primaryMobile,
        areaName: customer.areaName,
        notes: customer.notes ?? '',
        address: customer.address ?? '',
        customerSince: customer.customerSince ?? '',
        additionalContacts: customer.additionalContacts.map((contact) => ({
          phoneNumber: contact.phoneNumber,
          tagName: contact.tagName,
          customLabel: contact.customLabel ?? '',
        })),
      });
      if (customer.address || customer.notes || customer.customerSince) setMoreOpen(true);
      setLoaded(true);
    });
  }, [isEdit, existingId, reset]);

  const performSave = async (values: FormValues) => {
    await saveCustomer({
      id: existingId,
      name: values.name,
      primaryMobile: values.primaryMobile,
      areaName: values.areaName,
      notes: values.notes,
      address: values.address,
      customerSince: values.customerSince || undefined,
      additionalContacts: values.additionalContacts,
      linkedDeviceContactId,
    });
    router.back();
  };

  const proceedToPhoneCheck = async (values: FormValues) => {
    const duplicate = await findDuplicateByPhone(values.primaryMobile, existingId);
    if (duplicate) {
      Alert.alert(t('duplicateTitle'), t('duplicateMessage', { name: duplicate.name }), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('editExisting'),
          onPress: () => router.replace({ pathname: '/customer/form', params: { id: String(duplicate.id) } }),
        },
        { text: t('saveAnyway'), onPress: () => performSave(values) },
      ]);
      return;
    }
    await performSave(values);
  };

  const onSubmit = async (values: FormValues) => {
    const nameMatch = await findCustomerByName(values.name, existingId);
    if (nameMatch) {
      const sameArea = nameMatch.areaName.trim().toLowerCase() === values.areaName.trim().toLowerCase();
      if (sameArea) {
        Alert.alert(
          t('possibleSameCustomerTitle'),
          t('possibleSameCustomerMessage', { name: values.name, area: nameMatch.areaName }),
          [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('viewExisting'),
              onPress: () => router.replace({ pathname: '/customer/[id]', params: { id: String(nameMatch.id) } }),
            },
            { text: t('saveAnyway'), onPress: () => proceedToPhoneCheck(values) },
          ]
        );
        return;
      }

      const disambiguatedName = `${values.name.trim()} - ${values.areaName.trim()}`;
      Alert.alert(
        t('nameDisambiguatedTitle'),
        t('nameDisambiguatedMessage', { name: values.name, area: nameMatch.areaName, newName: disambiguatedName }),
        [{ text: t('ok'), onPress: () => proceedToPhoneCheck({ ...values, name: disambiguatedName }) }]
      );
      return;
    }
    await proceedToPhoneCheck(values);
  };

  if (!loaded) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: isEdit ? t('editCustomerTitle') : t('addCustomerTitle') }} />
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
                placeholder={t('fullNamePlaceholder')}
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
            )}
          />
          {errors.name ? <Text style={[styles.error, { color: c.danger }]}>{errors.name.message}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('primaryMobile')}</Text>
          <Controller
            control={control}
            name="primaryMobile"
            rules={{ validate: (value) => isValidMobile(value) || t('errorValidMobile') }}
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
          {errors.primaryMobile ? (
            <Text style={[styles.error, { color: c.danger }]}>{errors.primaryMobile.message}</Text>
          ) : null}
          {deviceMatch ? (
            <View style={[styles.deviceMatchCard, { backgroundColor: c.accentBg, borderColor: c.accent }]}>
              <Ionicons name="person-circle-outline" size={20} color={c.accent} />
              <View style={styles.deviceMatchText}>
                <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>
                  {t('existingContactFoundTitle')}
                </Text>
                <Text style={{ color: c.accent, fontSize: 13 }} numberOfLines={1}>
                  {deviceMatch.name}
                </Text>
              </View>
              <Pressable
                onPress={handleAcceptDeviceMatch}
                style={[styles.useDetailsBtn, { borderColor: c.accent }]}
              >
                <Text style={{ color: c.accent, fontSize: 12, fontWeight: '600' }}>{t('useDetails')}</Text>
              </Pressable>
              <Pressable
                onPress={handleDismissDeviceMatch}
                accessibilityRole="button"
                accessibilityLabel={t('cancel')}
                style={styles.dismissBtn}
              >
                <Ionicons name="close" size={16} color={c.accent} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('area')}</Text>
          <Controller
            control={control}
            name="areaName"
            rules={{ required: t('errorSelectArea') }}
            render={({ field }) => <AreaPicker value={field.value} onChange={field.onChange} />}
          />
          {errors.areaName ? <Text style={[styles.error, { color: c.danger }]}>{errors.areaName.message}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{t('additionalNumbers')}</Text>
          {fields.map((item, index) => (
            <AdditionalContactRow
              key={item.id}
              control={control}
              index={index}
              tags={tags}
              onRemove={() => remove(index)}
            />
          ))}
          <Pressable
            onPress={() => append({ phoneNumber: '', tagName: tags[0]?.name ?? 'Other', customLabel: '' })}
            style={[styles.addRowBtn, { borderColor: c.border }]}
          >
            <Ionicons name="add" size={16} color={c.accent} />
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '500' }}>{t('addAnotherNumber')}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setMoreOpen((v) => !v)} style={styles.moreToggle}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>{t('moreDetails')}</Text>
          <Ionicons name={moreOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
        </Pressable>

        {moreOpen ? (
          <View style={styles.moreFields}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('customerSinceField')}</Text>
              <Controller
                control={control}
                name="customerSince"
                render={({ field }) => (
                  <View style={styles.sinceRow}>
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder={t('customerSincePlaceholder')}
                      placeholderTextColor={c.textMuted}
                      style={[
                        styles.input,
                        styles.sinceInput,
                        { color: c.text, borderColor: c.border, backgroundColor: c.surface },
                      ]}
                    />
                    <Pressable
                      onPress={() =>
                        field.onChange(
                          new Date().toLocaleDateString(lang === 'gu' ? 'gu-IN' : 'en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
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
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('addressLandmark')}</Text>
              <Controller
                control={control}
                name="address"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={t('addressPlaceholder')}
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
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
        >
          <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('saveCustomer')}</Text>
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
  deviceMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  deviceMatchText: { flex: 1 },
  useDetailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  dismissBtn: { padding: 4 },
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
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  moreFields: { gap: 16 },
  sinceRow: { flexDirection: 'row', gap: 8 },
  sinceInput: { flex: 1 },
  todayBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
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
