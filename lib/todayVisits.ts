import { and, asc, desc, eq, like, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { areas, customers, todayVisits } from '@/db/schema';

export type TodayVisitStatus = 'pending' | 'done';

export type TodayVisitItem = {
  id: number;
  customerId: number;
  status: TodayVisitStatus;
  sortOrder: number;
  name: string;
  primaryMobile: string;
  areaName: string;
  areaNameGu: string | null;
};

export async function getTodayVisitCustomerIds(visitDate: string): Promise<Set<number>> {
  const rows = await db
    .select({ customerId: todayVisits.customerId })
    .from(todayVisits)
    .where(eq(todayVisits.visitDate, visitDate));
  return new Set(rows.map((r) => r.customerId));
}

export async function toggleTodayVisit(customerId: number, visitDate: string): Promise<'added' | 'removed'> {
  const existing = await db
    .select({ id: todayVisits.id })
    .from(todayVisits)
    .where(and(eq(todayVisits.customerId, customerId), eq(todayVisits.visitDate, visitDate)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(todayVisits).where(eq(todayVisits.id, existing[0].id));
    return 'removed';
  }

  const maxRow = await db
    .select({ sortOrder: todayVisits.sortOrder })
    .from(todayVisits)
    .where(eq(todayVisits.visitDate, visitDate))
    .orderBy(desc(todayVisits.sortOrder))
    .limit(1);
  const nextSortOrder = (maxRow[0]?.sortOrder ?? -1) + 1;

  await db.insert(todayVisits).values({
    customerId,
    visitDate,
    status: 'pending',
    sortOrder: nextSortOrder,
    createdAt: new Date().toISOString(),
  });
  return 'added';
}

export async function getTodayVisits(visitDate: string, query?: string): Promise<TodayVisitItem[]> {
  const conditions = [eq(todayVisits.visitDate, visitDate)];
  const q = query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(like(customers.name, pattern), like(areas.name, pattern))!);
  }

  const rows = await db
    .select({
      id: todayVisits.id,
      customerId: todayVisits.customerId,
      status: todayVisits.status,
      sortOrder: todayVisits.sortOrder,
      name: customers.name,
      primaryMobile: customers.primaryMobile,
      areaName: areas.name,
      areaNameGu: areas.nameGu,
    })
    .from(todayVisits)
    .innerJoin(customers, eq(todayVisits.customerId, customers.id))
    .innerJoin(areas, eq(customers.areaId, areas.id))
    .where(and(...conditions))
    .orderBy(asc(todayVisits.sortOrder));

  return rows.map((r) => ({ ...r, status: r.status as TodayVisitStatus }));
}

export async function updateTodayVisitStatus(id: number, status: TodayVisitStatus): Promise<void> {
  await db.update(todayVisits).set({ status }).where(eq(todayVisits.id, id));
}

export async function removeTodayVisit(id: number): Promise<void> {
  await db.delete(todayVisits).where(eq(todayVisits.id, id));
}

export async function reorderTodayVisit(visitDate: string, id: number, direction: 'up' | 'down'): Promise<void> {
  const rows = await db
    .select({ id: todayVisits.id, sortOrder: todayVisits.sortOrder })
    .from(todayVisits)
    .where(eq(todayVisits.visitDate, visitDate))
    .orderBy(asc(todayVisits.sortOrder));

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swap = rows[swapIndex];

  await db.update(todayVisits).set({ sortOrder: swap.sortOrder }).where(eq(todayVisits.id, current.id));
  await db.update(todayVisits).set({ sortOrder: current.sortOrder }).where(eq(todayVisits.id, swap.id));
}
