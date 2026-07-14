import {
  ForbiddenException,
  Inject,
  Injectable,
  type OnModuleDestroy,
} from "@nestjs/common";
import type {
  ActorRole,
  ActorSnapshot,
  InternalActorSnapshot,
} from "@toprent/contracts";
import {
  type DbSessionScope,
  applyDbSessionScope,
  createDb,
  createDbPool,
  createDbSessionScope,
} from "@toprent/db";
import { apiConfig } from "../../config/api.config";
import { AppLogger } from "../../runtime/logging/app-logger";
import { readRequestActorSnapshot } from "../../runtime/request/request-context";
import { RequestContextStore } from "../../runtime/request/request-context-store";

interface ResolveInternalWriteActorParams {
  userId: string;
  targetTenantId: string | null;
  targetPartnerId: string | null;
}

interface ResolveInternalWriteActorRow {
  user_id: string;
  role: ActorRole;
  tenant_id: string | null;
  partner_id: string | null;
}

type DbTransactionClient = Parameters<typeof applyDbSessionScope>[0];

interface MutationResultLike {
  rowCount: number | null;
}

type WriteDb = ReturnType<typeof createDb> & {
  expectMutation<T extends MutationResultLike>(
    result: T,
    operation: string,
    expectedRowCount?: number,
  ): T;
};

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = createDbPool(apiConfig.databaseUrl);

  @Inject(AppLogger)
  private readonly logger!: AppLogger;

  @Inject(RequestContextStore)
  private readonly requestContextStore!: RequestContextStore;

  async ping() {
    await this.pool.query("select 1");
  }

  async resolvePublicTenantBySlug(slug: string) {
    const result = await this.pool.query<{ tenant_id: string | null }>(
      "select app.resolve_public_tenant_id($1) as tenant_id",
      [slug],
    );

    return result.rows[0]?.tenant_id ?? null;
  }

  async runWriteAction<T>(
    params: ResolveInternalWriteActorParams,
    run: (db: WriteDb) => Promise<T>,
  ) {
    return this.withClient((client) =>
      this.runInTransaction(client, async () => {
        const scope = await this.resolveLiveWriteScope(client, params);

        if (!scope) {
          throw new ForbiddenException({
            code: "forbidden",
            message: "Write access denied",
          });
        }

        await applyDbSessionScope(client, scope);
        return run(this.createWriteDb(client));
      }),
    );
  }

  async transaction<T>(
    run: (db: ReturnType<typeof createDb>) => Promise<T>,
    scope = this.readSessionScope(),
  ) {
    return this.withClient((client) =>
      this.runInTransaction(client, async () => {
        await applyDbSessionScope(client, scope);
        return run(createDb(client));
      }),
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private readActorSnapshot(): ActorSnapshot {
    return readRequestActorSnapshot(this.requestContextStore.get());
  }

  private readSessionScope(): DbSessionScope {
    return createDbSessionScope(this.readActorSnapshot());
  }

  private async resolveLiveWriteScope(
    client: DbTransactionClient,
    params: ResolveInternalWriteActorParams,
  ): Promise<InternalActorSnapshot | null> {
    const result = await client.query<ResolveInternalWriteActorRow>(
      "select * from app.resolve_internal_write_actor($1, $2, $3)",
      [params.userId, params.targetTenantId, params.targetPartnerId],
    );
    const row = result.rows[0];

    return row ? this.buildInternalActorSnapshot(row) : null;
  }

  private buildInternalActorSnapshot(
    row: ResolveInternalWriteActorRow,
  ): InternalActorSnapshot {
    switch (row.role) {
      case "platform":
        if (row.partner_id && !row.tenant_id) {
          throw new Error("Platform partner context is missing tenant_id");
        }

        return {
          actorKind: "internal",
          userId: row.user_id,
          role: row.role,
          tenantId: row.tenant_id,
          partnerId: row.partner_id,
        };
      case "tenant":
        if (!row.tenant_id) {
          throw new Error("Tenant write scope is missing tenant_id");
        }

        return {
          actorKind: "internal",
          userId: row.user_id,
          role: row.role,
          tenantId: row.tenant_id,
          partnerId: null,
        };
      case "partner":
        if (!row.tenant_id || !row.partner_id) {
          throw new Error(
            "Partner write scope is missing tenant_id or partner_id",
          );
        }

        return {
          actorKind: "internal",
          userId: row.user_id,
          role: row.role,
          tenantId: row.tenant_id,
          partnerId: row.partner_id,
        };
      default: {
        const unsupportedRole: never = row.role;
        throw new Error(`Unsupported actor role: ${unsupportedRole}`);
      }
    }
  }

  private createWriteDb(client: DbTransactionClient): WriteDb {
    const db = createDb(client);

    return Object.assign(db, {
      expectMutation: <T extends MutationResultLike>(
        result: T,
        operation: string,
        expectedRowCount = 1,
      ) => {
        this.assertMutation(result, operation, expectedRowCount);
        return result;
      },
    });
  }

  private assertMutation(
    result: MutationResultLike,
    operation: string,
    expectedRowCount: number,
  ) {
    const actualRowCount = result.rowCount;

    if (actualRowCount === expectedRowCount) {
      return;
    }

    this.logger.error("db.write_invariant_failed", {
      operation,
      expectedRowCount,
      actualRowCount,
    });

    throw new Error(
      `Write invariant failed for "${operation}": expected ${expectedRowCount} affected row(s), got ${actualRowCount ?? "null"}.`,
    );
  }

  private async runInTransaction<T>(
    client: DbTransactionClient,
    run: () => Promise<T>,
  ) {
    await client.query("begin");

    try {
      const result = await run();
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  private async withClient<T>(
    run: (client: DbTransactionClient) => Promise<T>,
  ) {
    const client = await this.pool.connect();

    try {
      return await run(client);
    } finally {
      client.release();
    }
  }
}
