import { Module } from "@nestjs/common";
import { HttpExceptionFilter } from "./http/http-exception.filter";
import { AppLogger } from "./logging/app-logger";
import { RequestContextStore } from "./request/request-context-store";

@Module({
  providers: [RequestContextStore, AppLogger, HttpExceptionFilter],
  exports: [RequestContextStore, AppLogger, HttpExceptionFilter],
})
export class RuntimeModule {}
