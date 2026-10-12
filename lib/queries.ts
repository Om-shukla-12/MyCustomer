import { and, eq, gte, inArray, like, lt, ne, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { additionalContacts, areas, customers, relationshipTags } from '@/db/schema';
import { USE_DEVICE_CONTACTS_KEY, syncCustomerToContacts } from '@/lib/contactsSync';
import { normalizePhone } from '@/lib/phone';
import { getSetting } from '@/lib/settings';

export type AreaWithCount = { id: number; name: string; nameGu: string | null; count: number };

export type CustomerListItem = {
  id: number;
  name: string;
  primaryMobile: string;
  areaName: string;
  customerSince: string | null;
};

export type CustomerDetail = {
  id: number;
  name: string;
  primaryMobile: string;
  areaId: number;
  areaName: string;
  areaNameGu: string | null;
  notes: string | null;
  address: string | null;
  customerSince: string | null;
  additionalContacts: {
    id: number;
    phoneNumber: string;
    tagName: string;
    customLabel: string | null;
  }[];
};

export type CustomerFormInput = {
  id?: number;
  name: string;
  primaryMobile: string;
  areaName: string;
  areaNameGu?: string;
  notes?: string;
  address?: string;
  customerSince?: string;
  additionalContacts: { phoneNumber: string; tagName: string; customLabel?: string }[];
  linkedDeviceContactId?: string;
};

const listColumns = {
  id: customers.id,
  name: customers.name,
  primaryMobile: customers.primaryMobile,
  areaName: areas.name,
  customerSince: customers.customerSince,
};

export async function getLastCustomerUpdateTimestamp(): Promise<string | null> {
  const rows = await db.select({ max: sql<string | null>`max(${customers.updatedAt})` }).from(customers);
  return rows[0]?.max ?? null;
}

export async function getAreasWithCounts(): Promise<AreaWithCount[]> {
  return db
    .select({
      id: areas.id,
      name: areas.name,
      nameGu: areas.nameGu,
      count: sql<number>`count(${customers.id})`,
    })
    .from(areas)
    .leftJoin(customers, and(eq(customers.areaId, areas.id), eq(customers.isDeleted, false)))
    .groupBy(areas.id)
    .orderBy(areas.name);
}

export async function getCustomersByArea(areaName: string): Promise<CustomerListItem[]> {
  return db
    .select(listColumns)
    .from(customers)
    .innerJoin(areas, eq(customers.areaId, areas.id))
    .where(and(eq(areas.name, areaName), eq(customers.isDeleted, false)))
    .orderBy(customers.name);
}

export type DateRange = { startISO: string; endISO: string };

export async function searchCustomers(query: string, dateAddedFilter?: DateRange): Promise<CustomerListItem[]> {
  const q = query.trim();

  const conditions = [eq(customers.isDeleted, false)];
  if (dateAddedFilter) {
    conditions.push(gte(customers.createdAt, dateAddedFilter.startISO));
    conditions.push(lt(customers.createdAt, dateAddedFilter.endISO));
  }
  if (q) {
    const pattern = `%${q}%`;
    const digitsPattern = `%${normalizePhone(q)}%`;
    conditions.push(
      or(like(customers.name, pattern), like(customers.primaryMobile, digitsPattern), like(areas.name, pattern))!
    );
  }

  return db
    .select(listColumns)
    .from(customers)
    .innerJoin(areas, eq(customers.areaId, areas.id))
    .where(and(...conditions))
    .orderBy(customers.name);
}

type CustomerRow = {
  id: number;
  name: string;
  primaryMobile: string;
  areaId: number;
  notes: string | null;
  address: string | null;
  customerSince: string | null;
  area: { name: string; nameGu: string | null };
  additionalContacts: {
    id: number;
    phoneNumber: string;
    customLabel: string | null;
    relationshipTag: { name: string };
  }[];
};

function toCustomerDetail(row: CustomerRow): CustomerDetail {
  return {
    id: row.id,
    name: row.name,
    primaryMobile: row.primaryMobile,
    areaId: row.areaId,
    areaName: row.area.name,
    areaNameGu: row.area.nameGu,
    notes: row.notes,
    address: row.address,
    customerSince: row.customerSince,
    additionalContacts: row.additionalContacts.map((c) => ({
      id: c.id,
      phoneNumber: c.phoneNumber,
      tagName: c.relationshipTag.name,
      customLabel: c.customLabel,
    })),
  };
}

export async function getCustomerById(id: number): Promise<CustomerDetail | null> {
  const row = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      area: true,
      additionalContacts: { with: { relationshipTag: true } },
    },
  });
  return row ? toCustomerDetail(row) : null;
}

