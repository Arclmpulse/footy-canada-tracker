import fs from 'fs';
import path from 'path';
import { Player, StatsCache, PlayerStats, TransferRumour } from './types';
import { fetchFotMobPlayerStats } from './scraper/fotmob';
import { fetchTransfermarktRumours } from './scraper/transfermarkt';

const DATA_DIR = path.join(process.cwd(), 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const CACHE_FILE = path.join(DATA_DIR, 'stats-cache.json');

export function loadPlayers(): Player[] {
  try {
    return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

let memoryCache: StatsCache | null = null;

export function loadCache(): StatsCache {
  if (memoryCache) {
    return memoryCache;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    memoryCache = data;
    return data;
  } catch {
    const fallback: StatsCache = { lastUpdated: '', players: {}, rumours: {} };
    memoryCache = fallback;
    return fallback;
  }
}

export function saveCache(cache: StatsCache): void {
  memoryCache = cache;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Scraper] Failed to write cache file (running in memory fallback):', err.message);
  }
}

export async function runScrape(): Promise<boolean> {
  try {
    const players = loadPlayers();
    const cache = loadCache();
    const newPlayersStats: Record<string, PlayerStats> = {};

    console.log(`[Scraper] Starting optimized parallel FotMob sync for ${players.length} players...`);

    const CHUNK_SIZE = 8;
    for (let i = 0; i < players.length; i += CHUNK_SIZE) {
      const chunk = players.slice(i, i + CHUNK_SIZE);
      console.log(`[Scraper] Syncing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(players.length / CHUNK_SIZE)}`);

      await Promise.all(
        chunk.map(async (p) => {
          if (!p.fotmob_id) {
            console.warn(`[Scraper] Skipping ${p.name} — no fotmob_id configured`);
            return;
          }

          console.log(`[Scraper] Fetching ${p.name} (${p.fotmob_id})`);
          const stats = await fetchFotMobPlayerStats(p.id, p.fotmob_id);

          if (stats) {
            newPlayersStats[p.id] = stats;

            if (stats.club && stats.club !== p.club) {
              console.log(`[Scraper] Updating club for ${p.name}: "${p.club}" -> "${stats.club}"`);
              p.club = stats.club;
            }
            if (stats.league && stats.league !== p.league) {
              p.league = stats.league;
            }
          } else {
            console.warn(`[Scraper] Failed to fetch stats for ${p.name}, retaining cached stats`);
            if (cache.players[p.id]) {
              newPlayersStats[p.id] = cache.players[p.id];
            }
          }
        })
      );

      // 1-second delay between batches to respect rate limits politely
      if (i + CHUNK_SIZE < players.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Save updated roster configuration (fails silently on read-only environments like Vercel)
    try {
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[Scraper] Failed to save updated players config (running in memory fallback):', err.message);
    }

    // Update stats cache
    cache.players = newPlayersStats;
    cache.lastUpdated = new Date().toISOString();
    saveCache(cache);

    console.log('[Scraper] FotMob sync completed successfully!');
    return true;
  } catch (err) {
    console.error('[Scraper] FotMob sync failed:', err);
    return false;
  }
}

export async function runScrapeTm(): Promise<boolean> {
  try {
    const players = loadPlayers();
    const cache = loadCache();

    if (!cache.rumours) {
      cache.rumours = {};
    }

    // Fetch new TM rumours
    const newTmRumours = await fetchTransfermarktRumours(players);

    // Clean out previous TM rumours from cache, keeping manual ones
    for (const pid of Object.keys(cache.rumours)) {
      cache.rumours[pid] = (cache.rumours[pid] ?? []).filter(r => r.source !== 'Transfermarkt');
    }

    // Merge the new TM rumours into cache
    for (const [pid, list] of Object.entries(newTmRumours)) {
      if (!cache.rumours[pid]) {
        cache.rumours[pid] = [];
      }
      cache.rumours[pid] = [...cache.rumours[pid], ...list];
    }

    saveCache(cache);
    console.log('[Scraper] Transfermarkt sync completed successfully!');
    return true;
  } catch (err) {
    console.error('[Scraper] Transfermarkt sync failed:', err);
    return false;
  }
}
