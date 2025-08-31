import { MongoClient, Db } from "mongodb";

// Cache the connection promise across hot-reloads in dev and reuse in prod
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const options = {} as const;

export async function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Missing MONGODB_URI. Set it in your environment (e.g. .env.local).");
    }
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB || "stocksense"; // fallback if not provided
  return client.db(dbName);
}
