import { NextRequest } from "next/server";
import { getMarketProvider } from "@/lib/market/providers";
import type { Tick } from "@/lib/market/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") || "").split(",").map(s => s.trim()).filter(Boolean);
  if (symbols.length === 0) return new Response("Missing symbols", { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const provider = getMarketProvider();
      let unsubscribe: (() => void) | null = null;
      try {
  unsubscribe = await provider.streamQuotes(symbols, (tick: Tick) => {
          const payload = `event: quote\ndata: ${JSON.stringify(tick)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        });
      } catch (e: any) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`));
      }

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 10000);

      const close = () => {
        clearInterval(heartbeat);
        try { unsubscribe?.(); } catch {}
        controller.close();
      };

      // When client disconnects
      (req as any).signal?.addEventListener("abort", () => {
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
