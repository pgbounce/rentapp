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

export const tenantKindEnum = pgEnum("tenant_kind", ["platform", "client"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "inactive"]);
export const partnerStatusEnum = pgEnum("partner_status", [
  "active",
  "inactive",
]);

export const tenants = pgTable(
  "tenants",
  {
    id: primaryId(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    kind: tenantKindEnum("kind").notNull().default("client"),
    status: tenantStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("tenants_slug_unique").on(table.slug),
    check(
      "tenants_slug_format_check",
      sql`"slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const partners = pgTable(
  "partners",
  {
    id: primaryId(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    status: partnerStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    index("partners_tenant_id_idx").on(table.tenantId),
    uniqueIndex("partners_tenant_slug_unique").on(table.tenantId, table.slug),
    uniqueIndex("partners_tenant_id_id_unique").on(table.tenantId, table.id),
    check(
      "partners_slug_format_check",
      sql`"slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);
