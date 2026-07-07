import axios from 'axios';
import { GameRating, PlayerStats } from '../types';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.fotmob.com/',
};

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
    const league = data.mainLeague?.leagueName || 'Unknown';
    const leagueId = data.mainLeague?.leagueId || null;
    const currentSeason = data.mainLeague?.season || '25/26';

    // Kit number (shirt number on primaryTeam, if available)
    const kitNumber: number | undefined = data.primaryTeam?.shirtNumber ?? undefined;

    // 2. Age & Market Value from playerInformation array
    let age: number | undefined;
    let marketValue: string | undefined;
    if (Array.isArray(data.playerInformation)) {
      for (const info of data.playerInformation) {
        const key = (info.translationKey || '').toLowerCase();
        if (key === 'age_sentencecase') {
          age = info.value?.numberValue ?? undefined;
        } else if (key === 'transfer_value') {
          marketValue = info.value?.fallback ?? undefined;
        }
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
