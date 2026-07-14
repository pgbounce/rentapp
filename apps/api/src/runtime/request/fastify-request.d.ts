import "fastify";
import type { RequestContextValue, RequestMode } from "./request-context";

declare module "fastify" {
  interface FastifyRequest {
    requestContext: RequestContextValue;
    requestMode: RequestMode;
    requestStartedAt: number;
  }
}
