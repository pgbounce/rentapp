import { z } from "zod";
import { type BaseEnv, baseEnvSchema, resolveBaseEnv } from "./base";

const defaultCorsAllowedOrigins = ["http://localhost:3000"];

const apiEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default("api/v1"),
  CORS_ALLOWED_ORIGINS: z.string().trim().optional(),
});

type ApiEnvInput = z.infer<typeof apiEnvSchema>;

export interface ApiEnv extends BaseEnv {
  API_PORT: number;
  API_PREFIX: string;
  CORS_ALLOWED_ORIGINS: string[];
}

function normalizeOrigin(origin: string) {
  const url = new URL(origin);

  return url.origin;
}

function resolveCorsAllowedOrigins(env: ApiEnvInput) {
  const origins =
    env.CORS_ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0) ?? [];

  if (origins.length > 0) {
    return [...new Set(origins.map(normalizeOrigin))];
  }

  if (env.NODE_ENV === "production") {
    throw new Error("CORS_ALLOWED_ORIGINS must be set in production");
  }

  return [...new Set(defaultCorsAllowedOrigins.map(normalizeOrigin))];
}

export function readApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = apiEnvSchema.parse(env);

  return {
    ...resolveBaseEnv(parsed),
    API_PORT: parsed.API_PORT,
    API_PREFIX: parsed.API_PREFIX,
    CORS_ALLOWED_ORIGINS: resolveCorsAllowedOrigins(parsed),
  };
}
