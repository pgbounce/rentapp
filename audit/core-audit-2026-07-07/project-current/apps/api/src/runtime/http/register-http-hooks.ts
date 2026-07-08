import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { DbService } from "../../infrastructure/db/db.service";
import type { AppLogger } from "../logging/app-logger";
import { createSystemRequestContext } from "../request/request-context";
import type { RequestContextStore } from "../request/request-context-store";
import { resolveRequestContext } from "../request/tenant-resolver";

export function registerHttpHooks(
  server: FastifyInstance,
  requestContextStore: RequestContextStore,
  dbService: DbService,
  logger: AppLogger,
) {
  server.addHook(
    "onRequest",
    (
      request: FastifyRequest,
      reply: FastifyReply,
      done: (error?: Error) => void,
    ) => {
      const requestIdHeader = request.headers["x-request-id"];
      const requestId =
        typeof requestIdHeader === "string" && requestIdHeader.length > 0
          ? requestIdHeader
          : randomUUID();
      request.requestStartedAt = Date.now();
      reply.header("x-request-id", requestId);
      request.requestContext = createSystemRequestContext(requestId);

      void (async () => {
        try {
          const requestContext = await resolveRequestContext(
            requestId,
            request,
            dbService,
          );

          request.requestContext = requestContext;
          requestContextStore.run(requestContext, done);
        } catch (error) {
          done(
            error instanceof Error
              ? error
              : new Error("request bootstrap failed"),
          );
        }
      })();
    },
  );

  server.addHook(
    "onResponse",
    (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
      logger.info("http.response", {
        method: request.method,
        path: request.url,
        requestId: request.requestContext.requestId,
        requestMode: request.requestContext.requestMode,
        statusCode: reply.statusCode,
        durationMs: Date.now() - request.requestStartedAt,
      });

      done();
    },
  );
}
