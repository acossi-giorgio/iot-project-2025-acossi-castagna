import { createClient } from 'redis';
import { env } from "./env.mjs";

let client;

export async function getRedis() {
  if (client) return client;
  client = createClient({ url: env.redis.url });
  await client.connect();
  return client;
}