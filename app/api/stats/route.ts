import { NextRequest, NextResponse } from 'next/server';
import { loadCache, saveCache, loadPlayers, runScrape } from '@/lib/scrapeRunner';

export async function GET() {
  const cache = loadCache();
  const players = loadPlayers();

  const isEmpty = !cache.players || Object.keys(cache.players).length === 0;
  const isStale = !cache.lastUpdated || (Date.now() - new Date(cache.lastUpdated).getTime()) > 12 * 60 * 60 * 1000;

  if (isStale) {
    if (isEmpty) {
      console.log('[Stats API] Cache is empty, running synchronous scrape...');
      await runScrape();
      const freshCache = loadCache();
      const freshPlayers = loadPlayers();
      return NextResponse.json({ cache: freshCache, players: freshPlayers });
    } else {
      console.log('[Stats API] Cache is stale, running background scrape...');
      runScrape().catch(err => console.error('[Stats API] Background auto-scrape error:', err));
    }
  }

  return NextResponse.json({ cache, players });
}

export async function POST(req: NextRequest) {
  try {
    const nextCache = await req.json();
    if (!nextCache || !nextCache.players) {
      return NextResponse.json({ error: 'Invalid cache payload' }, { status: 400 });
    }
    saveCache(nextCache);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
