export * from "./shared";
export * from "./tenancy";
export * from "./access";
export * from "./locations";
export * from "./cars";

import { memberships, userCredentials, users } from "./access";
import { carLocations, cars } from "./cars";
import { locations } from "./locations";
import { partners, tenants } from "./tenancy";

export const schema = {
  tenants,
  partners,
  users,
  userCredentials,
  memberships,
  locations,
  cars,
  carLocations,
};
