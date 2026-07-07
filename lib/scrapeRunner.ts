import fs from 'fs';
import path from 'path';
import { Player, StatsCache, PlayerStats } from './types';
import { fetchFotMobPlayerStats } from './scraper/fotmob';

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

export function loadCache(): StatsCache {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {
      lastUpdated: '',
      players: {},
      rumours: {},
    };
  }
}

export function saveCache(cache: StatsCache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

export async function runScrape(): Promise<boolean> {
  try {
    const players = loadPlayers();
    const cache = loadCache();
    const newPlayersStats: Record<string, PlayerStats> = {};

    console.log(`[Scraper] Starting optimized parallel FotMob sync for ${players.length} players...`);

    const CHUNK_SIZE = 5;
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

    // Save updated roster configuration
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf-8');

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
