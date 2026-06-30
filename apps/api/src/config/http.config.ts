export const httpConfig = {
  apiPort: Number(process.env.API_PORT ?? 3001),
  apiPrefix: process.env.API_PREFIX ?? "api/v1",
  webAppUrl: process.env.WEB_APP_URL ?? "http://localhost:3000",
} as const;