export async function getCustomersByIds(ids: number[]): Promise<CustomerDetail[]> {
  if (ids.length === 0) return [];
  const rows = await db.query.customers.findMany({
    where: inArray(customers.id, ids),
    with: {
      area: true,
      additionalContacts: { with: { relationshipTag: true } },
    },
  });
  return rows.map(toCustomerDetail);
}

export async function getRelationshipTags(): Promise<{ id: number; name: string }[]> {
  return db.select({ id: relationshipTags.id, name: relationshipTags.name }).from(relationshipTags);
}

export async function getAreaNames(): Promise<{ name: string; nameGu: string | null }[]> {
  return db.select({ name: areas.name, nameGu: areas.nameGu }).from(areas).orderBy(areas.name);
}

export async function updateAreaNameGu(id: number, nameGu: string | null): Promise<void> {
  await db.update(areas).set({ nameGu }).where(eq(areas.id, id));
}

export async function getAreaByName(name: string): Promise<{ id: number; name: string; nameGu: string | null } | null> {
  const rows = await db.select().from(areas).where(eq(areas.name, name)).limit(1);
  return rows[0] ?? null;
}

export async function findDuplicateByPhone(
  rawPhone: string,
  excludeCustomerId?: number
): Promise<{ id: number; name: string } | null> {
  const normalized = normalizePhone(rawPhone);
  if (normalized.length < 10) return null;

  const rows = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(
      and(
        eq(customers.primaryMobile, normalized),
        eq(customers.isDeleted, false),
        excludeCustomerId ? ne(customers.id, excludeCustomerId) : undefined
      )
    );
  return rows[0] ?? null;
}

export async function findCustomerByName(
  rawName: string,
  excludeCustomerId?: number
): Promise<{ id: number; name: string; areaName: string } | null> {
  const key = rawName.trim().toLowerCase();
  if (!key) return null;

  const rows = await db
    .select({ id: customers.id, name: customers.name, areaName: areas.name })
    .from(customers)
    .innerJoin(areas, eq(customers.areaId, areas.id))
    .where(
      and(eq(customers.isDeleted, false), excludeCustomerId ? ne(customers.id, excludeCustomerId) : undefined)
    );
  return rows.find((r) => r.name.trim().toLowerCase() === key) ?? null;
}

