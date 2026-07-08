import { createRedisConnection } from "@toprent/redis";
import { workerConfig } from "./config/worker.config";
import { queueNames } from "./queues/queue.constants";

async function bootWorker() {
  const redis = createRedisConnection(workerConfig.redisUrl);

  redis.on("error", (error: unknown) => {
    console.error(error);
  });

  if (redis.status === "wait") {
    await redis.connect();
  }

  await redis.ping();
  console.log(
    `[${workerConfig.name}] ready in ${workerConfig.nodeEnv} for queues: ${queueNames.system}`,
  );

  const shutdown = async () => {
    if (redis.status === "end") {
      process.exit(0);
      return;
    }

    if (redis.status !== "ready") {
      redis.disconnect();
      process.exit(0);
      return;
    }

    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }

    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void bootWorker().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
