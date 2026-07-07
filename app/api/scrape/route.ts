import { NextResponse } from 'next/server';
import { runScrape, loadCache } from '@/lib/scrapeRunner';

export async function GET() {
  try {
    const cache = loadCache();
    if (cache.lastUpdated) {
      const last = new Date(cache.lastUpdated).getTime();
      const now = Date.now();
      const diff = (now - last) / 1000;
      if (diff < 10) {
        return NextResponse.json(
          { ok: false, error: `Please wait ${Math.ceil(10 - diff)}s before refreshing again.` },
          { status: 429 }
        );
      }
    }

    const success = await runScrape();
    return NextResponse.json({ ok: success, message: 'FotMob scrape completed' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const cache = loadCache();
    if (cache.lastUpdated) {
      const last = new Date(cache.lastUpdated).getTime();
      const now = Date.now();
      const diff = (now - last) / 1000;
      if (diff < 10) {
        return NextResponse.json(
          { ok: false, error: 'Rate limit hit. Please wait 10s.' },
          { status: 429 }
        );
      }
    }

    // Run async in background
    runScrape().catch(err => console.error('[API/scrape] background scrape error:', err));
    return NextResponse.json({ ok: true, message: 'FotMob scrape started in background' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
