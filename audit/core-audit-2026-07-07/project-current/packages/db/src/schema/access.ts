import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./shared";
import { partners, tenants } from "./tenancy";

export const userStatusEnum = pgEnum("user_status", [
  "invited",
  "active",
  "suspended",
]);
export const membershipScopeEnum = pgEnum("membership_scope", [
  "platform",
  "tenant",
  "partner",
]);
export const membershipRoleEnum = pgEnum("membership_role", [
  "platform",
  "tenant",
  "partner",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "disabled",
]);

export const users = pgTable(
  "users",
  {
    id: primaryId(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 120 }),
    status: userStatusEnum("status").notNull().default("invited"),
    ...timestamps(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const userCredentials = pgTable("user_credentials", {
  userId: uuid("user_id")
    .notNull()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  ...timestamps(),
});

// memberships_actor_scope_unique lives in SQL because this Drizzle version
// cannot express UNIQUE NULLS NOT DISTINCT in the schema builder.
export const memberships = pgTable(
  "memberships",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    partnerId: uuid("partner_id"),
    scope: membershipScopeEnum("scope").notNull(),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("invited"),
    ...timestamps(),
  },
  (table) => [
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_tenant_id_idx").on(table.tenantId),
    index("memberships_partner_id_idx").on(table.partnerId),
    foreignKey({
      columns: [table.tenantId, table.partnerId],
      foreignColumns: [partners.tenantId, partners.id],
      name: "memberships_partner_tenant_fk",
    }).onDelete("cascade"),
    check(
      "memberships_scope_check",
      sql`(
        ("scope" = 'platform' and "tenant_id" is null and "partner_id" is null)
        or ("scope" = 'tenant' and "tenant_id" is not null and "partner_id" is null)
        or ("scope" = 'partner' and "tenant_id" is not null and "partner_id" is not null)
      )`,
    ),
    check(
      "memberships_role_scope_match_check",
      sql`"scope"::text = "role"::text`,
    ),
  ],
);
