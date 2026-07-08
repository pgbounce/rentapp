import { HttpException } from "@nestjs/common";
import type { ApiErrorDetail, ApiErrorResponse } from "@toprent/contracts/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function defaultErrorCode(statusCode: number) {
  switch (statusCode) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "unprocessable_entity";
    case 429:
      return "too_many_requests";
    case 503:
      return "service_unavailable";
    default:
      return "internal_server_error";
  }
}

function readDetails(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const details = value
    .map<ApiErrorDetail | null>((item) => {
      if (typeof item === "string") {
        return {
          code: "error_detail",
          message: item,
        };
      }

      if (!isRecord(item)) {
        return null;
      }

      return {
        code: typeof item.code === "string" ? item.code : "error_detail",
        message:
          typeof item.message === "string"
            ? item.message
            : "Unknown error detail",
      };
    })
    .filter((item): item is ApiErrorDetail => item !== null);

  return details.length > 0 ? details : undefined;
}

function readMessage(value: unknown, fallbackMessage: string) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return fallbackMessage;
}

export function formatApiError(error: unknown, requestId: string) {
  if (error instanceof HttpException) {
    const statusCode = error.getStatus();
    const response = error.getResponse();
    const payload = isRecord(response) ? response : {};
    const fallbackMessage = error.message || "Request failed";

    return {
      statusCode,
      body: {
        error: {
          code:
            typeof payload.code === "string"
              ? payload.code
              : defaultErrorCode(statusCode),
          message: readMessage(payload.message ?? response, fallbackMessage),
          details: readDetails(payload.details ?? payload.message),
        },
        meta: {
          requestId,
        },
      } satisfies ApiErrorResponse,
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "internal_server_error",
        message: "Internal server error",
      },
      meta: {
        requestId,
      },
    } satisfies ApiErrorResponse,
  };
}