function normalizeAreaKey(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function findOrCreateArea(rawName: string, rawNameGu?: string): Promise<number> {
  const name = rawName.trim().replace(/\s+/g, ' ');
  const key = normalizeAreaKey(rawName);
  const nameGu = rawNameGu?.trim() || null;
  const all = await db.select().from(areas);
  const match = all.find((a) => normalizeAreaKey(a.name) === key);
  if (match) {
    if (nameGu && !match.nameGu) {
      await db.update(areas).set({ nameGu }).where(eq(areas.id, match.id));
    }
    return match.id;
  }

  const [inserted] = await db.insert(areas).values({ name, nameGu }).returning({ id: areas.id });
  return inserted.id;
}

export async function createArea(rawName: string, rawNameGu?: string): Promise<number> {
  const name = rawName.trim().replace(/\s+/g, ' ');
  const key = normalizeAreaKey(rawName);
  const all = await db.select().from(areas);
  if (all.some((a) => normalizeAreaKey(a.name) === key)) {
    throw new Error('duplicate');
  }

  const nameGu = rawNameGu?.trim() || null;
  const [inserted] = await db.insert(areas).values({ name, nameGu }).returning({ id: areas.id });
  return inserted.id;
}

export async function saveCustomer(input: CustomerFormInput): Promise<number> {
  const areaId = await findOrCreateArea(input.areaName, input.areaNameGu);
  const normalizedPrimary = normalizePhone(input.primaryMobile);
  const now = new Date().toISOString();

  let customerId: number;

  if (input.id) {
    await db
      .update(customers)
      .set({
        name: input.name.trim(),
        primaryMobile: normalizedPrimary,
        areaId,
        notes: input.notes?.trim() || null,
        address: input.address?.trim() || null,
        customerSince: input.customerSince || null,
        updatedAt: now,
      })
      .where(eq(customers.id, input.id));
    customerId = input.id;
    await db.delete(additionalContacts).where(eq(additionalContacts.customerId, customerId));
  } else {
    const [inserted] = await db
      .insert(customers)
      .values({
        name: input.name.trim(),
        primaryMobile: normalizedPrimary,
        areaId,
        notes: input.notes?.trim() || null,
        address: input.address?.trim() || null,
        customerSince: input.customerSince || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: customers.id });
    customerId = inserted.id;
  }

  const validExtras = input.additionalContacts.filter((c) => c.phoneNumber.trim());
  if (validExtras.length > 0) {
    const tags = await getRelationshipTags();
    const tagByName = new Map(tags.map((t) => [t.name, t.id]));
    const otherTagId = tagByName.get('Other');

    await db.insert(additionalContacts).values(
      validExtras.map((c) => ({
        customerId,
        phoneNumber: normalizePhone(c.phoneNumber),
        relationshipTagId: tagByName.get(c.tagName) ?? otherTagId!,
        customLabel: c.tagName === 'Other' ? c.customLabel?.trim() || null : null,
      }))
    );
  }

  const useDeviceContacts = (await getSetting(USE_DEVICE_CONTACTS_KEY)) === 'true';
  if (useDeviceContacts) {
    let startingContactId = input.linkedDeviceContactId ?? null;
    if (!startingContactId && input.id) {
      const existing = await db
        .select({ nativeContactId: customers.nativeContactId })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);
      startingContactId = existing[0]?.nativeContactId ?? null;
    }
    const resultId = await syncCustomerToContacts({
      nativeContactId: startingContactId,
      name: input.name.trim(),
      primaryMobile: normalizedPrimary,
      additionalNumbers: validExtras.map((c) => ({ phoneNumber: normalizePhone(c.phoneNumber), label: c.tagName })),
    });
    if (resultId) {
      await db.update(customers).set({ nativeContactId: resultId }).where(eq(customers.id, customerId));
    }
  }

  return customerId;
}

export async function softDeleteCustomer(id: number): Promise<void> {
  await db
    .update(customers)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id));
}

export async function restoreCustomer(id: number): Promise<void> {
  await db
    .update(customers)
    .set({ isDeleted: false, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id));
}

export async function getAllCustomersForExport(): Promise<CustomerDetail[]> {
  const rows = await db.query.customers.findMany({
    where: eq(customers.isDeleted, false),
    with: {
      area: true,
      additionalContacts: { with: { relationshipTag: true } },
    },
    orderBy: (fields, { asc }) => [asc(fields.name)],
  });
  return rows.map(toCustomerDetail);
}

export async function getActiveCustomerCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.isDeleted, false));
  return rows[0]?.count ?? 0;
}

export async function clearAllCustomers(): Promise<number> {
  const rows = await db
    .update(customers)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(customers.isDeleted, false))
    .returning({ id: customers.id });
  return rows.length;
}

export async function bulkSoftDeleteCustomers(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(customers)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(inArray(customers.id, ids));
}

export async function bulkRestoreCustomers(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(customers)
    .set({ isDeleted: false, updatedAt: new Date().toISOString() })
    .where(inArray(customers.id, ids));
}

export type ImportStrategy = 'skip' | 'update' | 'createNew';
export type ImportRowInput = {
  name: string;
  primaryMobile: string;
  areaName: string;
  areaNameGu?: string;
  customerSince: string;
  address: string;
  notes: string;
  additionalContacts: { tagName: string; phoneNumber: string; customLabel?: string }[];
};

export async function importCustomerRow(
  row: ImportRowInput,
  strategy: ImportStrategy
): Promise<'created' | 'updated' | 'skipped'> {
  const existing = await findDuplicateByPhone(row.primaryMobile);

  if (existing && strategy === 'skip') return 'skipped';

  await saveCustomer({
    id: existing && strategy === 'update' ? existing.id : undefined,
    name: row.name,
    primaryMobile: row.primaryMobile,
    areaName: row.areaName,
    areaNameGu: row.areaNameGu,
    notes: row.notes,
    address: row.address,
    customerSince: row.customerSince || undefined,
    additionalContacts: row.additionalContacts,
  });

  return existing && strategy === 'update' ? 'updated' : 'created';
}
