import { z } from "zod";

const defaultDatabaseUrl =
  "postgresql://toprent_app:toprent_app@localhost:5432/toprent";
const defaultRedisUrl = "redis://localhost:6379";

export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().trim().optional(),
  REDIS_URL: z.string().trim().optional(),
});

type BaseEnvInput = z.infer<typeof baseEnvSchema>;

export interface BaseEnv {
  NODE_ENV: BaseEnvInput["NODE_ENV"];
  DATABASE_URL: string;
  REDIS_URL: string;
}

function resolveRuntimeUrl(
  name: string,
  value: string | undefined,
  nodeEnv: BaseEnv["NODE_ENV"],
  fallbackValue: string,
) {
  if (value && value.length > 0) {
    return value;
  }

  if (nodeEnv === "production") {
    throw new Error(`${name} must be set in production`);
  }

  return fallbackValue;
}

export function resolveBaseEnv(env: BaseEnvInput): BaseEnv {
  return {
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: resolveRuntimeUrl(
      "DATABASE_URL",
      env.DATABASE_URL,
      env.NODE_ENV,
      defaultDatabaseUrl,
    ),
    REDIS_URL: resolveRuntimeUrl(
      "REDIS_URL",
      env.REDIS_URL,
      env.NODE_ENV,
      defaultRedisUrl,
    ),
  };
}

export function readBaseEnv(env: NodeJS.ProcessEnv = process.env) {
  return resolveBaseEnv(baseEnvSchema.parse(env));
}
