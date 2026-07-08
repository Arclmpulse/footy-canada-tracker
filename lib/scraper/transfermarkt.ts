import axios from 'axios';
import * as cheerio from 'cheerio';
import { Player, TransferRumour } from '../types';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

function matchPlayer(tmName: string, players: Player[]): Player | null {
  const cleanTm = tmName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // 1. Try exact normalized match
  for (const p of players) {
    const cleanRoster = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (cleanRoster === cleanTm) return p;
  }
  
  // 2. Split names into tokens (words)
  const tmTokens = cleanTm.replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  
  for (const p of players) {
    const cleanRoster = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const rosterTokens = cleanRoster.replace(/-/g, ' ').split(/\s+/).filter(Boolean);
    
    // Check if the last token (last name) matches
    const tmLast = tmTokens[tmTokens.length - 1];
    const rosterLast = rosterTokens[rosterTokens.length - 1];
    
    if (tmLast === rosterLast && tmLast !== undefined) {
      // If last names match, check if any of the other tokens overlap (e.g. "nathan" in both "nathan-dylan saliba" and "nathan saliba")
      const tmFirstTokens = tmTokens.slice(0, -1);
      const rosterFirstTokens = rosterTokens.slice(0, -1);
      
      const hasFirstOverlap = tmFirstTokens.some(t => rosterFirstTokens.includes(t)) ||
                              rosterFirstTokens.some(t => tmFirstTokens.includes(t));
                              
      if (hasFirstOverlap) {
        return p;
      }
    }
  }
  
  return null;
}

function parseTmDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return dateStr;
}

export async function fetchTransfermarktRumours(players: Player[]): Promise<Record<string, TransferRumour[]>> {
  const url = 'https://www.transfermarkt.us/kanada/geruechte/verein/3510';
  const rumoursMap: Record<string, TransferRumour[]> = {};

  try {
    console.log(`[TM Scraper] Fetching transfer rumours from ${url}...`);
    const res = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const table = $('.items');

    if (table.length === 0) {
      console.warn('[TM Scraper] No table with class "items" found.');
      return rumoursMap;
    }

    const rows = table.first().find('tbody > tr');
    console.log(`[TM Scraper] Found ${rows.length} rows inside the items table.`);

    rows.each((i, el) => {
      const cells = $(el).find('> td');
      const inlineTable = $(el).find('table.inline-table');
      if (inlineTable.length === 0) return; // skip spacer rows

      const playerName = inlineTable.find('.hauptlink a').first().text().trim();
      
      // Attempt to match player in roster
      const matchedPlayer = matchPlayer(playerName, players);
      if (!matchedPlayer) {
        console.log(`[TM Scraper] Skipping rumor for "${playerName}" — not found in active roster.`);
        return;
      }

      // Interested club details
      const interestedClubCell = cells.eq(5);
      const interestedClub = interestedClubCell.find('a').first().attr('title')?.trim();
      const interestedClubLogo = interestedClubCell.find('img').first().attr('src')?.trim();

      // Market Value
      const marketValue = cells.eq(6).text().trim();

      // Date Text
      const dateText = cells.eq(7).text().trim();
      const formattedDate = parseTmDate(dateText);

      // Probability
      const probability = cells.eq(8).text().trim();

      // Formulate headline
      let headline = `Rumoured interest from ${interestedClub || 'Unknown Club'}`;
      if (marketValue && marketValue !== '-') {
        headline += ` (Valued: ${marketValue})`;
      }
      if (probability && probability !== '-' && probability !== '') {
        headline += ` [Probability: ${probability}]`;
      }

      const rumourId = `tm-${matchedPlayer.id}-${slugify(interestedClub || 'unknown')}-${formattedDate}`;
      const newRumour: TransferRumour = {
        id: rumourId,
        playerId: matchedPlayer.id,
        headline,
        date: formattedDate,
        source: 'Transfermarkt',
        isManual: false,
        targetClub: interestedClub || undefined,
        targetClubLogo: interestedClubLogo || undefined,
      };

      if (!rumoursMap[matchedPlayer.id]) {
        rumoursMap[matchedPlayer.id] = [];
      }
      rumoursMap[matchedPlayer.id].push(newRumour);
      console.log(`[TM Scraper] Matched Transfermarkt rumor: "${playerName}" -> ${interestedClub || 'Unknown'} (${formattedDate})`);
    });

  } catch (err: any) {
    console.error('[TM Scraper] Fetch failed:', err.message);
  }

  return rumoursMap;
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
