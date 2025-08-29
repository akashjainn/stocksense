import { Queue, Worker, Job, QueueOptions, WorkerOptions } from "bullmq";
import { getRedis } from "./redis";
import { prisma } from "@/lib/db";
import { buildProvider } from "./providers/prices";
import dayjs from "dayjs";

export function startWorkers() {
  const provider = buildProvider();
  new Worker(
    "prices-etl",
    async (job: Job) => {
      const { symbols, startISO, endISO } = job.data as {
        symbols: string[];
        startISO: string;
        endISO: string;
      };
      for (const sym of symbols) {
        const sec = await prisma.security.upsert({
          where: { symbol: sym },
          create: { symbol: sym, name: sym },
          update: {},
        });
        const candles = await provider.getDailyCandles(sym, startISO, endISO);
        for (const c of candles) {
          await prisma.price.upsert({
            where: { securityId_asOf: { securityId: sec.id, asOf: new Date(c.t) } },
            create: {
              securityId: sec.id,
              asOf: new Date(c.t),
              close: c.c,
              source: "ALPHAVANTAGE",
            },
            update: { close: c.c },
          });
        }
      }
  },
  { connection: getRedis() } as WorkerOptions
  );
}

export async function enqueueNightlyETL(symbols: string[]) {
  const endISO = dayjs().format("YYYY-MM-DD");
  const startISO = dayjs().subtract(2, "year").format("YYYY-MM-DD");
  // Lazily create the queue only when needed to avoid connecting at import/build time
  const queue = new Queue("prices-etl", { connection: getRedis() } as QueueOptions);
  try {
    await queue.add(
      "nightly",
      { symbols, startISO, endISO },
      { repeat: { pattern: "0 3 * * *" } }
    );
  } finally {
    // Close to prevent open handles in serverless/build environments
    await queue.close();
  }
}
