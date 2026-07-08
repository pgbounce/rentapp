import { readWorkerEnv } from "@toprent/config/worker";

const env = readWorkerEnv();

export const workerConfig = {
  name: env.WORKER_NAME,
  nodeEnv: env.NODE_ENV,
  redisUrl: env.REDIS_URL,
} as const;
