import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./shared";
import { tenants } from "./tenancy";

export const locationStatusEnum = pgEnum("location_status", [
  "active",
  "inactive",
]);

export const locations = pgTable(
  "locations",
  {
    id: primaryId(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    addressLine1: varchar("address_line_1", { length: 160 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    status: locationStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    index("locations_tenant_id_idx").on(table.tenantId),
    uniqueIndex("locations_tenant_slug_unique").on(table.tenantId, table.slug),
    uniqueIndex("locations_tenant_id_id_unique").on(table.tenantId, table.id),
    check(
      "locations_slug_format_check",
      sql`"slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);
