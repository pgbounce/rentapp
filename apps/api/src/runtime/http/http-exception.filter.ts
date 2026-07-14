import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppLogger } from "../logging/app-logger";
import { formatApiError } from "./format-api-error";

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  @Inject(AppLogger)
  private readonly logger!: AppLogger;

  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const requestId =
      request.requestContext?.requestId ??
      String(reply.getHeader("x-request-id") ?? "unknown");
    const { statusCode, body } = formatApiError(error, requestId);
    const rawErrorDetails =
      error instanceof Error && !(error instanceof HttpException)
        ? {
            rawErrorName: error.name,
            rawErrorMessage: error.message,
            rawErrorStack: error.stack,
          }
        : {};

    this.logger.error("http.error", {
      method: request.method,
      path: request.url,
      requestId,
      requestMode: request.requestMode ?? request.requestContext?.requestMode,
      statusCode,
      errorCode: body.error.code,
      message: body.error.message,
      isHttpException: error instanceof HttpException,
      ...rawErrorDetails,
    });

    reply.status(statusCode).send(body);
  }
}
