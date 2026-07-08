import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations/draft",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://toprent_app:toprent_app@localhost:5432/toprent",
  },
});
