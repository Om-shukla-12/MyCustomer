import { and, eq, like, ne, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { businessCategories, businessContactNumbers, businessContacts } from '@/db/schema';
import { normalizePhone } from '@/lib/phone';

export async function getLastBusinessUpdateTimestamp(): Promise<string | null> {
  const rows = await db.select({ max: sql<string | null>`max(${businessContacts.updatedAt})` }).from(businessContacts);
  return rows[0]?.max ?? null;
}

export async function getActiveBusinessContactCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(businessContacts)
    .where(eq(businessContacts.isDeleted, false));
  return rows[0]?.count ?? 0;
}

export async function clearAllBusinessContacts(): Promise<number> {
  const rows = await db
    .update(businessContacts)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(businessContacts.isDeleted, false))
    .returning({ id: businessContacts.id });
  return rows.length;
}

export type BusinessCategory = { id: number; name: string };
export type BusinessCategoryWithCount = { id: number; name: string; count: number };

export type BusinessContactListItem = {
  id: number;
  name: string;
  primaryNumber: string;
  categoryName: string;
};

export type BusinessContactDetail = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  primaryNumber: string;
  notes: string | null;
  numbers: { id: number; phoneNumber: string; label: string }[];
};

export type BusinessContactFormInput = {
  id?: number;
  name: string;
  categoryName: string;
  primaryNumber: string;
  notes?: string;
  numbers: { phoneNumber: string; label: string }[];
};

const listColumns = {
  id: businessContacts.id,
  name: businessContacts.name,
  primaryNumber: businessContacts.primaryNumber,
  categoryName: businessCategories.name,
};

export async function getBusinessCategories(): Promise<BusinessCategory[]> {
  return db
    .select({ id: businessCategories.id, name: businessCategories.name })
    .from(businessCategories)
    .orderBy(businessCategories.name);
}

export async function getBusinessContacts(query?: string, categoryId?: number): Promise<BusinessContactListItem[]> {
  const conditions = [eq(businessContacts.isDeleted, false)];
  if (categoryId) conditions.push(eq(businessContacts.categoryId, categoryId));

  const q = query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    const digitsPattern = `%${normalizePhone(q)}%`;
    conditions.push(
      or(
        like(businessContacts.name, pattern),
        like(businessContacts.primaryNumber, digitsPattern),
        like(businessCategories.name, pattern)
      )!
    );
  }

  return db
    .select(listColumns)
    .from(businessContacts)
    .innerJoin(businessCategories, eq(businessContacts.categoryId, businessCategories.id))
    .where(and(...conditions))
    .orderBy(businessContacts.name);
}

