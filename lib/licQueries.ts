import { and, desc, eq, like, ne, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { areas, licCustomers, licLedgerEntries } from '@/db/schema';
import { normalizePhone } from '@/lib/phone';
import { findOrCreateArea } from '@/lib/queries';

export type LicCustomerListItem = {
  id: number;
  policyNo: string;
  assuredName: string;
  phoneNumber: string | null;
  areaName: string | null;
  areaNameGu: string | null;
  mode: string | null;
  installmentPremium: number | null;
  installmentsDue: number | null;
};

export type LicCustomerDetail = {
  id: number;
  policyNo: string;
  assuredName: string;
  phoneNumber: string | null;
  areaId: number | null;
  areaName: string | null;
  areaNameGu: string | null;
  dateOfCommencement: string | null;
  planTerm: string | null;
  mode: string | null;
  fupDate: string | null;
  flag: string | null;
  installmentPremium: number | null;
  installmentsDue: number | null;
  notes: string | null;
};

export type LicCustomerFormInput = {
  id?: number;
  policyNo: string;
  assuredName: string;
  phoneNumber?: string;
  areaName?: string;
  areaNameGu?: string;
  dateOfCommencement?: string;
  planTerm?: string;
  mode?: string;
  fupDate?: string;
  flag?: string;
  installmentPremium?: number;
  installmentsDue?: number;
  notes?: string;
};

const listColumns = {
  id: licCustomers.id,
  policyNo: licCustomers.policyNo,
  assuredName: licCustomers.assuredName,
  phoneNumber: licCustomers.phoneNumber,
  areaName: areas.name,
  areaNameGu: areas.nameGu,
  mode: licCustomers.mode,
  installmentPremium: licCustomers.installmentPremium,
  installmentsDue: licCustomers.installmentsDue,
};

const totalDueSortKey = sql`${licCustomers.installmentPremium} * ${licCustomers.installmentsDue}`;

export async function getLicCustomers(query?: string): Promise<LicCustomerListItem[]> {
  const q = query?.trim();
  const base = db.select(listColumns).from(licCustomers).leftJoin(areas, eq(licCustomers.areaId, areas.id));

  if (!q) {
    return base
      .where(eq(licCustomers.isDeleted, false))
      .orderBy(desc(licCustomers.installmentsDue), desc(totalDueSortKey));
  }

  const pattern = `%${q}%`;
  const digitsPattern = `%${normalizePhone(q)}%`;
  return base
    .where(
      and(
        eq(licCustomers.isDeleted, false),
        or(
          like(licCustomers.assuredName, pattern),
          like(licCustomers.policyNo, pattern),
          like(licCustomers.phoneNumber, digitsPattern),
          like(areas.name, pattern)
        )
      )
    )
    .orderBy(desc(licCustomers.installmentsDue), desc(totalDueSortKey));
}

export async function getLicCustomerById(id: number): Promise<LicCustomerDetail | null> {
  const rows = await db
    .select({
      id: licCustomers.id,
      policyNo: licCustomers.policyNo,
      assuredName: licCustomers.assuredName,
      phoneNumber: licCustomers.phoneNumber,
      areaId: licCustomers.areaId,
      areaName: areas.name,
      areaNameGu: areas.nameGu,
      dateOfCommencement: licCustomers.dateOfCommencement,
      planTerm: licCustomers.planTerm,
      mode: licCustomers.mode,
      fupDate: licCustomers.fupDate,
      flag: licCustomers.flag,
      installmentPremium: licCustomers.installmentPremium,
      installmentsDue: licCustomers.installmentsDue,
      notes: licCustomers.notes,
    })
    .from(licCustomers)
    .leftJoin(areas, eq(licCustomers.areaId, areas.id))
    .where(eq(licCustomers.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDuplicatePolicyNo(
  rawPolicyNo: string,
  excludeId?: number
): Promise<{ id: number; assuredName: string } | null> {
  const key = rawPolicyNo.trim();
  if (!key) return null;

  const rows = await db
    .select({ id: licCustomers.id, assuredName: licCustomers.assuredName })
    .from(licCustomers)
    .where(
      and(
        eq(licCustomers.policyNo, key),
        eq(licCustomers.isDeleted, false),
        excludeId ? ne(licCustomers.id, excludeId) : undefined
      )
    );
  return rows[0] ?? null;
}

export async function saveLicCustomer(input: LicCustomerFormInput): Promise<number> {
  const areaId = input.areaName?.trim() ? await findOrCreateArea(input.areaName, input.areaNameGu) : null;
  const now = new Date().toISOString();

  const values = {
    policyNo: input.policyNo.trim(),
    assuredName: input.assuredName.trim(),
    phoneNumber: input.phoneNumber?.trim() ? normalizePhone(input.phoneNumber) : null,
    areaId,
    dateOfCommencement: input.dateOfCommencement || null,
    planTerm: input.planTerm?.trim() || null,
    mode: input.mode?.trim() || null,
    fupDate: input.fupDate?.trim() || null,
    flag: input.flag?.trim() || null,
    installmentPremium: input.installmentPremium ?? null,
    installmentsDue: input.installmentsDue ?? null,
    notes: input.notes?.trim() || null,
    updatedAt: now,
  };

  if (input.id) {
    await db.update(licCustomers).set(values).where(eq(licCustomers.id, input.id));
    return input.id;
  }

  const [inserted] = await db
    .insert(licCustomers)
    .values({ ...values, createdAt: now })
    .returning({ id: licCustomers.id });
  return inserted.id;
}

export async function softDeleteLicCustomer(id: number): Promise<void> {
  await db
    .update(licCustomers)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(licCustomers.id, id));
}

export async function restoreLicCustomer(id: number): Promise<void> {
  await db
    .update(licCustomers)
    .set({ isDeleted: false, updatedAt: new Date().toISOString() })
    .where(eq(licCustomers.id, id));
}

export async function getAllLicCustomersForExport(): Promise<LicCustomerDetail[]> {
  const rows = await db
    .select({
      id: licCustomers.id,
      policyNo: licCustomers.policyNo,
      assuredName: licCustomers.assuredName,
      phoneNumber: licCustomers.phoneNumber,
      areaId: licCustomers.areaId,
      areaName: areas.name,
      areaNameGu: areas.nameGu,
      dateOfCommencement: licCustomers.dateOfCommencement,
      planTerm: licCustomers.planTerm,
      mode: licCustomers.mode,
      fupDate: licCustomers.fupDate,
      flag: licCustomers.flag,
      installmentPremium: licCustomers.installmentPremium,
      installmentsDue: licCustomers.installmentsDue,
      notes: licCustomers.notes,
    })
    .from(licCustomers)
    .leftJoin(areas, eq(licCustomers.areaId, areas.id))
    .where(eq(licCustomers.isDeleted, false))
    .orderBy(licCustomers.assuredName);
  return rows;
}

export type LicImportStrategy = 'skip' | 'update' | 'createNew';
export type LicImportRowInput = {
  policyNo: string;
  assuredName: string;
  phoneNumber: string;
  areaName: string;
  areaNameGu: string;
  dateOfCommencement: string;
  planTerm: string;
  mode: string;
  fupDate: string;
  flag: string;
  installmentPremium: number | undefined;
  installmentsDue: number | undefined;
  notes: string;
};

export async function importLicCustomerRow(
  row: LicImportRowInput,
  strategy: LicImportStrategy
): Promise<'created' | 'updated' | 'skipped'> {
  const existing = await findDuplicatePolicyNo(row.policyNo);

  if (existing && strategy === 'skip') return 'skipped';

  await saveLicCustomer({
    id: existing && strategy === 'update' ? existing.id : undefined,
    policyNo: row.policyNo,
    assuredName: row.assuredName,
    phoneNumber: row.phoneNumber || undefined,
    areaName: row.areaName || undefined,
    areaNameGu: row.areaNameGu || undefined,
    dateOfCommencement: row.dateOfCommencement || undefined,
    planTerm: row.planTerm || undefined,
    mode: row.mode || undefined,
    fupDate: row.fupDate || undefined,
    flag: row.flag || undefined,
    installmentPremium: row.installmentPremium,
    installmentsDue: row.installmentsDue,
    notes: row.notes || undefined,
  });

  return existing && strategy === 'update' ? 'updated' : 'created';
}

export type LicLedgerEntry = {
  id: number;
  date: string;
  requiredAmount: number;
  amountPaid: number;
  paymentMethod: string | null;
  notes: string | null;
  balanceAfter: number;
};

export async function getLicBalance(licCustomerId: number): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`coalesce(sum(${licLedgerEntries.requiredAmount} - ${licLedgerEntries.amountPaid}), 0)`,
    })
    .from(licLedgerEntries)
    .where(eq(licLedgerEntries.licCustomerId, licCustomerId));
  return rows[0]?.total ?? 0;
}

