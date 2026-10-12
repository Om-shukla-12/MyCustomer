import { and, asc, desc, eq, like, ne, or, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { customers, productFollowUps, productPayments, products, stockItems } from '@/db/schema';
import { normalizePhone } from '@/lib/phone';
import { findDuplicateByPhone, saveCustomer } from '@/lib/queries';

export type ProductListItem = {
  id: number;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  salePrice: number;
  nextFollowUpDate: string | null;
  customerName: string;
  primaryMobile: string;
  paid: number;
};

export type ProductDetail = ProductListItem & {
  customerId: number;
  customerAddress: string | null;
  stockItemId: number | null;
  productNote: string | null;
  guarantorName: string | null;
  guarantorMobile: string | null;
  guarantorAddress: string | null;
  guarantorVillage: string | null;
};

export type PaymentEntry = {
  id: number;
  amountReceived: number;
  dateReceived: string;
  notes: string | null;
  createdAt: string;
};

export type FollowUpEntry = {
  id: number;
  previousDate: string | null;
  newDate: string | null;
  note: string | null;
  createdAt: string;
};

export type ProductFormInput = {
  id?: number;
  customerId?: number;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  salePrice: number;
  nextFollowUpDate?: string;
  productNote?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  guarantorName?: string;
  guarantorMobile?: string;
  guarantorAddress?: string;
  guarantorVillage?: string;
  stockItemId?: number | null;
};

export type FollowUpBucket = 'overdue' | 'today' | 'upcoming';

const productListColumns = {
  id: products.id,
  productName: products.productName,
  modelNumber: products.modelNumber,
  serialNumber: products.serialNumber,
  purchaseDate: products.purchaseDate,
  salePrice: products.salePrice,
  nextFollowUpDate: products.nextFollowUpDate,
  customerName: customers.name,
  primaryMobile: customers.primaryMobile,
  paid: sql<number>`coalesce(sum(${productPayments.amountReceived}), 0)`,
};

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getProducts(query?: string): Promise<ProductListItem[]> {
  const q = query?.trim();
  const conditions = [eq(products.isDeleted, false)];
  if (q) {
    const pattern = `%${q}%`;
    const digitsPattern = `%${normalizePhone(q)}%`;
    conditions.push(
      or(
        like(products.productName, pattern),
        like(products.modelNumber, pattern),
        like(products.serialNumber, pattern),
        like(products.guarantorName, pattern),
        like(products.guarantorMobile, digitsPattern),
        like(customers.name, pattern),
        like(customers.primaryMobile, digitsPattern)
      )!
    );
  }

  return db
    .select(productListColumns)
    .from(products)
    .innerJoin(customers, eq(products.customerId, customers.id))
    .leftJoin(productPayments, eq(products.id, productPayments.productId))
    .where(and(...conditions))
    .groupBy(products.id)
    .orderBy(desc(products.purchaseDate), desc(products.id));
}

export async function getFollowUpProducts(bucket: FollowUpBucket): Promise<ProductListItem[]> {
  const today = todayIsoDate();
  const dateCondition =
    bucket === 'overdue'
      ? sql`${products.nextFollowUpDate} < ${today}`
      : bucket === 'today'
        ? eq(products.nextFollowUpDate, today)
        : sql`${products.nextFollowUpDate} > ${today}`;

  return db
    .select(productListColumns)
    .from(products)
    .innerJoin(customers, eq(products.customerId, customers.id))
    .leftJoin(productPayments, eq(products.id, productPayments.productId))
    .where(and(eq(products.isDeleted, false), sql`${products.nextFollowUpDate} is not null`, dateCondition))
    .groupBy(products.id)
    .having(sql`coalesce(sum(${productPayments.amountReceived}), 0) < ${products.salePrice}`)
    .orderBy(asc(products.nextFollowUpDate), asc(products.id));
}

export async function getProductById(id: number): Promise<ProductDetail | null> {
  const rows = await db
    .select({
      ...productListColumns,
      customerId: products.customerId,
      customerAddress: customers.address,
      stockItemId: products.stockItemId,
      productNote: products.productNote,
      guarantorName: products.guarantorName,
      guarantorMobile: products.guarantorMobile,
      guarantorAddress: products.guarantorAddress,
      guarantorVillage: products.guarantorVillage,
    })
    .from(products)
    .innerJoin(customers, eq(products.customerId, customers.id))
    .leftJoin(productPayments, eq(products.id, productPayments.productId))
    .where(eq(products.id, id))
    .groupBy(products.id)
    .limit(1);
  return rows[0] ?? null;
}

export async function getProductsByCustomerId(customerId: number): Promise<ProductListItem[]> {
  return db
    .select(productListColumns)
    .from(products)
    .innerJoin(customers, eq(products.customerId, customers.id))
    .leftJoin(productPayments, eq(products.id, productPayments.productId))
    .where(and(eq(products.customerId, customerId), eq(products.isDeleted, false)))
    .groupBy(products.id)
    .orderBy(desc(products.purchaseDate), desc(products.id));
}

export async function findDuplicateProductSerial(
  rawSerial: string,
  excludeId?: number
): Promise<{ id: number; productName: string } | null> {
  const serial = rawSerial.trim();
  if (!serial) return null;
  const rows = await db
    .select({ id: products.id, productName: products.productName })
    .from(products)
    .where(
      and(
        eq(products.serialNumber, serial),
        eq(products.isDeleted, false),
        excludeId ? ne(products.id, excludeId) : undefined
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function saveProduct(input: ProductFormInput): Promise<number> {
  const now = new Date().toISOString();
  const normalizedPhone = normalizePhone(input.customerPhone);
  const duplicateCustomer = input.customerId ? null : await findDuplicateByPhone(normalizedPhone);
  const customerId =
    input.customerId ??
    duplicateCustomer?.id ??
    (await saveCustomer({
      name: input.customerName,
      primaryMobile: normalizedPhone,
      areaName: 'General',
      address: input.customerAddress,
      additionalContacts: [],
    }));

  const values = {
    customerId,
    stockItemId: input.stockItemId ?? null,
    productName: input.productName.trim(),
    modelNumber: input.modelNumber.trim(),
    serialNumber: input.serialNumber.trim(),
    purchaseDate: input.purchaseDate,
    salePrice: input.salePrice,
    nextFollowUpDate: input.nextFollowUpDate?.trim() || null,
    productNote: input.productNote?.trim() || null,
    guarantorName: input.guarantorName?.trim() || null,
    guarantorMobile: input.guarantorMobile?.trim() ? normalizePhone(input.guarantorMobile) : null,
    guarantorAddress: input.guarantorAddress?.trim() || null,
    guarantorVillage: input.guarantorVillage?.trim() || null,
    updatedAt: now,
  };

  let productId: number;
  if (input.id) {
    const existing = await getProductById(input.id);
    await db.update(products).set(values).where(eq(products.id, input.id));
    productId = input.id;
    if (existing?.nextFollowUpDate !== values.nextFollowUpDate) {
      await addFollowUpEntry(productId, existing?.nextFollowUpDate ?? null, values.nextFollowUpDate, 'Follow-up date updated');
    }
  } else {
    const [inserted] = await db.insert(products).values({ ...values, createdAt: now }).returning({ id: products.id });
    productId = inserted.id;
    if (values.nextFollowUpDate) {
      await addFollowUpEntry(productId, null, values.nextFollowUpDate, 'Initial follow-up date');
    }
  }

  if (values.stockItemId) {
    await db.update(stockItems).set({ status: 'Sold', updatedAt: now }).where(eq(stockItems.id, values.stockItemId));
  }

  return productId;
}

export async function softDeleteProduct(id: number): Promise<void> {
  await db.update(products).set({ isDeleted: true, updatedAt: new Date().toISOString() }).where(eq(products.id, id));
}

export async function getProductPayments(productId: number): Promise<PaymentEntry[]> {
  return db
    .select({
      id: productPayments.id,
      amountReceived: productPayments.amountReceived,
      dateReceived: productPayments.dateReceived,
      notes: productPayments.notes,
      createdAt: productPayments.createdAt,
    })
    .from(productPayments)
    .where(eq(productPayments.productId, productId))
    .orderBy(desc(productPayments.dateReceived), desc(productPayments.id));
}

export async function addProductPayment(input: {
  productId: number;
  amountReceived: number;
  dateReceived: string;
  notes?: string;
}): Promise<void> {
  await db.insert(productPayments).values({
    productId: input.productId,
    amountReceived: input.amountReceived,
    dateReceived: input.dateReceived,
    notes: input.notes?.trim() || null,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteProductPayment(id: number): Promise<void> {
  await db.delete(productPayments).where(eq(productPayments.id, id));
}

export async function getFollowUpHistory(productId: number): Promise<FollowUpEntry[]> {
  return db
    .select({
      id: productFollowUps.id,
      previousDate: productFollowUps.previousDate,
      newDate: productFollowUps.newDate,
      note: productFollowUps.note,
      createdAt: productFollowUps.createdAt,
    })
    .from(productFollowUps)
    .where(eq(productFollowUps.productId, productId))
    .orderBy(desc(productFollowUps.id));
}

export async function addFollowUpEntry(
  productId: number,
  previousDate: string | null,
  newDate: string | null,
  note?: string
): Promise<void> {
  await db.insert(productFollowUps).values({
    productId,
    previousDate,
    newDate,
    note: note?.trim() || null,
    createdAt: new Date().toISOString(),
  });
}

export async function rescheduleFollowUp(productId: number, newDate: string, note?: string): Promise<void> {
  const product = await getProductById(productId);
  const now = new Date().toISOString();
  await db.update(products).set({ nextFollowUpDate: newDate || null, updatedAt: now }).where(eq(products.id, productId));
  await addFollowUpEntry(productId, product?.nextFollowUpDate ?? null, newDate || null, note);
}

export type StockListItem = {
  id: number;
  itemName: string;
  serialNumber: string;
  modelNumber: string;
  dealerPrice: number;
  billingDate: string;
  status: string;
  soldProductId: number | null;
};

export type StockFormInput = {
  id?: number;
  itemName: string;
  serialNumber: string;
  modelNumber: string;
  dealerPrice: number;
  billingDate: string;
};

export async function getStockItems(query?: string): Promise<StockListItem[]> {
  const q = query?.trim();
  const conditions = [eq(stockItems.isDeleted, false)];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(like(stockItems.itemName, pattern), like(stockItems.serialNumber, pattern), like(stockItems.modelNumber, pattern))!);
  }

  return db
    .select({
      id: stockItems.id,
      itemName: stockItems.itemName,
      serialNumber: stockItems.serialNumber,
      modelNumber: stockItems.modelNumber,
      dealerPrice: stockItems.dealerPrice,
      billingDate: stockItems.billingDate,
      status: stockItems.status,
      soldProductId: products.id,
    })
    .from(stockItems)
    .leftJoin(products, and(eq(products.stockItemId, stockItems.id), eq(products.isDeleted, false)))
    .where(and(...conditions))
    .orderBy(asc(stockItems.status), desc(stockItems.billingDate), desc(stockItems.id));
}

export async function getAvailableStockItems(): Promise<StockListItem[]> {
  return (await getStockItems()).filter((item) => item.status === 'In Stock');
}

export async function getStockItemById(id: number): Promise<StockListItem | null> {
  const rows = await getStockItems();
  return rows.find((item) => item.id === id) ?? null;
}

export async function findDuplicateStockSerial(rawSerial: string, excludeId?: number): Promise<StockListItem | null> {
  const serial = rawSerial.trim();
  if (!serial) return null;
  const rows = await getStockItems(serial);
  return rows.find((item) => item.serialNumber === serial && item.id !== excludeId) ?? null;
}

export async function saveStockItem(input: StockFormInput): Promise<number> {
  const now = new Date().toISOString();
  const values = {
    itemName: input.itemName.trim(),
    serialNumber: input.serialNumber.trim(),
    modelNumber: input.modelNumber.trim(),
    dealerPrice: input.dealerPrice,
    billingDate: input.billingDate,
    updatedAt: now,
  };
  if (input.id) {
    await db.update(stockItems).set(values).where(eq(stockItems.id, input.id));
    return input.id;
  }
  const [inserted] = await db
    .insert(stockItems)
    .values({ ...values, status: 'In Stock', createdAt: now })
    .returning({ id: stockItems.id });
  return inserted.id;
}

export async function softDeleteStockItem(id: number): Promise<void> {
  await db.update(stockItems).set({ isDeleted: true, updatedAt: new Date().toISOString() }).where(eq(stockItems.id, id));
}

export async function getActiveProductCount(): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isDeleted, false));
  return rows[0]?.count ?? 0;
}

export async function getActiveStockCount(): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isDeleted, false));
  return rows[0]?.count ?? 0;
}
