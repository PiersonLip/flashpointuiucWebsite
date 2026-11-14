import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AvailabilityRange } from "@/lib/availability";

export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "digital",
  "film",
  "lens",
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "available",
  "requested",
  "reserved",
  "checked_out",
  "repair",
  "retired",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "denied",
  "cancelled",
]);

export const rentalStatusEnum = pgEnum("rental_status", [
  "active",
  "overdue",
  "returned",
]);

export const extensionStatusEnum = pgEnum("extension_status", [
  "auto_approved",
  "pending",
  "approved",
  "denied",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  netid: text("netid").notNull().unique(),
  /** Paid club dues (self-reported at signup; managers can correct). */
  isMember: boolean("is_member").notNull().default(false),
  isManager: boolean("is_manager").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    issuer: text("issuer").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("account_issuer_account_id").on(t.issuer, t.accountId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const equipment = pgTable("equipment", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: equipmentCategoryEnum("category").notNull(),
  subcategory: text("subcategory").notNull(),
  assetTag: text("asset_tag"),
  notes: text("notes"),
  status: equipmentStatusEnum("status").notNull().default("available"),
  createdById: text("created_by_id").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rentalRequests = pgTable("rental_requests", {
  id: text("id").primaryKey(),
  equipmentId: text("equipment_id")
    .notNull()
    .references(() => equipment.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  status: requestStatusEnum("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  preferredPickupAt: timestamp("preferred_pickup_at"),
  preferredReturnAt: timestamp("preferred_return_at"),
  /** When2Meet-style windows the renter is free for pickup */
  pickupAvailability: jsonb("pickup_availability").$type<AvailabilityRange[]>().default([]),
  /** When2Meet-style windows the renter is free for return */
  returnAvailability: jsonb("return_availability").$type<AvailabilityRange[]>().default([]),
  requestedDays: integer("requested_days").notNull().default(7),
  renterNotes: text("renter_notes"),
  needsTraining: boolean("needs_training").notNull().default(false),
  decidedById: text("decided_by_id").references(() => user.id),
  decidedAt: timestamp("decided_at"),
  note: text("note"),
});

export const rentals = pgTable("rentals", {
  id: text("id").primaryKey(),
  equipmentId: text("equipment_id")
    .notNull()
    .references(() => equipment.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  requestId: text("request_id").references(() => rentalRequests.id),
  pickedUpAt: timestamp("picked_up_at"),
  dueAt: timestamp("due_at"),
  returnedAt: timestamp("returned_at"),
  /** Renter-proposed times for coordinating with managers */
  scheduledPickupAt: timestamp("scheduled_pickup_at"),
  scheduledReturnAt: timestamp("scheduled_return_at"),
  pickupAvailability: jsonb("pickup_availability").$type<AvailabilityRange[]>().default([]),
  returnAvailability: jsonb("return_availability").$type<AvailabilityRange[]>().default([]),
  extensionCount: integer("extension_count").notNull().default(0),
  /** Set when a due-soon reminder was emailed (avoids cron spam). */
  dueSoonSentAt: timestamp("due_soon_sent_at"),
  status: rentalStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Permanent audit of completed rentals — never purged with Drive backup rotation */
export const rentalHistory = pgTable("rental_history", {
  id: text("id").primaryKey(),
  rentalId: text("rental_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  equipmentName: text("equipment_name").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  userNetid: text("user_netid").notNull(),
  pickedUpAt: timestamp("picked_up_at"),
  dueAt: timestamp("due_at"),
  returnedAt: timestamp("returned_at"),
  extensionCount: integer("extension_count").notNull().default(0),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const extensionRequests = pgTable("extension_requests", {
  id: text("id").primaryKey(),
  rentalId: text("rental_id")
    .notNull()
    .references(() => rentals.id),
  status: extensionStatusEnum("status").notNull(),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  decidedById: text("decided_by_id").references(() => user.id),
  decidedAt: timestamp("decided_at"),
});

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: text("id").primaryKey(),
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => equipment.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    notifiedAt: timestamp("notified_at"),
    /** When set, this person has a 24h exclusive claim window */
    offerExpiresAt: timestamp("offer_expires_at"),
  },
  (t) => [uniqueIndex("waitlist_equipment_user").on(t.equipmentId, t.userId)],
);

export const managerPromotions = pgTable("manager_promotions", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  promotedUserId: text("promoted_user_id").references(() => user.id),
  promotedById: text("promoted_by_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Public marketing site — executive board roster */
export const boardMembers = pgTable("board_members", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Public marketing site — community gallery */
export const galleryPhotos = pgTable("gallery_photos", {
  id: text("id").primaryKey(),
  src: text("src").notNull(),
  alt: text("alt").notNull().default(""),
  photographer: text("photographer"),
  caption: text("caption"),
  event: text("event"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
