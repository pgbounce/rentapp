import type { HealthResponse } from "@toprent/contracts/health";
import { fetchJson } from "./fetch-json";
import { publicEnv } from "../env/public-env";

export function getApiHealth() {
  return fetchJson<HealthResponse>(`${publicEnv.apiUrl}/health`);
}
