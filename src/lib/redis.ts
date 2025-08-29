import { Redis, RedisOptions } from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis {
		if (!client) {
			client = new Redis(process.env.REDIS_URL!, { lazyConnect: true } as RedisOptions);
		// Avoid unhandled 'error' events during build or when Redis is absent
		client.on("error", () => {});
	}
	return client;
}
