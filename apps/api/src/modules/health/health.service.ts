import { Injectable } from "@nestjs/common";
import type { HealthResponse } from "@toprent/contracts/health";

@Injectable()
export class HealthService {
  private createResponse(service: string): HealthResponse {
    return {
      service,
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return this.createResponse("api");
  }

  getLiveness() {
    return this.createResponse("api-live");
  }

  getReadiness() {
    return this.createResponse("api-ready");
  }
}
