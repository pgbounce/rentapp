import { z } from "zod";
import { baseEnvSchema } from "./base";

const apiEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default("api/v1"),
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function readApiEnv(env: NodeJS.ProcessEnv = process.env) {
  return apiEnvSchema.parse(env);
}
