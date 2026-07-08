import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import type { RequestContextValue } from "./request-context";

@Injectable()
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<RequestContextValue>();

  run<T>(requestContext: RequestContextValue, callback: () => T) {
    return this.storage.run(requestContext, callback);
  }

  get() {
    return this.storage.getStore();
  }
}
