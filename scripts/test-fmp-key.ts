/**
 * Quick local diagnostic for FMP API key.
 * Usage (PowerShell):
 *   $env:FMP_KEY="your_key"; npx ts-node scripts/test-fmp-key.ts
 * Or add to a .env.local and run with next dev (ensuring dotenv loads) then:
 *   npx ts-node -r dotenv/config scripts/test-fmp-key.ts
 */

const BASE = 'https://financialmodelingprep.com/stable';

function getKey(): string {
  return process.env.FMP_KEY || process.env.FMP_API_KEY || process.env.VITE_FMP_KEY || process.env.NEXT_PUBLIC_FMP_KEY || '';
}

async function ping(path: string) {
  const key = getKey();
  if (!key) throw new Error('No FMP key found in env (FMP_KEY / FMP_API_KEY / VITE_FMP_KEY / NEXT_PUBLIC_FMP_KEY)');
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* plain text or HTML */ }
  return { status: res.status, ok: res.ok, json, raw: text.slice(0, 300) };
}

(async () => {
  try {
    console.log('Detected key length:', getKey().length ? getKey().length : 'NONE');
    // 1. Quote endpoint for indices
  const indices = await ping('/quote?symbol=%5EGSPC');
  console.log('\n[Indices /quote?symbol=^GSPC] status:', indices.status, 'ok:', indices.ok);
    if (!indices.ok) console.log('Body snippet:', indices.raw);
    else console.log('Parsed symbol:', indices.json?.[0]?.symbol, 'Price:', indices.json?.[0]?.price);

    // 2. Gainers endpoint
  const gainers = await ping('/biggest-gainers');
  console.log('\n[Leaderboard /biggest-gainers] status:', gainers.status, 'ok:', gainers.ok, 'items:', Array.isArray(gainers.json)? gainers.json.length : 'n/a');

    // 3. Rate limit test (hit a lightweight endpoint like profile for AAPL)
  const profile = await ping('/profile?symbol=AAPL');
  console.log('\n[Profile /profile?symbol=AAPL] status:', profile.status, 'ok:', profile.ok, 'company:', profile.json?.[0]?.companyName || profile.json?.[0]?.name);

    // Basic verdict
    if (indices.ok && gainers.ok && profile.ok) {
      console.log('\n✅ FMP key appears valid.');
    } else {
      console.log('\n⚠ Some endpoints failed. Check above output.');
    }
  } catch (e) {
    console.error('\n❌ Test failed:', e);
    process.exitCode = 1;
  }
})();
