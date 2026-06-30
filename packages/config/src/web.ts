import { z } from "zod";

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001/api/v1"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function readWebEnv(env: NodeJS.ProcessEnv = process.env) {
  return webEnvSchema.parse(env);
}
