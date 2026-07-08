import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppLogger } from "../logging/app-logger";
import { createRequestContext } from "../request/request-context";
import type { RequestContextStore } from "../request/request-context-store";

export function registerHttpHooks(
  server: FastifyInstance,
  requestContextStore: RequestContextStore,
  logger: AppLogger,
) {
  server.addHook(
    "onRequest",
    (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
      const requestIdHeader = request.headers["x-request-id"];
      const requestId =
        typeof requestIdHeader === "string" && requestIdHeader.length > 0
          ? requestIdHeader
          : randomUUID();
      const requestContext = createRequestContext(requestId);

      request.requestContext = requestContext;
      request.requestStartedAt = Date.now();

      reply.header("x-request-id", requestId);
      requestContextStore.run(requestContext, done);
    },
  );

  server.addHook(
    "onResponse",
    (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
      logger.info("http.response", {
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        durationMs: Date.now() - request.requestStartedAt,
      });

      done();
    },
  );
}
