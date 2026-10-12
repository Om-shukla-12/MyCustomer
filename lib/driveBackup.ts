import { db, sqliteDb } from '@/db/client';
import {
  additionalContacts,
  areas,
  businessCategories,
  businessContactNumbers,
  businessContacts,
  customers,
  licCustomers,
  licLedgerEntries,
  productFollowUps,
  productPayments,
  products,
  relationshipTags,
  settings,
  stockItems,
  todayVisits,
} from '@/db/schema';

const BACKUP_PREFIX = 'mycustomers-backup-';
const BACKUP_SCHEMA_VERSION = 1;

type BackupPayload = {
  schemaVersion: number;
  createdAt: string;
  app: 'MyCustomers';
  tables: Record<string, unknown[]>;
};

type DriveFile = {
  id: string;
  name: string;
  createdTime?: string;
};

type DriveListResponse = {
  files?: DriveFile[];
};

type DriveUploadResponse = DriveFile;

function backupFileName(date = new Date()): string {
  return `${BACKUP_PREFIX}${date.toISOString().replace(/[:.]/g, '-')}.json`;
}

async function selectAll(table: any): Promise<unknown[]> {
  return db.select().from(table);
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const allSettings = (await selectAll(settings)).filter((row: any) => !String(row.key).startsWith('googleDrive'));

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    app: 'MyCustomers',
    tables: {
      settings: allSettings,
      areas: await selectAll(areas),
      relationshipTags: await selectAll(relationshipTags),
      customers: await selectAll(customers),
      additionalContacts: await selectAll(additionalContacts),
      businessCategories: await selectAll(businessCategories),
      businessContacts: await selectAll(businessContacts),
      businessContactNumbers: await selectAll(businessContactNumbers),
      todayVisits: await selectAll(todayVisits),
      licCustomers: await selectAll(licCustomers),
      licLedgerEntries: await selectAll(licLedgerEntries),
      stockItems: await selectAll(stockItems),
      products: await selectAll(products),
      productPayments: await selectAll(productPayments),
      productFollowUps: await selectAll(productFollowUps),
    },
  };
}

async function requireOk(response: Response, fallback: string): Promise<Response> {
  if (response.ok) return response;
  const body = await response.text().catch(() => '');
  throw new Error(body || fallback);
}

export async function uploadBackupToDrive(accessToken: string): Promise<DriveUploadResponse> {
  const payload = await createBackupPayload();
  const boundary = `mycustomers-${Date.now()}`;
  const metadata = {
    name: backupFileName(),
    mimeType: 'application/json',
    parents: ['appDataFolder'],
  };

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(payload),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  await requireOk(response, 'Google Drive backup failed.');
  return response.json();
}

export async function downloadLatestBackupFromDrive(accessToken: string): Promise<BackupPayload> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    pageSize: '1',
    orderBy: 'createdTime desc',
    fields: 'files(id,name,createdTime)',
    q: `name contains '${BACKUP_PREFIX}'`,
  });
  const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await requireOk(listResponse, 'Could not find Google Drive backups.');
  const list = (await listResponse.json()) as DriveListResponse;
  const file = list.files?.[0];
  if (!file) {
    throw new Error('No Google Drive backup found for this app.');
  }

  const mediaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await requireOk(mediaResponse, 'Could not download the latest Google Drive backup.');
  const payload = (await mediaResponse.json()) as BackupPayload;
  if (payload.app !== 'MyCustomers' || payload.schemaVersion !== BACKUP_SCHEMA_VERSION || !payload.tables) {
    throw new Error('The latest backup is not compatible with this app version.');
  }
  return payload;
}

async function insertRows(table: any, rows: unknown[] | undefined): Promise<void> {
  if (!rows?.length) return;
  await db.insert(table).values(rows as any[]);
}

export async function restoreBackupPayload(payload: BackupPayload): Promise<void> {
  const preservedGoogleSettings = (await selectAll(settings)).filter((row: any) => String(row.key).startsWith('googleDrive'));
  const tableRows = payload.tables;

  sqliteDb.execSync('PRAGMA foreign_keys = OFF');
  sqliteDb.execSync('BEGIN');
  try {
    for (const tableName of [
      'product_follow_ups',
      'product_payments',
      'products',
      'stock_items',
      'lic_ledger_entries',
      'lic_customers',
      'today_visits',
      'business_contact_numbers',
      'business_contacts',
      'business_categories',
      'additional_contacts',
      'customers',
      'relationship_tags',
      'areas',
      'settings',
    ]) {
      sqliteDb.execSync(`DELETE FROM ${tableName}`);
    }

    await insertRows(settings, [...((tableRows.settings as unknown[] | undefined) ?? []), ...preservedGoogleSettings]);
    await insertRows(areas, tableRows.areas);
    await insertRows(relationshipTags, tableRows.relationshipTags);
    await insertRows(customers, tableRows.customers);
    await insertRows(additionalContacts, tableRows.additionalContacts);
    await insertRows(businessCategories, tableRows.businessCategories);
    await insertRows(businessContacts, tableRows.businessContacts);
    await insertRows(businessContactNumbers, tableRows.businessContactNumbers);
    await insertRows(todayVisits, tableRows.todayVisits);
    await insertRows(licCustomers, tableRows.licCustomers);
    await insertRows(licLedgerEntries, tableRows.licLedgerEntries);
    await insertRows(stockItems, tableRows.stockItems);
    await insertRows(products, tableRows.products);
    await insertRows(productPayments, tableRows.productPayments);
    await insertRows(productFollowUps, tableRows.productFollowUps);

    sqliteDb.execSync('COMMIT');
  } catch (error) {
    sqliteDb.execSync('ROLLBACK');
    throw error;
  } finally {
    sqliteDb.execSync('PRAGMA foreign_keys = ON');
  }
}
