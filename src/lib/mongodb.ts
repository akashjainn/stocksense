import { MongoClient, Db } from "mongodb";

// Cached client across hot-reloads in dev and across route handlers in prod
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined; // eslint-disable-line no-var
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI. Set it in your environment (e.g. .env.local).");
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB || "stocksense"; // fallback if not provided
  return client.db(dbName);
}
