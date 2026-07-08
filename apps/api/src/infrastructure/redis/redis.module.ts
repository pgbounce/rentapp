import { Module } from "@nestjs/common";
import { RuntimeModule } from "../../runtime/runtime.module";
import { RedisService } from "./redis.service";

@Module({
  imports: [RuntimeModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
