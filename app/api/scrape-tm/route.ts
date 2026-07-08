import { NextResponse } from 'next/server';
import { runScrapeTm } from '@/lib/scrapeRunner';

export async function GET() {
  try {
    const success = await runScrapeTm();
    return NextResponse.json({ ok: success, message: 'Transfermarkt scrape completed' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
