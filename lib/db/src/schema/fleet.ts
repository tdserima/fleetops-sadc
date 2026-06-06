import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./auth";

function newId() {
  return sql<string>`gen_random_uuid()`;
}

export const orgsTable = pgTable("orgs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  country: varchar("country", { length: 3 }),
  companyRegNo: varchar("company_reg_no"),
  cbrtaOperatorNo: varchar("cbrta_operator_no"),
  vatNo: varchar("vat_no"),
  address: text("address"),
  billingEmail: varchar("billing_email"),
  phone: varchar("phone"),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("ZAR"),
  invoiceTermsDays: integer("invoice_terms_days").notNull().default(30),
  nextInvoiceSeq: integer("next_invoice_seq").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
export type Org = typeof orgsTable.$inferSelect;
export type InsertOrg = typeof orgsTable.$inferInsert;

export const orgMembersTable = pgTable(
  "org_members",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 30 }).notNull().default("transport_manager"),
    displayName: varchar("display_name"),
    phone: varchar("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("org_members_org_user_idx").on(t.orgId, t.userId)],
);
export type OrgMember = typeof orgMembersTable.$inferSelect;

export const fxRatesTable = pgTable(
  "fx_rates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).notNull(),
    rateToBase: numeric("rate_to_base", { precision: 18, scale: 6 }).notNull(),
    asOf: date("as_of").notNull(),
  },
  (t) => [index("fx_rates_org_currency_idx").on(t.orgId, t.currency)],
);
export type FxRate = typeof fxRatesTable.$inferSelect;

export const trucksTable = pgTable(
  "trucks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    fleetNo: varchar("fleet_no").notNull(),
    registrationNo: varchar("registration_no").notNull(),
    registrationCountry: varchar("registration_country", { length: 3 }),
    vehicleType: varchar("vehicle_type").notNull().default("truck_tractor_horse"),
    gvmClass: varchar("gvm_class").notNull().default("class2_gt20t"),
    status: varchar("status").notNull().default("idle"),
    odometerKm: numeric("odometer_km", { precision: 12, scale: 1 }),
    avgConsumptionLPer100km: numeric("avg_consumption_l_per_100km", { precision: 8, scale: 2 }).notNull().default("35"),
    driverId: varchar("driver_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("trucks_org_idx").on(t.orgId)],
);
export type Truck = typeof trucksTable.$inferSelect;

export const driversTable = pgTable(
  "drivers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    phone: varchar("phone"),
    nationality: varchar("nationality", { length: 3 }),
    passportNo: varchar("passport_no"),
    status: varchar("status").notNull().default("available"),
    loadsCompleted: integer("loads_completed").notNull().default(0),
    linkedUserId: varchar("linked_user_id").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("drivers_org_idx").on(t.orgId)],
);
export type Driver = typeof driversTable.$inferSelect;

export const loadsTable = pgTable(
  "loads",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    consignmentNo: varchar("consignment_no").notNull(),
    customer: varchar("customer").notNull(),
    originCity: varchar("origin_city").notNull(),
    destCity: varchar("dest_city").notNull(),
    corridor: varchar("corridor"),
    borderPosts: jsonb("border_posts").$type<string[]>().default([]),
    distanceKm: numeric("distance_km", { precision: 10, scale: 1 }),
    cargoDesc: text("cargo_desc"),
    cargoWeightKg: numeric("cargo_weight_kg", { precision: 10, scale: 1 }),
    customsRef: varchar("customs_ref"),
    rate: numeric("rate", { precision: 16, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("ZAR"),
    pickupDate: date("pickup_date"),
    deliveredDate: date("delivered_date"),
    truckId: varchar("truck_id").references(() => trucksTable.id),
    status: varchar("status").notNull().default("unassigned"),
    onTime: boolean("on_time"),
    podUrl: text("pod_url"),
    invoiceNumber: varchar("invoice_number"),
    invoiceStatus: varchar("invoice_status").notNull().default("open"),
    invoiceDate: date("invoice_date"),
    dueDate: date("due_date"),
    paidDate: date("paid_date"),
    invoicePdfUrl: text("invoice_pdf_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("loads_org_idx").on(t.orgId), index("loads_truck_idx").on(t.truckId)],
);
export type Load = typeof loadsTable.$inferSelect;

export const tripsTable = pgTable(
  "trips",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    truckId: varchar("truck_id").references(() => trucksTable.id),
    driverId: varchar("driver_id").references(() => driversTable.id),
    tripDate: date("trip_date"),
    status: varchar("status").notNull().default("planned"),
    advanceTotal: numeric("advance_total", { precision: 16, scale: 2 }),
    advanceCurrency: varchar("advance_currency", { length: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("trips_org_idx").on(t.orgId)],
);
export type Trip = typeof tripsTable.$inferSelect;

export const tripStopsTable = pgTable(
  "trip_stops",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tripId: varchar("trip_id")
      .notNull()
      .references(() => tripsTable.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    place: varchar("place").notNull(),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    country: varchar("country", { length: 3 }),
    stopType: varchar("stop_type").notNull().default("border"),
  },
  (t) => [index("trip_stops_trip_idx").on(t.tripId)],
);
export type TripStop = typeof tripStopsTable.$inferSelect;

export const disbursementsTable = pgTable(
  "disbursements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tripId: varchar("trip_id")
      .notNull()
      .references(() => tripsTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    borderPost: varchar("border_post"),
    country: varchar("country", { length: 3 }).notNull(),
    chargeType: varchar("charge_type").notNull(),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    paidBy: varchar("paid_by").notNull().default("driver_advance"),
    receiptUrl: text("receipt_url"),
    notes: text("notes"),
    amountInBase: numeric("amount_in_base", { precision: 16, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("disbursements_trip_idx").on(t.tripId)],
);
export type Disbursement = typeof disbursementsTable.$inferSelect;

export const complianceDocsTable = pgTable(
  "compliance_docs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type").notNull(),
    entityId: varchar("entity_id").notNull(),
    docType: varchar("doc_type").notNull(),
    docNumber: varchar("doc_number"),
    issuer: varchar("issuer"),
    country: varchar("country", { length: 3 }),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date").notNull(),
    fileUrl: text("file_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("compliance_docs_org_idx").on(t.orgId),
    index("compliance_docs_entity_idx").on(t.entityType, t.entityId),
  ],
);
export type ComplianceDoc = typeof complianceDocsTable.$inferSelect;

export const fuelPurchasesTable = pgTable(
  "fuel_purchases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    truckId: varchar("truck_id")
      .notNull()
      .references(() => trucksTable.id),
    date: date("date").notNull(),
    country: varchar("country", { length: 3 }).notNull(),
    litres: numeric("litres", { precision: 10, scale: 2 }).notNull(),
    pricePerLitre: numeric("price_per_litre", { precision: 10, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fuel_purchases_org_idx").on(t.orgId)],
);
export type FuelPurchase = typeof fuelPurchasesTable.$inferSelect;

export const borderChargeCatalogTable = pgTable(
  "border_charge_catalog",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: varchar("org_id")
      .notNull()
      .references(() => orgsTable.id, { onDelete: "cascade" }),
    borderPost: varchar("border_post").notNull(),
    country: varchar("country", { length: 3 }).notNull(),
    chargeType: varchar("charge_type").notNull(),
    defaultAmount: numeric("default_amount", { precision: 16, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    appliesTo: varchar("applies_to").notNull().default("combination"),
  },
  (t) => [index("border_charge_catalog_org_idx").on(t.orgId)],
);
export type BorderChargeCatalog = typeof borderChargeCatalogTable.$inferSelect;
