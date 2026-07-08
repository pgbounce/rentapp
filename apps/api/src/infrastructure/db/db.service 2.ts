import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { ActorSnapshot } from "@toprent/contracts";
import {
  type DbSessionScope,
  applyDbSessionScope,
  createDb,
  createDbPool,
  createDbSessionScope,
} from "@toprent/db";
import { apiConfig } from "../../config/api.config";
import { RequestContextStore } from "../../runtime/request/request-context-store";

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = createDbPool(apiConfig.databaseUrl);

  @Inject(RequestContextStore)
  private readonly requestContextStore!: RequestContextStore;

  async ping() {
    await this.pool.query("select 1");
  }

  async transaction<T>(
    run: (db: ReturnType<typeof createDb>) => Promise<T>,
    scope = this.readSessionScope(),
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("begin");
      await applyDbSessionScope(client, scope);
      const db = createDb(client);
      const result = await run(db);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private readActorSnapshot(): ActorSnapshot {
    const context = this.requestContextStore.get();

    return {
      actorKind: context?.actorKind ?? "anonymous",
      userId: context?.userId ?? null,
      customerId: context?.customerId ?? null,
      customerAccountId: context?.customerAccountId ?? null,
      tenantId: context?.tenantId ?? null,
      partnerId: context?.partnerId ?? null,
      role: context?.role ?? null,
      capabilities: context?.capabilities ?? [],
    };
  }

  private readSessionScope(): DbSessionScope {
    return createDbSessionScope(this.readActorSnapshot());
  }
}
