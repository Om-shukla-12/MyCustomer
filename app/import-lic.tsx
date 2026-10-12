import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { OptionRow } from '@/components/OptionRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { createSafetySnapshot } from '@/lib/backup';
import { parseLicCustomersCsv, type ParsedLicRow } from '@/lib/licCsv';
import { findDuplicatePolicyNo, importLicCustomerRow, type LicImportStrategy } from '@/lib/licQueries';

type RowStatus = 'new' | 'duplicate' | 'error';
type ClassifiedRow = ParsedLicRow & { status: RowStatus };

type Step = 'pick' | 'preview' | 'importing' | 'done';

export default function ImportLicScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<Step>('pick');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ClassifiedRow[]>([]);
  const [strategy, setStrategy] = useState<LicImportStrategy>('skip');
  const [showErrors, setShowErrors] = useState(false);
  const [result, setResult] = useState({ created: 0, updated: 0, skipped: 0 });

  const newCount = rows.filter((r) => r.status === 'new').length;
  const duplicateCount = rows.filter((r) => r.status === 'duplicate').length;
  const errorRows = rows.filter((r) => r.status === 'error');

  const handlePickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    setBusy(true);
    try {
      const text = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: 'utf8' });
      const parsed = parseLicCustomersCsv(text);
      if (parsed.length === 0) {
        Alert.alert(t('importTitle'), t('noValidRowsFound'));
        return;
      }

      const classified: ClassifiedRow[] = [];
      for (const row of parsed) {
        if (row.error) {
          classified.push({ ...row, status: 'error' });
          continue;
        }
        const duplicate = await findDuplicatePolicyNo(row.policyNo);
        classified.push({ ...row, status: duplicate ? 'duplicate' : 'new' });
      }
      setRows(classified);
      setStep('preview');
    } catch {
      Alert.alert(t('importTitle'), t('readFileFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setStep('importing');
    await createSafetySnapshot();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (row.status === 'error') continue;
      const outcome = await importLicCustomerRow(
        {
          policyNo: row.policyNo,
          assuredName: row.assuredName,
          phoneNumber: row.phoneNumber,
          areaName: row.areaName,
          areaNameGu: row.areaNameGu,
          dateOfCommencement: row.dateOfCommencement,
          planTerm: row.planTerm,
          mode: row.mode,
          fupDate: row.fupDate,
          flag: row.flag,
          installmentPremium: row.installmentPremium,
          installmentsDue: row.installmentsDue,
          notes: row.notes,
        },
        strategy
      );
      if (outcome === 'created') created++;
      else if (outcome === 'updated') updated++;
      else skipped++;
    }

    setResult({ created, updated, skipped });
    setStep('done');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: t('importTitle') }} />

      {step === 'pick' ? (
        <View style={styles.centerContent}>
          {busy ? (
            <>
              <ActivityIndicator color={c.accent} />
              <Text style={[styles.muted, { color: c.textMuted }]}>{t('parsingFile')}</Text>
            </>
          ) : (
            <Pressable
              onPress={handlePickFile}
              style={[styles.primaryBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
            >
              <Ionicons name="document-outline" size={18} color={c.accent} />
              <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('chooseCsvFile')}</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {step === 'preview' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <SummaryRow color={c.text} text={t('importSummaryNew', { count: String(newCount) })} />
            {duplicateCount > 0 ? (
              <SummaryRow color={c.text} text={t('importSummaryDuplicate', { count: String(duplicateCount) })} />
            ) : null}
            {errorRows.length > 0 ? (
              <SummaryRow color={c.danger} text={t('importSummaryError', { count: String(errorRows.length) })} />
            ) : null}
          </View>

          {duplicateCount > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('duplicateHandling')}</Text>
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <OptionRow label={t('strategySkip')} selected={strategy === 'skip'} onPress={() => setStrategy('skip')} />
                <OptionRow
                  label={t('strategyUpdate')}
                  selected={strategy === 'update'}
                  onPress={() => setStrategy('update')}
                />
                <OptionRow
                  label={t('strategyCreateNew')}
                  selected={strategy === 'createNew'}
                  onPress={() => setStrategy('createNew')}
                  showBottomBorder={false}
                />
              </View>
            </>
          ) : null}

          {errorRows.length > 0 ? (
            <>
              <Pressable onPress={() => setShowErrors((v) => !v)} style={styles.errorsToggle}>
                <Text style={{ color: c.accent, fontSize: 14, fontWeight: '500' }}>
                  {showErrors ? t('hideErrors') : t('viewErrors')}
                </Text>
                <Ionicons name={showErrors ? 'chevron-up' : 'chevron-down'} size={16} color={c.accent} />
              </Pressable>
              {showErrors ? (
                <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  {errorRows.map((row, i) => (
                    <View
                      key={i}
                      style={[
                        styles.errorRow,
                        { borderBottomColor: c.border, borderBottomWidth: i === errorRows.length - 1 ? 0 : StyleSheet.hairlineWidth },
                      ]}
                    >
                      <Text style={{ color: c.text, fontSize: 13, fontWeight: '500' }}>
                        {t('rowLabel', { row: String(row.rowNumber) })}
                        {row.assuredName ? `: ${row.assuredName}` : ''}
                      </Text>
                      <Text style={{ color: c.danger, fontSize: 12, marginTop: 2 }}>
                        {row.error ? t(row.error) : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          <Pressable
            onPress={handleConfirm}
            style={[styles.primaryBtn, styles.fullWidthBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
          >
            <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('confirmImport')}</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {step === 'importing' ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={c.accent} />
          <Text style={[styles.muted, { color: c.textMuted }]}>{t('importing')}</Text>
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={styles.centerContent}>
          <Ionicons name="checkmark-circle-outline" size={40} color={c.accent} />
          <Text style={[styles.doneTitle, { color: c.text }]}>{t('importDoneTitle')}</Text>
          <Text style={[styles.muted, { color: c.textSecondary }]}>
            {t('importDoneSummary', {
              created: String(result.created),
              updated: String(result.updated),
              skipped: String(result.skipped),
            })}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryBtn, { backgroundColor: c.accentBg, borderColor: c.accent, marginTop: 12 }]}
          >
            <Text style={{ color: c.accent, fontSize: 16, fontWeight: '600' }}>{t('done')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={{ color, fontSize: 15 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 14, textAlign: 'center' },
  doneTitle: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  sectionLabel: { fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  summaryRow: { paddingVertical: 12, paddingHorizontal: 14 },
  errorsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  errorRow: { paddingVertical: 10, paddingHorizontal: 14 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  fullWidthBtn: { marginTop: 8 },
});
