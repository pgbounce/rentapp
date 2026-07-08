import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ApiErrorDetail } from "@toprent/contracts/api";
import type { HealthCheck, HealthResponse } from "@toprent/contracts/health";
import { DbService } from "../../infrastructure/db/db.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

@Injectable()
export class HealthService {
  @Inject(DbService)
  private readonly dbService!: DbService;

  @Inject(RedisService)
  private readonly redisService!: RedisService;

  private createResponse(
    service: string,
    checks?: HealthCheck[],
  ): HealthResponse {
    return {
      service,
      status: "ok",
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  getHealth() {
    return this.createResponse("api");
  }

  getLiveness() {
    return this.createResponse("api-live");
  }

  getReadiness() {
    return this.createReadinessResponse("api-ready");
  }

  private async createReadinessResponse(service: string) {
    const dependencyResults = await Promise.allSettled([
      this.dbService.ping(),
      this.redisService.ping(),
    ]);
    const checks: HealthCheck[] = [];
    const details: ApiErrorDetail[] = [];

    if (dependencyResults[0].status === "fulfilled") {
      checks.push({ name: "postgres", status: "ok" });
    } else {
      details.push({
        code: "dependency_unavailable",
        message: "postgres is not ready",
      });
    }

    if (dependencyResults[1].status === "fulfilled") {
      checks.push({ name: "redis", status: "ok" });
    } else {
      details.push({
        code: "dependency_unavailable",
        message: "redis is not ready",
      });
    }

    if (details.length > 0) {
      throw new ServiceUnavailableException({
        code: "service_unavailable",
        message: "API dependencies are not ready",
        details,
      });
    }

    return this.createResponse(service, checks);
  }
}
