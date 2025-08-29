import { NextRequest } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";

type Row = Partial<{
  date: string; tradeDate: string; symbol: string; type: string; qty: string; quantity: string; price: string; fee: string; notes: string;
}>;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const accountId = (form.get("accountId") as string) || "";
  if (!file || typeof file === "string") return new Response("file required", { status: 400 });
  if (!accountId) return new Response("accountId required", { status: 400 });
  const text = await (file as Blob).text();
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    return new Response(`parse error: ${parsed.errors[0].message}`, { status: 400 });
  }
  const rows = (parsed.data || []).filter(Boolean);
  let created = 0;
  for (const r of rows) {
    const symbol = (r.symbol || "").trim().toUpperCase();
    const type = (r.type || "").trim().toUpperCase();
    const qStr = (r.qty || r.quantity || "").toString().trim();
    const pStr = (r.price || "").toString().trim();
    const feeStr = (r.fee || "").toString().trim();
    const dateStr = (r.tradeDate || r.date || "").toString().trim();
    if (!type || !dateStr) continue;
    // Accept BUY/SELL/DIV/CASH types; ignore unknown
    if (!["BUY", "SELL", "DIV", "CASH"].includes(type)) continue;
    let secId: string | undefined;
    if (symbol) {
      const sec = await prisma.security.upsert({ where: { symbol }, update: {}, create: { symbol, name: symbol } });
      secId = sec.id;
    }
    const qty = qStr ? Number(qStr) : undefined;
    const price = pStr ? Number(pStr) : undefined;
    const fee = feeStr ? Number(feeStr) : undefined;
    await prisma.transaction.create({
      data: {
        accountId,
        securityId: secId,
        type,
        qty: qty ?? null,
        price: price ?? null,
        fee: fee ?? null,
        tradeDate: new Date(dateStr),
        notes: r.notes?.toString(),
      },
    });
    created++;
  }
  return Response.json({ ok: true, created });
}
