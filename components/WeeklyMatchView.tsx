'use client';

import React, { useState, useMemo } from 'react';
import { Player, PlayerStats, GameRating } from '@/lib/types';
import { getRatingClass, getRatingColor } from './utils';

interface WeeklyMatchViewProps {
  players: Player[];
  stats: Record<string, PlayerStats>;
}

interface WeeklyMatch extends GameRating {
  playerId: string;
  playerName: string;
  fotmobId?: number;
  fotmobUrl?: string;
}

function getWeekBounds(offsetWeeks: number = 0): { start: Date; end: Date; weekNumber: number; label: string } {
  const now = new Date();
  // Get Monday of current week
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday is 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Approximate week number (ISO-ish)
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const label = `Week ${weekNumber} · ${fmt(monday)} – ${fmt(sunday)}`;

  return { start: monday, end: sunday, weekNumber, label };
}

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const WeeklyMatchView: React.FC<WeeklyMatchViewProps> = ({ players, stats }) => {
  // If current week has no matches yet, default to -1 (the active/recent matchday week)
  const defaultOffset = useMemo(() => {
    const currentWeek = getWeekBounds(0);
    for (const player of players) {
      const s = stats[player.id];
      if (!s?.last5Games) continue;
      for (const game of s.last5Games) {
        if (!game.date) continue;
        const gDate = new Date(game.date + 'T12:00:00');
        if (gDate >= currentWeek.start && gDate <= currentWeek.end) {
          return 0;
        }
      }
    }
    return -1;
  }, [players, stats]);

  const [weekOffset, setWeekOffset] = useState<number>(defaultOffset);

  const week = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  const matches = useMemo(() => {
    const all: WeeklyMatch[] = [];

    for (const player of players) {
      const s = stats[player.id];
      if (!s?.last5Games) continue;

      for (const game of s.last5Games) {
        if (!game.date) continue;
        const gameDate = new Date(game.date + 'T12:00:00');
        if (gameDate >= week.start && gameDate <= week.end) {
          all.push({
            ...game,
            playerId: player.id,
            playerName: player.name,
            fotmobId: player.fotmob_id,
            fotmobUrl: player.fotmob_url,
          });
        }
      }
    }

    // Sort by date descending, then player name
    all.sort((a, b) => b.date.localeCompare(a.date) || a.playerName.localeCompare(b.playerName));
    return all;
  }, [players, stats, week]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, WeeklyMatch[]> = {};
    for (const m of matches) {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [matches]);

  const teamLogoUrl = (id?: number) =>
    id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

  return (
    <div className="weekly-view">
      <div className="weekly-header">
        <div className="weekly-nav-group">
          <button
            type="button"
            className="weekly-nav-btn"
            onClick={() => setWeekOffset(prev => prev - 1)}
            title="Previous week"
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="weekly-header-icon">📅</span>
          <span className="weekly-header-title">{week.label}</span>
          <button
            type="button"
            className="weekly-nav-btn"
            onClick={() => setWeekOffset(prev => prev + 1)}
            title="Next week"
            aria-label="Next week"
          >
            ›
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              className="weekly-today-btn"
              onClick={() => setWeekOffset(0)}
            >
              Current Week
            </button>
          )}
        </div>
        <span className="weekly-header-count">{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span>
      </div>

      {matches.length === 0 ? (
        <div className="weekly-empty">
          <span className="weekly-empty-icon">⚽</span>
          <span>No matches recorded for this week</span>
        </div>
      ) : (
        <div className="weekly-matches">
          {grouped.map(([date, dateMatches]) => (
            <div key={date} className="weekly-date-group">
              <div className="weekly-date-separator">
                {formatMatchDate(date)}
              </div>
              {dateMatches.map((m, idx) => {
                const teamLogo = teamLogoUrl(m.teamId);
                const oppLogo = teamLogoUrl(m.opponentTeamId);
                const ratingClass = getRatingClass(m.rating);
                const score = m.homeScore != null && m.awayScore != null
                  ? `${m.homeScore} – ${m.awayScore}`
                  : null;

                return (
                  <div
                    key={`${m.playerId}-${idx}`}
                    className={`weekly-match-row ${m.onBench ? 'dnp' : ''}`}
                    style={{ animationDelay: `${idx * 25}ms` }}
                  >
                    {/* Player name */}
                    <div className="weekly-match-player">
                      {m.fotmobUrl || m.fotmobId ? (
                        <a
                          href={m.fotmobUrl || `https://www.fotmob.com/players/${m.fotmobId}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="weekly-match-player-link"
                        >
                          {m.playerName}
                        </a>
                      ) : (
                        <span className="weekly-match-player-name">{m.playerName}</span>
                      )}
                    </div>

                    {/* Match details: team vs opponent + competition */}
                    <div className="weekly-match-detail">
                      <div className="weekly-match-teams">
                        {teamLogo && (
                          <img src={teamLogo} alt="" width={15} height={15}
                            style={{ objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <span className="weekly-match-myteam">{m.teamName || 'Club'}</span>
                        <span className="weekly-match-vs">vs</span>
                        {oppLogo && (
                          <img src={oppLogo} alt="" width={15} height={15}
                            style={{ objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <span className="weekly-match-opponent">{m.opponent}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="weekly-match-comp">{m.competition}</span>
                        {(m.playerGoals ?? 0) > 0 && (
                          <span className="weekly-stat-highlight">⚽ {m.playerGoals}</span>
                        )}
                        {(m.playerAssists ?? 0) > 0 && (
                          <span className="weekly-stat-highlight assist">🅰 {m.playerAssists}</span>
                        )}
                      </div>
                    </div>

                    {/* Minutes / DNP */}
                    <div className="weekly-match-minutes">
                      {m.onBench ? (
                        <span className="weekly-dnp-badge">DNP</span>
                      ) : (
                        <span>{m.minutesPlayed}&apos;</span>
                      )}
                    </div>

                    {/* Result badge */}
                    {m.matchResult && (
                      <span className={`weekly-result-badge ${m.matchResult}`}>
                        {m.matchResult}
                      </span>
                    )}

                    {/* Score */}
                    <span className="weekly-match-score">{score || '–'}</span>

                    {/* Rating */}
                    <div className="weekly-match-rating">
                      {m.onBench ? (
                        <span className="weekly-rating-dnp">–</span>
                      ) : (
                        <span className={`rating-chip ${ratingClass}`}>
                          {m.rating != null ? m.rating.toFixed(1) : '–'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyMatchView;
