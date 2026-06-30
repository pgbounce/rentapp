import { workerConfig } from "./config/worker.config";
import { queueNames } from "./queues/queue.constants";

function bootWorker() {
  console.log(
    `[${workerConfig.name}] ready in ${workerConfig.nodeEnv} for queues: ${queueNames.system}`,
  );
}

bootWorker();
setInterval(() => undefined, 60_000);
