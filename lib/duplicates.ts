import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { areas, businessCategories, businessContacts, customers } from '@/db/schema';

export type DuplicateItem = {
  id: number;
  name: string;
  subtitle: string;
  createdAt: string;
};

export type DuplicateGroup = {
  phoneNumber: string;
  items: DuplicateItem[];
};

function groupByPhone(rows: { id: number; name: string; subtitle: string; createdAt: string; phone: string }[]): DuplicateGroup[] {
  const groups = new Map<string, DuplicateItem[]>();
  for (const row of rows) {
    const list = groups.get(row.phone) ?? [];
    list.push({ id: row.id, name: row.name, subtitle: row.subtitle, createdAt: row.createdAt });
    groups.set(row.phone, list);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([phoneNumber, items]) => ({ phoneNumber, items }))
    .sort((a, b) => b.items.length - a.items.length);
}

export async function findDuplicateCustomers(): Promise<DuplicateGroup[]> {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      subtitle: areas.name,
      createdAt: customers.createdAt,
      phone: customers.primaryMobile,
    })
    .from(customers)
    .innerJoin(areas, eq(customers.areaId, areas.id))
    .where(eq(customers.isDeleted, false));

  return groupByPhone(rows);
}

export async function findDuplicateBusinessContacts(): Promise<DuplicateGroup[]> {
  const rows = await db
    .select({
      id: businessContacts.id,
      name: businessContacts.name,
      subtitle: businessCategories.name,
      createdAt: businessContacts.createdAt,
      phone: businessContacts.primaryNumber,
    })
    .from(businessContacts)
    .innerJoin(businessCategories, eq(businessContacts.categoryId, businessCategories.id))
    .where(eq(businessContacts.isDeleted, false));

  return groupByPhone(rows);
}
