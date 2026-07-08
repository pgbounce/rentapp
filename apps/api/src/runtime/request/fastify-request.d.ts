import "fastify";
import type { RequestContextValue } from "./request-context";

declare module "fastify" {
  interface FastifyRequest {
    requestContext: RequestContextValue;
    requestStartedAt: number;
  }
}
