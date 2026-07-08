import { z } from "zod";
import { type BaseEnv, baseEnvSchema, resolveBaseEnv } from "./base";

const workerEnvSchema = baseEnvSchema.extend({
  WORKER_NAME: z.string().default("toprent-worker"),
});

type WorkerEnvInput = z.infer<typeof workerEnvSchema>;

export interface WorkerEnv extends BaseEnv {
  WORKER_NAME: string;
}

export function readWorkerEnv(env: NodeJS.ProcessEnv = process.env) {
  const parsed = workerEnvSchema.parse(env);

  return {
    ...resolveBaseEnv(parsed),
    WORKER_NAME: parsed.WORKER_NAME,
  };
}
