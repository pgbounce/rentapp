import { z } from "zod";
import { baseEnvSchema } from "./base";

const workerEnvSchema = baseEnvSchema.extend({
  WORKER_NAME: z.string().default("toprent-worker"),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function readWorkerEnv(env: NodeJS.ProcessEnv = process.env) {
  return workerEnvSchema.parse(env);
}
