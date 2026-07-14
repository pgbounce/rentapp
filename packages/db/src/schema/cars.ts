import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { primaryId, timestamps } from "./shared";
import { partners, tenants } from "./tenancy";

export const carStatusEnum = pgEnum("car_status", [
  "draft",
  "active",
  "inactive",
]);
export const carTransmissionEnum = pgEnum("car_transmission", [
  "manual",
  "automatic",
]);
export const carFuelTypeEnum = pgEnum("car_fuel_type", [
  "petrol",
  "diesel",
  "hybrid",
  "plug_in_hybrid",
  "electric",
  "lpg",
]);
export const carLocationKindEnum = pgEnum("car_location_kind", [
  "pickup",
  "return",
  "both",
]);

export const cars = pgTable(
  "cars",
  {
    id: primaryId(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id"),
    slug: varchar("slug", { length: 80 }).notNull(),
    brand: varchar("brand", { length: 80 }).notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    productionYear: integer("production_year").notNull(),
    transmission: carTransmissionEnum("transmission").notNull(),
    fuelType: carFuelTypeEnum("fuel_type").notNull(),
    seatCount: integer("seat_count").notNull(),
    doorCount: integer("door_count").notNull(),
    luggageCount: integer("luggage_count").notNull(),
    status: carStatusEnum("status").notNull().default("draft"),
    ...timestamps(),
  },
  (table) => [
    index("cars_tenant_id_idx").on(table.tenantId),
    index("cars_tenant_partner_id_idx").on(table.tenantId, table.partnerId),
    uniqueIndex("cars_tenant_slug_unique").on(table.tenantId, table.slug),
    uniqueIndex("cars_tenant_id_id_unique").on(table.tenantId, table.id),
    check("cars_slug_format_check", sql`"slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check(
      "cars_production_year_check",
      sql`"production_year" between 1886 and 2100`,
    ),
    check("cars_seat_count_check", sql`"seat_count" > 0`),
    check("cars_door_count_check", sql`"door_count" > 0`),
    check("cars_luggage_count_check", sql`"luggage_count" >= 0`),
    foreignKey({
      columns: [table.tenantId, table.partnerId],
      foreignColumns: [partners.tenantId, partners.id],
      name: "cars_partner_tenant_fk",
    }).onDelete("no action"),
  ],
);

export const carLocations = pgTable(
  "car_locations",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carId: uuid("car_id").notNull(),
    locationId: uuid("location_id").notNull(),
    kind: carLocationKindEnum("kind").notNull().default("both"),
  },
  (table) => [
    primaryKey({
      name: "car_locations_pk",
      columns: [table.tenantId, table.carId, table.locationId],
    }),
    index("car_locations_location_id_idx").on(table.tenantId, table.locationId),
    foreignKey({
      columns: [table.tenantId, table.carId],
      foreignColumns: [cars.tenantId, cars.id],
      name: "car_locations_car_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tenantId, table.locationId],
      foreignColumns: [locations.tenantId, locations.id],
      name: "car_locations_location_tenant_fk",
    }).onDelete("cascade"),
  ],
);
