import axios from 'axios';
import { GameRating, PlayerStats } from '../types';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.fotmob.com/',
};

const teamLeagueCache = new Map<number, { league: string; leagueId: number }>();

export async function fetchTeamPrimaryLeague(
  teamId?: number | null
): Promise<{ league: string; leagueId: number } | null> {
  if (!teamId) return null;
  if (teamLeagueCache.has(teamId)) return teamLeagueCache.get(teamId)!;

  try {
    const res = await axios.get(`https://www.fotmob.com/api/data/teams?id=${teamId}`, { headers, timeout: 6000 });
    const primaryLeagueName = res.data?.details?.primaryLeagueName || res.data?.overview?.table?.[0]?.data?.leagueName;
    const primaryLeagueId = res.data?.details?.primaryLeagueId || res.data?.overview?.table?.[0]?.data?.leagueId;
    if (primaryLeagueName) {
      const result = { league: primaryLeagueName, leagueId: primaryLeagueId };
      teamLeagueCache.set(teamId, result);
      return result;
    }
  } catch {
    // Ignore team fetch error and allow fallback
  }
  return null;
}

export function formatMarketValue(num: number, currency = '€'): string {
  if (!num || isNaN(num)) return '—';
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return `${currency}${m >= 10 ? m.toFixed(1).replace(/\.0$/, '') : m.toFixed(1)}m`;
  }
  if (num >= 1_000) {
    const k = Math.round(num / 1_000);
    return `${currency}${k}k`;
  }
  return `${currency}${num}`;
}

