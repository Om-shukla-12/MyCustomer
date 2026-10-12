import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { OptionRow } from '@/components/OptionRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useBusinessName } from '@/contexts/BusinessNameContext';
import { businessContactsToCsv } from '@/lib/businessCsv';
import {
  clearAllBusinessContacts,
  getActiveBusinessContactCount,
  getAllBusinessContactsForExport,
  getLastBusinessUpdateTimestamp,
} from '@/lib/businessQueries';
import { USE_DEVICE_CONTACTS_KEY, ensureContactsPermission } from '@/lib/contactsSync';
import { customersToCsv } from '@/lib/csv';
import { formatDateTimeDisplay } from '@/lib/date';
import { downloadLatestBackupFromDrive, restoreBackupPayload, uploadBackupToDrive } from '@/lib/driveBackup';
import { clearAllLicCustomers, getActiveLicCustomerCount } from '@/lib/licQueries';
import { clearAllCustomers, getActiveCustomerCount, getAllCustomersForExport, getLastCustomerUpdateTimestamp } from '@/lib/queries';
import { getSetting, setSetting } from '@/lib/settings';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
};

const DRIVE_SCOPES = ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/drive.appdata'];

function getGoogleDriveClientId(): string {
  const config = (Constants.expoConfig?.extra?.googleDriveOAuth ?? {}) as Record<string, string | undefined>;
  if (Platform.OS === 'web') return config.webClientId || config.clientId || '';
  if (Platform.OS === 'android') return config.androidClientId || config.clientId || '';
  if (Platform.OS === 'ios') return config.iosClientId || config.clientId || '';
  return config.clientId || '';
}

