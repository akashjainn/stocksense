import { NextRequest } from "next/server";
import { getProvider } from "@/lib/market/providers";
import type { Tick } from "@/lib/market/types";

// Simple in-memory cache of last ticks per symbol per region
const lastTicks = new Map<string, Tick>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const symbols = searchParams.get("symbols")?.split(",") ?? [];

  if (symbols.length === 0) {
    return new Response("Missing symbols", { status: 400 });
  }

  const provider = getProvider();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let unsubscribe: (() => void) | null = null;
      try {
        // streamQuotes returns a Promise<() => void>
        provider
          .streamQuotes(symbols, (tick: Tick) => {
            lastTicks.set(tick.symbol, tick);
            const payload = `event: quote\ndata: ${JSON.stringify(tick)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          })
          .then((unsub) => {
            unsubscribe = unsub;
          })
          .catch((e) => {
            const msg = e instanceof Error ? e.message : "unknown error";
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`
              )
            );
          });

        // Send initial snapshots ASAP (in parallel) using cache first
        (async () => {
          // Replay cached ticks immediately so UI shows something on reconnect
          for (const s of symbols) {
            const cached = lastTicks.get(s);
            if (cached) {
              controller.enqueue(
                encoder.encode(`event: quote\ndata: ${JSON.stringify(cached)}\n\n`)
              );
            }
          }
          // Then fetch fresh in parallel
          await Promise.all(
            symbols.map(async (s) => {
              try {
                const q = await provider.getQuote(s);
                lastTicks.set(s, q);
                const payload = `event: quote\ndata: ${JSON.stringify(q)}\n\n`;
                controller.enqueue(encoder.encode(payload));
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                controller.enqueue(
                  encoder.encode(
                    `event: error\ndata: ${JSON.stringify({ symbol: s, error: msg })}\n\n`
                  )
                );
              }
            })
          );
        })();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown error";
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`)
        );
      }

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 10000);

      const close = () => {
        clearInterval(heartbeat);
        try {
          unsubscribe?.();
        } catch {}
        controller.close();
      };

      // When client disconnects
      (req as unknown as { signal?: AbortSignal }).signal?.addEventListener("abort", () => {
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
