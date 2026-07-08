export type ServiceStatus = "ok";

export interface HealthCheck {
  name: string;
  status: ServiceStatus;
}

export interface HealthResponse {
  service: string;
  status: ServiceStatus;
  timestamp: string;
  checks?: HealthCheck[];
}
