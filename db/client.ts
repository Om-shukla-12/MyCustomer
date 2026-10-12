import { Platform } from 'react-native';
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

type AppDb = ReturnType<typeof createDrizzleClient>;

let sqliteDbValue: SQLiteDatabase | null = null;
let dbValue: AppDb | null = null;
let initPromise: Promise<AppDb> | null = null;

function createDrizzleClient(client: SQLiteDatabase) {
  return drizzle(client, { schema });
}

function openSync(): AppDb {
  if (!dbValue) {
    sqliteDbValue = openDatabaseSync('customers.db');
    dbValue = createDrizzleClient(sqliteDbValue);
  }
  return dbValue;
}

export async function initializeDatabase(): Promise<AppDb> {
  if (dbValue) return dbValue;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (Platform.OS === 'web') {
      await openDatabaseAsync('customers.db');
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return openSync();
  })();

  return initPromise;
}

function getDb(): AppDb {
  if (!dbValue) {
    throw new Error('Database has not been initialized yet.');
  }
  return dbValue;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const target = getDb() as AppDb & Record<PropertyKey, unknown>;
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

export const sqliteDb = new Proxy({} as SQLiteDatabase, {
  get(_target, prop, receiver) {
    if (!sqliteDbValue) {
      throw new Error('SQLite database has not been initialized yet.');
    }
    const target = sqliteDbValue as SQLiteDatabase & Record<PropertyKey, unknown>;
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
