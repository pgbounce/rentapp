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
    const actor = context?.actor;
    const fallbackRequestId =
      typeof data.requestId === "string" ? data.requestId : null;
    const fallbackRequestMode =
      typeof data.requestMode === "string" ? data.requestMode : null;
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      level,
      event,
      requestId: context?.requestId ?? fallbackRequestId,
      requestMode: context?.requestMode ?? fallbackRequestMode,
      actorKind: actor?.actorKind ?? "anonymous",
      resolvedTenantId:
        context?.requestMode === "public" ? context.resolvedTenantId : null,
      userId: actor?.actorKind === "internal" ? actor.userId : null,
      customerId: actor?.actorKind === "customer" ? actor.customerId : null,
      actorTenantId:
        actor && actor.actorKind !== "anonymous" ? actor.tenantId : null,
      partnerId: actor?.actorKind === "internal" ? actor.partnerId : null,
    });

    if (level === "error") {
      console.error(message);
      return;
    }

    console.log(message);
  }
}
