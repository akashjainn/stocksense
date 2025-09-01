import { NextRequest } from "next/server";
import Papa from "papaparse";
import type { ParseError } from "papaparse";
import { getMongoDb } from "@/lib/mongodb";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

type Row = Partial<{
  [key: string]: string | undefined;
}>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Function to normalize header keys
const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, '');

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

// Parse money like "$59.84" or "($59.84)" or "$0.01" into signed number
const parseMoney = (s?: string) => {
  if (!s) return undefined;
  const str = s.toString().trim();
  const negative = /\(.*\)/.test(str);
  const cleaned = str.replace(/[()$,\s]/g, "");
  const n = cleaned ? Number(cleaned) : NaN;
  if (Number.isNaN(n)) return undefined;
  return negative ? -n : n;
};

// Map CSV transaction codes to our internal types
const mapType = (code?: string) => {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  if (c === 'BUY' || c === 'SELL') return c as 'BUY' | 'SELL';
  // Cash-like activities
  if (['CDIV','SLIP','ACH','RTP','INT','CIL','REC','MRGS'].includes(c)) return 'CASH' as const;
  return undefined;
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const accountId = (form.get("accountId") as string) || "";
  if (!file || typeof file === "string") return new Response("file required", { status: 400 });
  if (!accountId) return new Response("accountId required", { status: 400 });
  const text = await (file as Blob).text();

  const db = await getMongoDb();
  const txCol = db.collection("transactions");
  const secCol = db.collection("securities"); // Ensure secCol is defined

  // Clear existing transactions for the account
  await txCol.deleteMany({ accountId });

  const parsed = Papa.parse<Row>(text, { 
    header: true, 
    // Greedy skips lines that appear empty but may contain stray delimiters/whitespace
    skipEmptyLines: 'greedy',
    transformHeader: header => normalizeKey(header)
  });

  // Ignore benign field count mismatches (e.g., footer/disclaimer rows with extra columns)
  const nonTrivialErrors = (parsed.errors || []).filter((e: ParseError) => {
    // Ignore common benign issues from broker CSVs
    if (e.type === 'FieldMismatch') return false;
    if (e.code === 'TooManyFields' || e.code === 'TooFewFields') return false;
    return true;
  });
  if (nonTrivialErrors.length) {
    return new Response(`Parse error: ${nonTrivialErrors[0].message}`, { status: 400 });
  }

  const allRows = (parsed.data || []).filter(Boolean) as Row[];
  const first = allRows[0] || {};
  const hasTransType = !!(first.type || first.transactiontype || first.transcode);
  const hasPositionsCols = !!(first.averageprice || first.avgprice || first.averagecost || first.totalcost || first.costbasis || first.marketvalue);
  // If positions-like CSV (e.g., Robinhood holdings export), we won't require a date on each row
  const rows = hasPositionsCols && !hasTransType
    ? allRows.filter(r => r && (r.symbol || r.ticker || r.instrument) && (r.quantity || r.shares))
    : allRows.filter(r => r && (r["activity date"] || r.activitydate || r.date || r.tradedate) && (r.description || r.instrument || r.transcode || r.type));
  let created = 0;

  for (const r of rows) {
    // Header aliases
    const symbolRaw = (r.symbol || r.ticker || r.instrument || "");
    const typeRaw = (r.type || r.transactiontype || r.transcode || "");
    const qStr = (r.qty || r.quantity || r.shares || "").toString();
    const pStr = (r.price || r.costpershare || "").toString();
    const amountStr = (r.amount || "").toString();
    const feeStr = (r.fee || r.commission || "").toString();
    const dateStr = (r.tradedate || r.date || r.activitydate || "").toString();

    const tradeDate = parseDate(dateStr);
    const mappedType = mapType(typeRaw);
    const symbol = symbolRaw.toString().trim().toUpperCase();
    let secId: string | undefined;
    if (symbol) {
      const sec = await secCol.findOneAndUpdate(
        { symbol },
        { $setOnInsert: { symbol, name: symbol, createdAt: new Date() } },
        { upsert: true, returnDocument: "after", projection: { _id: 1 } }
      );
      const idVal = sec?.value?._id;
      if (idVal) secId = String(idVal);
    }

    // Positions-mode: synthesize BUYs from quantity and average price
    if (hasPositionsCols && !hasTransType) {
      const qty = qStr ? parseFloat(qStr.replace(/,/g, '')) : undefined;
      // Prefer explicit average price columns
      let avgPrice = undefined as number | undefined;
      const avgStr = (r.averageprice || r.avgprice || r.averagecost || r.costperunit || r.costpershare || "").toString();
      if (avgStr) avgPrice = parseFloat(avgStr.replace(/[^0-9.-]+/g, ""));
      // Try compute from return (unrealized P/L) and market value
      const mvStr = (r.marketvalue || r.equity || r.currentvalue || "").toString();
      const retStr = (r.return || r.totalreturn || r.unrealizedpl || r.unrealizedpnl || "").toString();
      const pctStr = (r.percentchange || r.changepercent || r.percentreturn || "").toString();
      const marketValue = mvStr ? parseFloat(mvStr.replace(/[^0-9.-]+/g, "")) : undefined;
      const absReturn = retStr ? parseFloat(retStr.replace(/[^0-9.-]+/g, "")) : undefined;
      const pctChange = pctStr ? parseFloat(pctStr.replace(/[^0-9.-]+/g, "")) : undefined;
      if ((avgPrice == null || Number.isNaN(avgPrice)) && qty && qty !== 0) {
        if (absReturn != null && !Number.isNaN(absReturn) && marketValue != null && !Number.isNaN(marketValue)) {
          const cost = marketValue - absReturn;
          avgPrice = cost / qty;
        } else if (pctChange != null && !Number.isNaN(pctChange) && marketValue != null && !Number.isNaN(marketValue)) {
          const cost = marketValue / (1 + pctChange / 100);
          avgPrice = cost / qty;
        } else {
          const totalCostStr = (r.totalcost || r.costbasis || r.cost || "").toString();
          const totalCost = totalCostStr ? parseFloat(totalCostStr.replace(/[^0-9.-]+/g, "")) : undefined;
          if (totalCost != null && !Number.isNaN(totalCost)) avgPrice = Math.abs(totalCost / qty);
        }
      }
      // Basic sanity: if avgPrice * qty is over 10x current market value, trust market-derived methods if available
      if (avgPrice != null && marketValue != null && qty && qty > 0 && avgPrice * qty > marketValue * 10) {
        if (absReturn != null) {
          const cost = marketValue - absReturn;
          avgPrice = cost / qty;
        } else if (pctChange != null) {
          const cost = marketValue / (1 + pctChange / 100);
          avgPrice = cost / qty;
        }
      }
      if (!symbol || !qty || !avgPrice || qty <= 0 || avgPrice <= 0) continue;
      await txCol.insertOne({
        accountId,
        securityId: secId ?? null,
        symbol,
        type: 'BUY',
        qty,
        price: avgPrice,
        fee: null,
        // Use provided date if present, else fallback to 30 days ago to allow baseline calc
        tradeDate: tradeDate ?? dayjs().subtract(30, 'day').toDate(),
        notes: 'positions-import',
        createdAt: new Date(),
      });
      created++;
      continue;
    }

    if (!mappedType || !tradeDate) continue;


    const qty = qStr ? parseFloat(qStr.replace(/,/g, '')) : undefined;
    let price = pStr ? parseFloat(pStr.replace(/[^0-9.-]+/g, "")) : undefined;
    const fee = feeStr ? parseFloat(feeStr.replace(/[^0-9.-]+/g, "")) : undefined;
    const amount = parseMoney(amountStr);

    if (mappedType === 'CASH') {
      // For cash-like events use the signed amount
      if (amount == null || amount === 0) continue;
      await txCol.insertOne({
        accountId,
        securityId: null,
        symbol: symbol || undefined,
        type: 'CASH',
        qty: null,
        price: amount,
        fee: fee ?? null,
        tradeDate,
        notes: (r.description as string) || null,
        createdAt: new Date(),
      });
      created++;
      continue;
    }

    // BUY/SELL: if price missing, back-calc from amount and qty
    if ((price == null || Number.isNaN(price)) && amount != null && qty && qty !== 0) {
      price = Math.abs(amount / qty);
    }

  await txCol.insertOne({
      accountId,
      securityId: secId ?? null,
      symbol: symbol || undefined,
      type: mappedType,
      qty: qty ?? null,
      price: price ?? null,
      fee: fee ?? null,
      tradeDate,
      notes: (r.description as string) || null,
      createdAt: new Date(),
    });
    created++;
  }
  
  return Response.json({ created });
}