export async function fetchFotMobPlayerStats(
  playerId: string,
  fotmobId: number
): Promise<PlayerStats | null> {
  const url = `https://www.fotmob.com/api/data/playerData?id=${fotmobId}`;
  try {
    const res = await axios.get(url, { headers, timeout: 10000 });
    const data = res.data;

    if (!data) return null;

    // 1. Club & League metadata
    const club = data.primaryTeam?.teamName || 'Unknown';
    const clubTeamId = data.primaryTeam?.teamId || null;
    const currentSeason = data.mainLeague?.season || '25/26';

    // Accurately resolve current league (handles mid-season transfers where mainLeague lags behind)
    let league = data.mainLeague?.leagueName || 'Unknown';
    let leagueId = data.mainLeague?.leagueId || null;

    if (clubTeamId) {
      const teamLeague = await fetchTeamPrimaryLeague(clubTeamId);
      if (teamLeague) {
        league = teamLeague.league;
        leagueId = teamLeague.leagueId;
      } else if (
        data.nextMatch?.leagueName &&
        (data.nextMatch.homeId === clubTeamId || data.nextMatch.awayId === clubTeamId)
      ) {
        league = data.nextMatch.leagueName;
        leagueId = data.nextMatch.leagueId;
      }
    }

    // Kit number (shirt number on primaryTeam, if available)
    const kitNumber: number | undefined = data.primaryTeam?.shirtNumber ?? undefined;

    // 2. Age & Market Value from playerInformation array or marketValues history
    let age: number | undefined;
    let marketValue: string | undefined;
    if (Array.isArray(data.playerInformation)) {
      for (const info of data.playerInformation) {
        const key = (info.translationKey || '').toLowerCase();
        if (key === 'age_sentencecase') {
          age = info.value?.numberValue ?? undefined;
        } else if (key === 'transfer_value') {
          if (info.value?.fallback && typeof info.value.fallback === 'string') {
            marketValue = info.value.fallback;
          } else if (typeof info.value?.numberValue === 'number') {
            marketValue = formatMarketValue(info.value.numberValue);
          }
        }
      }
    }
    if (!marketValue && Array.isArray(data.marketValues) && data.marketValues.length > 0) {
      const latest = data.marketValues[data.marketValues.length - 1];
      if (latest && typeof latest.value === 'number') {
        const currencySymbol = latest.currency === 'USD' ? '$' : latest.currency === 'GBP' ? '£' : '€';
        marketValue = formatMarketValue(latest.value, currencySymbol);
      }
    }

    // 3. Positions Detailed
    let positionsDetailed: string[] = [];
    if (data.positionDescription?.positions) {
      // Sort so main position is first
      const sorted = [...data.positionDescription.positions].sort((a, b) => {
        if (a.isMainPosition && !b.isMainPosition) return -1;
        if (!a.isMainPosition && b.isMainPosition) return 1;
        return (b.occurences || 0) - (a.occurences || 0);
      });
      positionsDetailed = sorted.map((p: any) => p.strPosShort?.label || p.strPos?.label).filter(Boolean);
    }

    // 3. Injury status
    const injured = data.injuryInformation !== null;

    // 4. Season Performance Statistics
    let appearances = 0;
    let goals = 0;
    let assists = 0;
    let seasonAvgRating: number | null = null;

    if (data.mainLeague?.stats) {
      const statsList = data.mainLeague.stats;
      for (const s of statsList) {
        const title = (s.title || '').toLowerCase();
        const loc = (s.localizedTitleId || '').toLowerCase();
        if (title === 'matches' || loc === 'matches_uppercase') {
          appearances = parseInt(s.value) || 0;
        } else if (title === 'goals' || loc === 'goals') {
          goals = parseInt(s.value) || 0;
        } else if (title === 'assists' || loc === 'assists') {
          assists = parseInt(s.value) || 0;
        } else if (title === 'rating' || loc === 'rating') {
          const r = parseFloat(s.value);
          seasonAvgRating = isNaN(r) || r === 0 ? null : Math.round(r * 10) / 10;
        }
      }
    }

    // 5. Recent Matches & Ratings (Club games only)
    const rawMatches = data.recentMatches || [];
    const clubMatches = rawMatches.filter((m: any) => {
      // Since all players are Canadian, any match NOT for Canada is a club match.
      // This correctly handles transfers too — old club matches are included.
      const isNationalTeam = m.teamName === 'Canada';
      const hasPlayed = m.playedInMatch === true || (m.minutesPlayed && m.minutesPlayed > 0);
      return !isNationalTeam && hasPlayed;
    });

    // Take last 5 club games
    const last5Events = clubMatches.slice(0, 5);
    const last5Games: GameRating[] = last5Events.map((m: any) => {
      const date = m.matchDate?.utcTime ? m.matchDate.utcTime.split('T')[0] : '';
      const opponent = m.opponentTeamName || 'Unknown';
      const rawRating = m.ratingProps?.rating;
      const rating = rawRating && rawRating > 0 ? Math.round(rawRating * 10) / 10 : null;
      return {
        date,
        opponent,
        rating,
        minutesPlayed: m.minutesPlayed || 0,
        competition: m.leagueName || league,
      };
    });

    // Compute last game rating & L5 average rating
    const lastGameRating = last5Games.length > 0 ? last5Games[0].rating : null;
    const lastGameDate = last5Games.length > 0 ? last5Games[0].date : null;

    const ratedGames = last5Games.filter(g => g.rating !== null);
    const last5AvgRating =
      ratedGames.length > 0
        ? Math.round((ratedGames.reduce((s, g) => s + (g.rating ?? 0), 0) / ratedGames.length) * 10) / 10
        : null;

    return {
      playerId,
      appearances,
      goals,
      assists,
      seasonAvgRating,
      last5Games,
      last5AvgRating,
      lastGameRating,
      lastGameDate,
      currentSeason,
      injured,
      club,
      league,
      positionsDetailed,
      kitNumber,
      age,
      marketValue,
      teamId: clubTeamId ?? undefined,
      leagueId: leagueId ?? undefined,
    };
  } catch (err) {
    console.error(`[FotMob Scraper] Failed for player ${playerId} (${fotmobId}):`, (err as Error).message);
    return null;
  }
}
