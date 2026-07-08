import { readApiEnv } from "@toprent/config/api";

const env = readApiEnv();

export const apiConfig = {
  nodeEnv: env.NODE_ENV,
  apiPort: env.API_PORT,
  apiPrefix: env.API_PREFIX,
  corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
} as const;
