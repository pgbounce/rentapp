import { z } from "zod";

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/toprent"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});
