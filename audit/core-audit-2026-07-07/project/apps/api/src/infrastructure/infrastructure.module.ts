import { Module } from "@nestjs/common";
import { RuntimeModule } from "../runtime/runtime.module";
import { DbModule } from "./db/db.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [RuntimeModule, DbModule, RedisModule],
  exports: [RuntimeModule, DbModule, RedisModule],
})
export class InfrastructureModule {}