export default function SettingsScreen() {
  const c = Colors[useColorScheme()];
  const { lang, setLang, t } = useLanguage();
  const { scheme, setScheme } = useThemeMode();
  const { businessName, setBusinessName } = useBusinessName();
  const router = useRouter();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [businessNameInput, setBusinessNameInput] = useState(businessName);
  const [nameJustSaved, setNameJustSaved] = useState(false);
  const businessNameDirty = businessNameInput.trim() !== businessName;
  const [lastDataUpdate, setLastDataUpdate] = useState<string | null>(null);
  const [lastCustomerExport, setLastCustomerExport] = useState<string | null>(null);
  const [lastBusinessExport, setLastBusinessExport] = useState<string | null>(null);
  const [useDeviceContacts, setUseDeviceContacts] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [lastDriveBackup, setLastDriveBackup] = useState<string | null>(null);
  const googleClientId = getGoogleDriveClientId();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mycustomers', path: 'google-drive-auth' });
  const [authRequest, authResponse, promptGoogleAuth] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId || 'missing-google-client-id',
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: DRIVE_SCOPES,
      usePKCE: true,
      extraParams: { access_type: 'offline' },
      prompt: AuthSession.Prompt.Consent,
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    setBusinessNameInput(businessName);
  }, [businessName]);

  useEffect(() => {
    getSetting(USE_DEVICE_CONTACTS_KEY).then((v) => setUseDeviceContacts(v === 'true'));
  }, []);

  const refetchDriveState = useCallback(() => {
    getSetting('googleDriveEmail').then((value) => setDriveEmail(value || null));
    getSetting('lastGoogleDriveBackupAt').then((value) => setLastDriveBackup(value || null));
  }, []);

  useEffect(() => {
    refetchDriveState();
  }, [refetchDriveState]);

  useEffect(() => {
    if (authResponse?.type !== 'success' || !authResponse.params.code || !googleClientId) return;

    const completeGoogleLink = async () => {
      setDriveBusy(true);
      try {
        const token = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleClientId,
            code: authResponse.params.code,
            redirectUri,
            scopes: DRIVE_SCOPES,
            extraParams: { code_verifier: authRequest?.codeVerifier ?? '' },
          },
          GOOGLE_DISCOVERY
        );
        const userInfo = await AuthSession.fetchUserInfoAsync({ accessToken: token.accessToken }, GOOGLE_DISCOVERY);
        await saveGoogleDriveToken(token, typeof userInfo.email === 'string' ? userInfo.email : null);
        refetchDriveState();
        Alert.alert('Google Drive connected', 'Backups will be stored privately in your Google Drive app data.');
      } catch (error) {
        Alert.alert('Google Drive', error instanceof Error ? error.message : 'Could not connect Google Drive.');
      } finally {
        setDriveBusy(false);
      }
    };

    completeGoogleLink();
  }, [authRequest?.codeVerifier, authResponse, googleClientId, redirectUri, refetchDriveState]);

  const handleToggleDeviceContacts = async (value: boolean) => {
    if (value) {
      const granted = await ensureContactsPermission();
      if (!granted) {
        Alert.alert(t('useDeviceContactsTitle'), t('contactsPermissionDenied'));
        return;
      }
    }
    setUseDeviceContacts(value);
    setSetting(USE_DEVICE_CONTACTS_KEY, value ? 'true' : 'false');
  };

  const refetchTimestamps = useCallback(() => {
    Promise.all([getLastCustomerUpdateTimestamp(), getLastBusinessUpdateTimestamp()]).then(([customerTs, businessTs]) => {
      const latest = [customerTs, businessTs].filter((v): v is string => !!v).sort().at(-1) ?? null;
      setLastDataUpdate(latest);
    });
    getSetting('lastCustomerExportAt').then(setLastCustomerExport);
    getSetting('lastBusinessExportAt').then(setLastBusinessExport);
  }, []);

  useFocusEffect(refetchTimestamps);

  const formatTimestamp = (iso: string | null, emptyKey: 'neverUpdated' | 'neverExported') =>
    iso ? formatDateTimeDisplay(new Date(iso), lang === 'gu' ? 'gu-IN' : 'en-IN') : t(emptyKey);

  const saveGoogleDriveToken = async (token: AuthSession.TokenResponse, email: string | null) => {
    await setSetting('googleDriveAccessToken', token.accessToken);
    await setSetting('googleDriveRefreshToken', token.refreshToken ?? (await getSetting('googleDriveRefreshToken')) ?? '');
    await setSetting(
      'googleDriveAccessTokenExpiresAt',
      token.expiresIn ? String(Date.now() + token.expiresIn * 1000) : ''
    );
    await setSetting('googleDriveEmail', email ?? '');
    await setSetting('googleDriveConnectedAt', new Date().toISOString());
  };

  const requireGoogleDriveConfig = () => {
    if (googleClientId) return true;
    Alert.alert(
      'Google Drive setup needed',
      `Add your Google OAuth client ID in app.json under extra.googleDriveOAuth. Redirect URI for this build:\n\n${redirectUri}`
    );
    return false;
  };

  const getGoogleDriveAccessToken = async (): Promise<string> => {
    if (!requireGoogleDriveConfig()) throw new Error('Google Drive is not configured.');

    const accessToken = await getSetting('googleDriveAccessToken');
    const expiresAt = Number(await getSetting('googleDriveAccessTokenExpiresAt'));
    if (accessToken && (!expiresAt || expiresAt > Date.now() + 60_000)) {
      return accessToken;
    }

    const refreshToken = await getSetting('googleDriveRefreshToken');
    if (refreshToken) {
      const refreshed = await AuthSession.refreshAsync(
        { clientId: googleClientId, refreshToken, scopes: DRIVE_SCOPES },
        GOOGLE_DISCOVERY
      );
      await saveGoogleDriveToken(refreshed, await getSetting('googleDriveEmail'));
      return refreshed.accessToken;
    }

    throw new Error('Connect Google Drive first.');
  };

  const handleConnectGoogleDrive = async () => {
    if (!requireGoogleDriveConfig()) return;
    if (!authRequest) {
      Alert.alert('Google Drive', 'Google sign-in is still preparing. Try again in a moment.');
      return;
    }
    await promptGoogleAuth();
  };

  const handleGoogleDriveBackup = async () => {
    setDriveBusy(true);
    try {
      const token = await getGoogleDriveAccessToken();
      const file = await uploadBackupToDrive(token);
      const now = new Date().toISOString();
      await setSetting('lastGoogleDriveBackupAt', now);
      setLastDriveBackup(now);
      Alert.alert('Backup complete', `Saved ${file.name} to Google Drive.`);
    } catch (error) {
      Alert.alert('Google Drive backup failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleRestoreGoogleDriveBackup = async () => {
    Alert.alert(
      'Restore latest backup?',
      'This will replace local app data on this device with the latest Google Drive backup. Your Google Drive connection stays linked.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setDriveBusy(true);
            try {
              const token = await getGoogleDriveAccessToken();
              const payload = await downloadLatestBackupFromDrive(token);
              await restoreBackupPayload(payload);
              refetchTimestamps();
              Alert.alert('Restore complete', `Restored backup from ${formatDateTimeDisplay(new Date(payload.createdAt), lang === 'gu' ? 'gu-IN' : 'en-IN')}.`);
            } catch (error) {
              Alert.alert('Google Drive restore failed', error instanceof Error ? error.message : 'Try again.');
            } finally {
              setDriveBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleDisconnectGoogleDrive = async () => {
    await setSetting('googleDriveAccessToken', '');
    await setSetting('googleDriveRefreshToken', '');
    await setSetting('googleDriveAccessTokenExpiresAt', '');
    await setSetting('googleDriveEmail', '');
    refetchDriveState();
  };

  const handleSaveBusinessName = () => {
    setBusinessName(businessNameInput.trim());
    setNameJustSaved(true);
    setTimeout(() => setNameJustSaved(false), 1500);
  };

  const handleExport = async () => {
    const allCustomers = await getAllCustomersForExport();
    if (allCustomers.length === 0) {
      Alert.alert(t('exportToCsv'), t('noCustomersToExport'));
      return;
    }
    try {
      const csv = customersToCsv(allCustomers);
      const dateStr = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `backup_${dateStr}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      const now = new Date().toISOString();
      await setSetting('lastCustomerExportAt', now);
      setLastCustomerExport(now);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('exportToCsv') });
    } catch {
      Alert.alert(t('exportToCsv'), t('exportFailed'));
    }
  };

  const handleExportBusiness = async () => {
    const allContacts = await getAllBusinessContactsForExport();
    if (allContacts.length === 0) {
      Alert.alert(t('exportToCsv'), t('noBusinessContactsToExport'));
      return;
    }
    try {
      const csv = businessContactsToCsv(allContacts);
      const dateStr = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `business_backup_${dateStr}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      const now = new Date().toISOString();
      await setSetting('lastBusinessExportAt', now);
      setLastBusinessExport(now);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('exportToCsv') });
    } catch {
      Alert.alert(t('exportToCsv'), t('exportFailed'));
    }
  };

  const handleClearCustomers = async () => {
    const count = await getActiveCustomerCount();
    if (count === 0) {
      Alert.alert(t('clearCustomers'), t('noDataToClear'));
      return;
    }
    Alert.alert(t('clearCustomersConfirmTitle'), t('clearCustomersConfirmMessage', { count: String(count) }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const cleared = await clearAllCustomers();
          refetchTimestamps();
          Alert.alert(t('clearCustomers'), t('customersCleared', { count: String(cleared) }));
        },
      },
    ]);
  };

  const handleClearBusinessContacts = async () => {
    const count = await getActiveBusinessContactCount();
    if (count === 0) {
      Alert.alert(t('clearBusinessContacts'), t('noDataToClear'));
      return;
    }
    Alert.alert(t('clearBusinessConfirmTitle'), t('clearBusinessConfirmMessage', { count: String(count) }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const cleared = await clearAllBusinessContacts();
          refetchTimestamps();
          Alert.alert(t('clearBusinessContacts'), t('businessContactsCleared', { count: String(cleared) }));
        },
      },
    ]);
  };

  const handleClearLicPolicies = async () => {
    const count = await getActiveLicCustomerCount();
    if (count === 0) {
      Alert.alert(t('clearLicPolicies'), t('noDataToClear'));
      return;
    }
    Alert.alert(t('clearLicConfirmTitle'), t('clearLicConfirmMessage', { count: String(count) }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const cleared = await clearAllLicCustomers();
          refetchTimestamps();
          Alert.alert(t('clearLicPolicies'), t('licPoliciesCleared', { count: String(cleared) }));
        },
      },
    ]);
  };

  const handleCheckForUpdates = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(t('checkForUpdates'), t('updatesUnavailableDev'));
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert(t('checkForUpdates'), t('upToDate'));
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(t('updateReadyTitle'), t('updateReadyMessage'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('restartNow'), onPress: () => Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert(t('checkForUpdates'), t('updateCheckFailed'));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('settingsTitle') }} />

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('businessNameSection')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.businessNameRow}>
          <TextInput
            value={businessNameInput}
            onChangeText={setBusinessNameInput}
            placeholder={t('businessNameSettingsPlaceholder')}
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
          />
          {businessNameDirty ? (
            <Pressable
              onPress={handleSaveBusinessName}
              style={[styles.saveBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
            >
              <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>{t('save')}</Text>
            </Pressable>
          ) : nameJustSaved ? (
            <View style={styles.savedIndicator}>
              <Ionicons name="checkmark-circle" size={20} color={c.accent} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.businessNameHint, { color: c.textMuted }]}>{t('businessNameHint')}</Text>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('useDeviceContactsTitle')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.actionRow, { borderBottomWidth: 0, justifyContent: 'space-between' }]}>
          <View style={[styles.actionRowGroup, { flexShrink: 1 }]}>
            <Ionicons name="person-add-outline" size={18} color={c.text} />
            <Text style={{ color: c.text, fontSize: 15, flexShrink: 1 }}>{t('useDeviceContactsTitle')}</Text>
          </View>
          <Switch
            value={useDeviceContacts}
            onValueChange={handleToggleDeviceContacts}
            trackColor={{ true: c.accent }}
          />
        </View>
        <Text style={[styles.businessNameHint, { color: c.textMuted, paddingTop: 0 }]}>
          {t('useDeviceContactsHint')}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('language')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <OptionRow label={t('english')} selected={lang === 'en'} onPress={() => setLang('en')} />
        <OptionRow label={t('gujarati')} selected={lang === 'gu'} onPress={() => setLang('gu')} showBottomBorder={false} />
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('villagesSection')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable
          onPress={() => router.push('/manage-areas')}
          style={[styles.actionRow, { borderBottomWidth: 0, justifyContent: 'space-between' }]}
        >
          <View style={styles.actionRowGroup}>
            <Ionicons name="location-outline" size={18} color={c.text} />
            <Text style={{ color: c.text, fontSize: 15 }}>{t('manageAreas')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('tabBusiness')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable
          onPress={() => router.push('/manage-categories')}
          style={[styles.actionRow, { borderBottomWidth: 0, justifyContent: 'space-between' }]}
        >
          <View style={styles.actionRowGroup}>
            <Ionicons name="pricetag-outline" size={18} color={c.text} />
            <Text style={{ color: c.text, fontSize: 15 }}>{t('manageCategories')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('theme')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <OptionRow label={t('light')} selected={scheme === 'light'} onPress={() => setScheme('light')} />
        <OptionRow label={t('dark')} selected={scheme === 'dark'} onPress={() => setScheme('dark')} showBottomBorder={false} />
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('backupRestoreCustomers')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable onPress={handleExport} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="download-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>{t('exportToCsv')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/import')} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="cloud-upload-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>{t('importFromCsv')}</Text>
        </Pressable>
        <Text style={[styles.timestampRow, { color: c.textMuted }]}>
          {t('lastExported')}: {formatTimestamp(lastCustomerExport, 'neverExported')}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('backupRestoreBusiness')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable onPress={handleExportBusiness} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="download-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>{t('exportToCsv')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/import-business')} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="cloud-upload-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>{t('importFromCsv')}</Text>
        </Pressable>
        <Text style={[styles.timestampRow, { color: c.textMuted }]}>
          {t('lastExported')}: {formatTimestamp(lastBusinessExport, 'neverExported')}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Google Drive backup</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable onPress={handleConnectGoogleDrive} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="logo-google" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>
            {driveEmail ? `Connected: ${driveEmail}` : 'Connect Google Drive'}
          </Text>
        </Pressable>
        <Pressable onPress={handleGoogleDriveBackup} disabled={driveBusy} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          {driveBusy ? <ActivityIndicator size="small" color={c.accent} /> : <Ionicons name="cloud-upload-outline" size={18} color={c.text} />}
          <Text style={{ color: c.text, fontSize: 15 }}>Backup now to Google Drive</Text>
        </Pressable>
        <Pressable onPress={handleRestoreGoogleDriveBackup} disabled={driveBusy} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="cloud-download-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>Restore latest backup</Text>
        </Pressable>
        {driveEmail ? (
          <Pressable onPress={handleDisconnectGoogleDrive} style={[styles.actionRow, { borderBottomColor: c.border }]}>
            <Ionicons name="unlink-outline" size={18} color={c.danger} />
            <Text style={{ color: c.danger, fontSize: 15 }}>Disconnect Google Drive</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.timestampRow, { color: c.textMuted }]}>
          Last Drive backup: {lastDriveBackup ? formatDateTimeDisplay(new Date(lastDriveBackup), lang === 'gu' ? 'gu-IN' : 'en-IN') : t('neverExported')}
        </Text>
        {!googleClientId ? (
          <Text style={[styles.businessNameHint, { color: c.warning }]}>
            Google OAuth client ID is not configured yet. Add it in app.json to enable sign-in.
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('dataToolsSection')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Pressable
          onPress={() => router.push('/find-duplicates')}
          style={[styles.actionRow, { borderBottomWidth: 0, justifyContent: 'space-between' }]}
        >
          <View style={styles.actionRowGroup}>
            <Ionicons name="copy-outline" size={18} color={c.text} />
            <Text style={{ color: c.text, fontSize: 15 }}>{t('findDuplicates')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('dangerZoneSection')}</Text>
      <View style={[styles.card, { borderColor: c.dangerBg, backgroundColor: c.surface }]}>
        <Pressable onPress={handleClearCustomers} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="trash-outline" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontSize: 15 }}>{t('clearCustomers')}</Text>
        </Pressable>
        <Pressable onPress={handleClearBusinessContacts} style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="trash-outline" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontSize: 15 }}>{t('clearBusinessContacts')}</Text>
        </Pressable>
        <Pressable onPress={handleClearLicPolicies} style={[styles.actionRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="trash-outline" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontSize: 15 }}>{t('clearLicPolicies')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('appVersion')}</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>{appVersion}</Text>
        </View>
        <View style={[styles.actionRow, { borderBottomColor: c.border }]}>
          <Ionicons name="time-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 15 }}>
            {t('lastDataUpdated')}: {formatTimestamp(lastDataUpdate, 'neverUpdated')}
          </Text>
        </View>
        <Pressable onPress={handleCheckForUpdates} style={[styles.actionRow, { borderBottomWidth: 0 }]}>
          {checkingUpdate ? (
            <ActivityIndicator size="small" color={c.accent} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={c.text} />
          )}
          <Text style={{ color: c.text, fontSize: 15 }}>
            {checkingUpdate ? t('checkingForUpdates') : t('checkForUpdates')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, marginBottom: 8, marginTop: 8, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRowGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  businessNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  businessNameHint: { fontSize: 12, lineHeight: 16, paddingHorizontal: 14, paddingBottom: 14 },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedIndicator: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  timestampRow: { fontSize: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
