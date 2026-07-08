import { NextRequest, NextResponse } from 'next/server';
import { loadCache, saveCache } from '@/lib/scrapeRunner';
import { TransferRumour } from '@/lib/types';

// POST /api/rumours — add manual rumour
export async function POST(req: NextRequest) {
  try {
    const {
      id,
      playerId,
      headline,
      source,
      targetClub,
      targetClubId,
      feeOriginal,
      feeAmount,
      currency,
    } = await req.json();

    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId parameter' }, { status: 400 });
    }

    const cache = loadCache();
    if (!cache.rumours) {
      cache.rumours = {};
    }
    if (!cache.rumours[playerId]) {
      cache.rumours[playerId] = [];
    }

    if (id) {
      // Find and update existing manual rumour in backend cache
      cache.rumours[playerId] = (cache.rumours[playerId] ?? []).map(r => {
        if (r.id === id) {
          return {
            ...r,
            headline: headline || '',
            source: source || 'Manual',
            targetClub: targetClub || undefined,
            targetClubId: targetClubId ? parseInt(targetClubId as any, 10) : undefined,
            feeOriginal: feeOriginal || undefined,
            feeAmount: feeAmount ? parseFloat(feeAmount as any) : undefined,
            currency: currency || undefined,
          };
        }
        return r;
      });
      saveCache(cache);
      return NextResponse.json({ ok: true });
    }

    const newRumour: TransferRumour = {
      id: 'rumour-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      playerId,
      headline: headline || '',
      source: source || 'Manual',
      date: new Date().toISOString().split('T')[0],
      isManual: true,
      targetClub: targetClub || undefined,
      targetClubId: targetClubId ? parseInt(targetClubId as any, 10) : undefined,
      feeOriginal: feeOriginal || undefined,
      feeAmount: feeAmount ? parseFloat(feeAmount as any) : undefined,
      currency: currency || undefined,
    };

    // Prepend manual rumour
    cache.rumours[playerId] = [
      newRumour,
      ...(cache.rumours[playerId] ?? []),
    ];

    saveCache(cache);
    return NextResponse.json({ ok: true, rumour: newRumour });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/rumours — clear manual rumours for a player
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');
    const id = searchParams.get('id');

    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId parameter' }, { status: 400 });
    }

    const cache = loadCache();
    if (cache.rumours && cache.rumours[playerId]) {
      if (id) {
        // Filter out specific rumour by ID
        cache.rumours[playerId] = (cache.rumours[playerId] ?? []).filter(r => r.id !== id);
      } else {
        // Filter out all manual rumours
        cache.rumours[playerId] = (cache.rumours[playerId] ?? []).filter(r => !r.isManual);
      }
    }

    saveCache(cache);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
