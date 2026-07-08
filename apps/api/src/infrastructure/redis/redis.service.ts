import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { createRedisConnection } from "@toprent/redis";
import { apiConfig } from "../../config/api.config";
import { AppLogger } from "../../runtime/logging/app-logger";

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit {
  private readonly client = createRedisConnection(apiConfig.redisUrl);

  @Inject(AppLogger)
  private readonly logger!: AppLogger;

  onModuleInit() {
    this.client.on("error", (error) => {
      this.logger.error("redis.error", {
        message: error instanceof Error ? error.message : "Unknown Redis error",
        status: this.client.status,
      });
    });
  }

  async ping() {
    if (this.client.status === "wait") {
      await this.client.connect();
    }

    if (this.client.status !== "ready") {
      throw new Error("redis is not ready");
    }

    await this.client.ping();
  }

  async onModuleDestroy() {
    if (this.client.status === "wait" || this.client.status === "end") {
      return;
    }

    if (this.client.status !== "ready") {
      this.client.disconnect();
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
