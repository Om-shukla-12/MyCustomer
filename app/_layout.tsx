import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { AppHeaderTitle } from '@/components/AppHeaderTitle';
import { useColorScheme } from '@/components/useColorScheme';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { BusinessNameProvider } from '@/contexts/BusinessNameContext';
import { db, initializeDatabase } from '@/db/client';
import { seedRelationshipTags } from '@/db/seed';
import migrations from '@/drizzle/migrations';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(() => setDatabaseReady(true))
      .catch((err) => setDatabaseError(err as Error));
  }, []);

  if (databaseError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#a32d2d', textAlign: 'center' }}>
          Something went wrong opening the database: {databaseError.message}
        </Text>
      </View>
    );
  }

  if (!databaseReady) {
    return null;
  }

  return <MigratedRootLayout />;
}

function MigratedRootLayout() {
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!migrated) return;
    seedRelationshipTags()
      .then(() => setSeeded(true))
      .catch((err) => setSeedError(err as Error));
  }, [migrated]);

  useEffect(() => {
    if (migrated && seeded) {
      SplashScreen.hideAsync();
    }
  }, [migrated, seeded]);

  if (migrationError || seedError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#a32d2d', textAlign: 'center' }}>
          Something went wrong setting up the database: {(migrationError ?? seedError)?.message}
        </Text>
      </View>
    );
  }

  if (!migrated || !seeded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <LanguageProvider>
        <BusinessNameProvider>
          <RootLayoutNav />
        </BusinessNameProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerTitle: (props) => <AppHeaderTitle {...props} /> }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Customer' }} />
        <Stack.Screen
          name="customer/form"
          options={{ presentation: 'modal', title: 'Add customer' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="import" options={{ title: 'Import from CSV' }} />
        <Stack.Screen name="import-business" options={{ title: 'Import from CSV' }} />
        <Stack.Screen name="import-lic" options={{ title: 'Import from CSV' }} />
        <Stack.Screen name="manage-areas" options={{ title: 'Manage areas' }} />
        <Stack.Screen name="manage-categories" options={{ title: 'Manage categories' }} />
        <Stack.Screen name="find-duplicates" options={{ title: 'Find duplicates' }} />
        <Stack.Screen name="business/[id]" options={{ title: 'Business contact' }} />
        <Stack.Screen name="business/form" options={{ presentation: 'modal', title: 'Add business contact' }} />
        <Stack.Screen name="lic/[id]" options={{ title: 'LIC policy' }} />
        <Stack.Screen name="lic/form" options={{ presentation: 'modal', title: 'Add LIC policy' }} />
        <Stack.Screen name="lic/payment" options={{ presentation: 'modal', title: 'Record payment' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product sale' }} />
        <Stack.Screen name="product/form" options={{ presentation: 'modal', title: 'Add product sale' }} />
        <Stack.Screen name="product/payment" options={{ presentation: 'modal', title: 'Record payment' }} />
        <Stack.Screen name="stock/[id]" options={{ title: 'Stock item' }} />
        <Stack.Screen name="stock/form" options={{ presentation: 'modal', title: 'Add stock item' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
