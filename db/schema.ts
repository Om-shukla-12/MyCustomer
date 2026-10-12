import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  nameGu: text('name_gu'),
});

export const relationshipTags = sqliteTable('relationship_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  isSystemDefault: integer('is_system_default', { mode: 'boolean' }).notNull().default(false),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  primaryMobile: text('primary_mobile').notNull(),
  areaId: integer('area_id')
    .notNull()
    .references(() => areas.id),
  notes: text('notes'),
  address: text('address'),
  customerSince: text('customer_since'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  nativeContactId: text('native_contact_id'),
});

export const additionalContacts = sqliteTable('additional_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  relationshipTagId: integer('relationship_tag_id')
    .notNull()
    .references(() => relationshipTags.id),
  customLabel: text('custom_label'),
});

export const areasRelations = relations(areas, ({ many }) => ({
  customers: many(customers),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  area: one(areas, { fields: [customers.areaId], references: [areas.id] }),
  additionalContacts: many(additionalContacts),
}));

export const additionalContactsRelations = relations(additionalContacts, ({ one }) => ({
  customer: one(customers, { fields: [additionalContacts.customerId], references: [customers.id] }),
  relationshipTag: one(relationshipTags, {
    fields: [additionalContacts.relationshipTagId],
    references: [relationshipTags.id],
  }),
}));

export const relationshipTagsRelations = relations(relationshipTags, ({ many }) => ({
  additionalContacts: many(additionalContacts),
}));

export const businessCategories = sqliteTable('business_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const businessContacts = sqliteTable('business_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => businessCategories.id),
  primaryNumber: text('primary_number').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const businessContactNumbers = sqliteTable('business_contact_numbers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessContactId: integer('business_contact_id')
    .notNull()
    .references(() => businessContacts.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  label: text('label').notNull(),
});

export const businessCategoriesRelations = relations(businessCategories, ({ many }) => ({
  contacts: many(businessContacts),
}));

export const businessContactsRelations = relations(businessContacts, ({ one, many }) => ({
  category: one(businessCategories, { fields: [businessContacts.categoryId], references: [businessCategories.id] }),
  numbers: many(businessContactNumbers),
}));

export const businessContactNumbersRelations = relations(businessContactNumbers, ({ one }) => ({
  contact: one(businessContacts, {
    fields: [businessContactNumbers.businessContactId],
    references: [businessContacts.id],
  }),
}));

export const todayVisits = sqliteTable('today_visits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  visitDate: text('visit_date').notNull(),
  status: text('status').notNull().default('pending'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').notNull(),
});

export const todayVisitsRelations = relations(todayVisits, ({ one }) => ({
  customer: one(customers, { fields: [todayVisits.customerId], references: [customers.id] }),
}));

export const licCustomers = sqliteTable('lic_customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  policyNo: text('policy_no').notNull().unique(),
  assuredName: text('assured_name').notNull(),
  phoneNumber: text('phone_number'),
  areaId: integer('area_id').references(() => areas.id),
  dateOfCommencement: text('date_of_commencement'),
  planTerm: text('plan_term'),
  mode: text('mode'),
  fupDate: text('fup_date'),
  flag: text('flag'),
  installmentPremium: real('installment_premium'),
  installmentsDue: integer('installments_due'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const licCustomersRelations = relations(licCustomers, ({ one, many }) => ({
  area: one(areas, { fields: [licCustomers.areaId], references: [areas.id] }),
  ledgerEntries: many(licLedgerEntries),
}));

export const licLedgerEntries = sqliteTable('lic_ledger_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licCustomerId: integer('lic_customer_id')
    .notNull()
    .references(() => licCustomers.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  requiredAmount: real('required_amount').notNull(),
  amountPaid: real('amount_paid').notNull(),
  paymentMethod: text('payment_method'),
  notes: text('notes'),
  balanceAfter: real('balance_after').notNull(),
  createdAt: text('created_at').notNull(),
});

export const licLedgerEntriesRelations = relations(licLedgerEntries, ({ one }) => ({
  licCustomer: one(licCustomers, { fields: [licLedgerEntries.licCustomerId], references: [licCustomers.id] }),
}));

export const stockItems = sqliteTable('stock_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemName: text('item_name').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  modelNumber: text('model_number').notNull(),
  dealerPrice: real('dealer_price').notNull(),
  billingDate: text('billing_date').notNull(),
  status: text('status').notNull().default('In Stock'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  stockItemId: integer('stock_item_id').references(() => stockItems.id),
  productName: text('product_name').notNull(),
  modelNumber: text('model_number').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  purchaseDate: text('purchase_date').notNull(),
  salePrice: real('sale_price').notNull(),
  nextFollowUpDate: text('next_follow_up_date'),
  productNote: text('product_note'),
  guarantorName: text('guarantor_name'),
  guarantorMobile: text('guarantor_mobile'),
  guarantorAddress: text('guarantor_address'),
  guarantorVillage: text('guarantor_village'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const productPayments = sqliteTable('product_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  amountReceived: real('amount_received').notNull(),
  dateReceived: text('date_received').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const productFollowUps = sqliteTable('product_follow_ups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  previousDate: text('previous_date'),
  newDate: text('new_date'),
  note: text('note'),
  createdAt: text('created_at').notNull(),
});

export const stockItemsRelations = relations(stockItems, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  customer: one(customers, { fields: [products.customerId], references: [customers.id] }),
  stockItem: one(stockItems, { fields: [products.stockItemId], references: [stockItems.id] }),
  payments: many(productPayments),
  followUps: many(productFollowUps),
}));

export const productPaymentsRelations = relations(productPayments, ({ one }) => ({
  product: one(products, { fields: [productPayments.productId], references: [products.id] }),
}));

export const productFollowUpsRelations = relations(productFollowUps, ({ one }) => ({
  product: one(products, { fields: [productFollowUps.productId], references: [products.id] }),
}));
