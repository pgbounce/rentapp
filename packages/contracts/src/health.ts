export type ServiceStatus = "ok";

export interface HealthResponse {
  service: string;
  status: ServiceStatus;
  timestamp: string;
}
