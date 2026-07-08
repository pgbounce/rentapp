import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../app.module";
import { apiConfig } from "../config/api.config";
import { DbService } from "../infrastructure/db/db.service";
import { RedisService } from "../infrastructure/redis/redis.service";
import { HttpExceptionFilter } from "../runtime/http/http-exception.filter";
import { registerHttpHooks } from "../runtime/http/register-http-hooks";
import { AppLogger } from "../runtime/logging/app-logger";
import { RequestContextStore } from "../runtime/request/request-context-store";

export async function createApp() {
  const allowedOrigins = new Set(apiConfig.corsAllowedOrigins);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: false }),
    { logger: false },
  );

  app.enableShutdownHooks();
  app.enableCors({
    origin: (origin, callback) => {
      if (origin === undefined) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
  });
  app.setGlobalPrefix(apiConfig.apiPrefix);

  const dbService = app.get(DbService);
  app.get(RedisService);

  registerHttpHooks(
    app.getHttpAdapter().getInstance() as FastifyInstance,
    app.get(RequestContextStore),
    dbService,
    app.get(AppLogger),
  );

  app.useGlobalFilters(app.get(HttpExceptionFilter));

  return app;
}
