import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { httpConfig } from "./config/http.config";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: [httpConfig.webAppUrl],
    credentials: true,
  });

  app.setGlobalPrefix(httpConfig.apiPrefix);

  await app.listen(httpConfig.apiPort, "0.0.0.0");
}

void bootstrap();