export async function getBusinessContactById(id: number): Promise<BusinessContactDetail | null> {
  const row = await db.query.businessContacts.findFirst({
    where: eq(businessContacts.id, id),
    with: { category: true, numbers: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    primaryNumber: row.primaryNumber,
    notes: row.notes,
    numbers: row.numbers.map((n) => ({ id: n.id, phoneNumber: n.phoneNumber, label: n.label })),
  };
}

function normalizeCategoryKey(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function findOrCreateCategory(rawName: string): Promise<number> {
  const name = rawName.trim().replace(/\s+/g, ' ');
  const key = normalizeCategoryKey(rawName);
  const all = await db.select().from(businessCategories);
  const match = all.find((c) => normalizeCategoryKey(c.name) === key);
  if (match) return match.id;

  const [inserted] = await db.insert(businessCategories).values({ name }).returning({ id: businessCategories.id });
  return inserted.id;
}

export async function findDuplicateBusinessContactByPhone(
  rawPhone: string,
  excludeId?: number
): Promise<{ id: number; name: string } | null> {
  const normalized = normalizePhone(rawPhone);
  if (normalized.length < 10) return null;

  const rows = await db
    .select({ id: businessContacts.id, name: businessContacts.name })
    .from(businessContacts)
    .where(
      and(
        eq(businessContacts.primaryNumber, normalized),
        eq(businessContacts.isDeleted, false),
        excludeId ? ne(businessContacts.id, excludeId) : undefined
      )
    );
  return rows[0] ?? null;
}

export async function saveBusinessContact(input: BusinessContactFormInput): Promise<number> {
  const categoryId = await findOrCreateCategory(input.categoryName);
  const normalizedPrimary = normalizePhone(input.primaryNumber);
  const now = new Date().toISOString();

  let contactId: number;

  if (input.id) {
    await db
      .update(businessContacts)
      .set({
        name: input.name.trim(),
        categoryId,
        primaryNumber: normalizedPrimary,
        notes: input.notes?.trim() || null,
        updatedAt: now,
      })
      .where(eq(businessContacts.id, input.id));
    contactId = input.id;
    await db.delete(businessContactNumbers).where(eq(businessContactNumbers.businessContactId, contactId));
  } else {
    const [inserted] = await db
      .insert(businessContacts)
      .values({
        name: input.name.trim(),
        categoryId,
        primaryNumber: normalizedPrimary,
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: businessContacts.id });
    contactId = inserted.id;
  }

  const validNumbers = input.numbers.filter((n) => n.phoneNumber.trim() && n.label.trim());
  if (validNumbers.length > 0) {
    await db.insert(businessContactNumbers).values(
      validNumbers.map((n) => ({
        businessContactId: contactId,
        phoneNumber: normalizePhone(n.phoneNumber),
        label: n.label.trim(),
      }))
    );
  }

  return contactId;
}

export async function softDeleteBusinessContact(id: number): Promise<void> {
  await db
    .update(businessContacts)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(businessContacts.id, id));
}

export async function restoreBusinessContact(id: number): Promise<void> {
  await db
    .update(businessContacts)
    .set({ isDeleted: false, updatedAt: new Date().toISOString() })
    .where(eq(businessContacts.id, id));
}

export async function getUsedLabels(): Promise<string[]> {
  const rows = await db.selectDistinct({ label: businessContactNumbers.label }).from(businessContactNumbers);
  return rows.map((r) => r.label).sort((a, b) => a.localeCompare(b));
}

export async function getBusinessCategoriesWithCounts(): Promise<BusinessCategoryWithCount[]> {
  return db
    .select({
      id: businessCategories.id,
      name: businessCategories.name,
      count: sql<number>`count(${businessContacts.id})`,
    })
    .from(businessCategories)
    .leftJoin(
      businessContacts,
      and(eq(businessContacts.categoryId, businessCategories.id), eq(businessContacts.isDeleted, false))
    )
    .groupBy(businessCategories.id)
    .orderBy(businessCategories.name);
}

export async function getAllBusinessContactsForExport(): Promise<BusinessContactDetail[]> {
  const rows = await db.query.businessContacts.findMany({
    where: eq(businessContacts.isDeleted, false),
    with: { category: true, numbers: true },
    orderBy: (fields, { asc }) => [asc(fields.name)],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    primaryNumber: row.primaryNumber,
    notes: row.notes,
    numbers: row.numbers.map((n) => ({ id: n.id, phoneNumber: n.phoneNumber, label: n.label })),
  }));
}

export type BusinessImportStrategy = 'skip' | 'update' | 'createNew';
export type BusinessImportRowInput = {
  name: string;
  categoryName: string;
  primaryNumber: string;
  notes: string;
  numbers: { label: string; phoneNumber: string }[];
};

export async function importBusinessContactRow(
  row: BusinessImportRowInput,
  strategy: BusinessImportStrategy
): Promise<'created' | 'updated' | 'skipped'> {
  const existing = await findDuplicateBusinessContactByPhone(row.primaryNumber);

  if (existing && strategy === 'skip') return 'skipped';

  await saveBusinessContact({
    id: existing && strategy === 'update' ? existing.id : undefined,
    name: row.name,
    categoryName: row.categoryName,
    primaryNumber: row.primaryNumber,
    notes: row.notes,
    numbers: row.numbers,
  });

  return existing && strategy === 'update' ? 'updated' : 'created';
}

export async function deleteBusinessCategory(id: number): Promise<void> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(businessContacts)
    .where(and(eq(businessContacts.categoryId, id), eq(businessContacts.isDeleted, false)));
  if ((rows[0]?.count ?? 0) > 0) {
    throw new Error('in_use');
  }
  await db.delete(businessCategories).where(eq(businessCategories.id, id));
}
