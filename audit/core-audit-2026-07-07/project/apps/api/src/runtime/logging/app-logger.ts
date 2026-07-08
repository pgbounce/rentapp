import { Inject, Injectable } from "@nestjs/common";
import { RequestContextStore } from "../request/request-context-store";

type LogLevel = "info" | "warn" | "error";

@Injectable()
export class AppLogger {
  @Inject(RequestContextStore)
  private readonly requestContextStore!: RequestContextStore;

  info(event: string, data: Record<string, unknown> = {}) {
    this.write("info", event, data);
  }

  warn(event: string, data: Record<string, unknown> = {}) {
    this.write("warn", event, data);
  }

  error(event: string, data: Record<string, unknown> = {}) {
    this.write("error", event, data);
  }

  private write(level: LogLevel, event: string, data: Record<string, unknown>) {
    const context = this.requestContextStore.get();
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      level,
      event,
      requestId: context?.requestId ?? null,
      actorKind: context?.actorKind ?? "anonymous",
      userId: context?.userId ?? null,
      customerId: context?.customerId ?? null,
      customerAccountId: context?.customerAccountId ?? null,
      tenantId: context?.tenantId ?? null,
      partnerId: context?.partnerId ?? null,
    });

    if (level === "error") {
      console.error(message);
      return;
    }

    console.log(message);
  }
}