export async function getLicLedgerEntries(licCustomerId: number): Promise<LicLedgerEntry[]> {
  return db
    .select({
      id: licLedgerEntries.id,
      date: licLedgerEntries.date,
      requiredAmount: licLedgerEntries.requiredAmount,
      amountPaid: licLedgerEntries.amountPaid,
      paymentMethod: licLedgerEntries.paymentMethod,
      notes: licLedgerEntries.notes,
      balanceAfter: licLedgerEntries.balanceAfter,
    })
    .from(licLedgerEntries)
    .where(eq(licLedgerEntries.licCustomerId, licCustomerId))
    .orderBy(desc(licLedgerEntries.id));
}

export type LicLedgerEntryInput = {
  licCustomerId: number;
  date: string;
  requiredAmount: number;
  amountPaid: number;
  paymentMethod?: string;
  notes?: string;
};

export async function addLicLedgerEntry(input: LicLedgerEntryInput): Promise<void> {
  const balanceBefore = await getLicBalance(input.licCustomerId);
  const balanceAfter = balanceBefore + input.requiredAmount - input.amountPaid;
  const now = new Date().toISOString();

  await db.insert(licLedgerEntries).values({
    licCustomerId: input.licCustomerId,
    date: input.date,
    requiredAmount: input.requiredAmount,
    amountPaid: input.amountPaid,
    paymentMethod: input.paymentMethod || null,
    notes: input.notes || null,
    balanceAfter,
    createdAt: now,
  });

  const policyRows = await db
    .select({ installmentsDue: licCustomers.installmentsDue })
    .from(licCustomers)
    .where(eq(licCustomers.id, input.licCustomerId))
    .limit(1);
  const currentDue = policyRows[0]?.installmentsDue;
  if (currentDue != null && currentDue > 0) {
    await db
      .update(licCustomers)
      .set({ installmentsDue: currentDue - 1, updatedAt: now })
      .where(eq(licCustomers.id, input.licCustomerId));
  }
}

export async function deleteLicLedgerEntry(id: number): Promise<void> {
  await db.delete(licLedgerEntries).where(eq(licLedgerEntries.id, id));
}

export async function getActiveLicCustomerCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(licCustomers)
    .where(eq(licCustomers.isDeleted, false));
  return rows[0]?.count ?? 0;
}

export async function clearAllLicCustomers(): Promise<number> {
  const rows = await db
    .update(licCustomers)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(licCustomers.isDeleted, false))
    .returning({ id: licCustomers.id });
  return rows.length;
}
