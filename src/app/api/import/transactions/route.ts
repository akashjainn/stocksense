import { NextRequest } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

type Row = Partial<{
  [key: string]: string | undefined;
}>;

export const dynamic = "force-dynamic";

// Function to normalize header keys
const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/ /g, '');

// Function to parse date with multiple formats
const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const formats = [
    "YYYY-MM-DD",
    "MM/DD/YYYY",
    "M/D/YYYY",
    "MM-DD-YYYY",
    "M-D-YYYY",
    "YYYY/MM/DD"
  ];
  const date = dayjs(dateStr, formats, true);
  return date.isValid() ? date.toDate() : null;
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const accountId = (form.get("accountId") as string) || "";
  if (!file || typeof file === "string") return new Response("file required", { status: 400 });
  if (!accountId) return new Response("accountId required", { status: 400 });
  const text = await (file as Blob).text();
  
  const parsed = Papa.parse<Row>(text, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: header => normalizeKey(header)
  });

  if (parsed.errors?.length) {
    return new Response(`Parse error: ${parsed.errors[0].message}`, { status: 400 });
  }
  
  const rows = (parsed.data || []).filter(Boolean);
  let created = 0;

  for (const r of rows) {
    const symbol = (r.symbol || r.ticker || "").trim().toUpperCase();
    const type = (r.type || r.transactiontype || "").trim().toUpperCase();
    const qStr = (r.qty || r.quantity || r.shares || "").toString().trim();
    const pStr = (r.price || r.costpershare || "").toString().trim();
    const feeStr = (r.fee || r.commission || "").toString().trim();
    const dateStr = (r.tradedate || r.date || "").toString().trim();
    
    const tradeDate = parseDate(dateStr);

    if (!type || !tradeDate) continue;
    
    if (!["BUY", "SELL", "DIV", "CASH"].includes(type)) continue;
    
    let secId: string | undefined;
    if (symbol) {
      const sec = await prisma.security.upsert({ 
        where: { symbol }, 
        update: {}, 
        create: { symbol, name: symbol } 
      });
      secId = sec.id;
    }
    
    const qty = qStr ? parseFloat(qStr.replace(/,/g, '')) : undefined;
    const price = pStr ? parseFloat(pStr.replace(/[^0-9.-]+/g, "")) : undefined;
    const fee = feeStr ? parseFloat(feeStr.replace(/[^0-9.-]+/g, "")) : undefined;
    
    await prisma.transaction.create({
      data: {
        accountId,
        securityId: secId,
        type,
        qty: qty ?? null,
        price: price ?? null,
        fee: fee ?? null,
        tradeDate,
        notes: r.notes || null,
      },
    });
    created++;
  }
  
  return Response.json({ created });
}
