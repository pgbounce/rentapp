import { Module } from "@nestjs/common";
import { RuntimeModule } from "../../runtime/runtime.module";
import { DbService } from "./db.service";

@Module({
  imports: [RuntimeModule],
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
