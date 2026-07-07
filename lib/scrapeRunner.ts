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

    console.log(`[Scraper] Starting FotMob sync for ${players.length} players...`);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.fotmob_id) {
        console.warn(`[Scraper] Skipping ${p.name} — no fotmob_id configured`);
        continue;
      }

      console.log(`[Scraper] Syncing ${p.name} (${i + 1}/${players.length})`);
      const stats = await fetchFotMobPlayerStats(p.id, p.fotmob_id);

      if (stats) {
        newPlayersStats[p.id] = stats;
        
        // Also update player's local club and league in players.json if it changed!
        // This is excellent because it syncs your roster clubs automatically too!
        if (stats.club && stats.club !== p.club) {
          console.log(`[Scraper] Updating club for ${p.name}: "${p.club}" -> "${stats.club}"`);
          p.club = stats.club;
        }
        if (stats.league && stats.league !== p.league) {
          p.league = stats.league;
        }
      } else {
        console.warn(`[Scraper] Failed to fetch stats for ${p.name}, retaining cached stats if present`);
        if (cache.players[p.id]) {
          newPlayersStats[p.id] = cache.players[p.id];
        }
      }

      // Respect rate limits with a 1-second delay
      await new Promise(resolve => setTimeout(resolve, 1000));
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
