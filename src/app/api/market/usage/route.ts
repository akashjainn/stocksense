import { NextResponse } from 'next/server';
import { getUsage } from '@/lib/fmpClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usage = await getUsage();
    return NextResponse.json(usage, {
      headers: {
        'x-fmp-used': String(usage.used),
        'x-fmp-remaining': String(usage.remaining),
        'x-fmp-limit': String(usage.limit),
        'cache-control': 'no-store'
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'usage_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
