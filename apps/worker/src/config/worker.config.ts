export const workerConfig = {
  name: process.env.WORKER_NAME ?? "toprent-worker",
  nodeEnv: process.env.NODE_ENV ?? "development",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
} as const;
