import "reflect-metadata";
import { createApp } from "./bootstrap/create-app";
import { apiConfig } from "./config/api.config";
import { AppLogger } from "./runtime/logging/app-logger";

async function bootstrap() {
  const app = await createApp();

  await app.listen(apiConfig.apiPort, "0.0.0.0");
  app.get(AppLogger).info("api.started", {
    nodeEnv: apiConfig.nodeEnv,
    port: apiConfig.apiPort,
    prefix: apiConfig.apiPrefix,
  });
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
