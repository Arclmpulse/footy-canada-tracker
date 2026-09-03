'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Player, PlayerStats, TransferRumour } from '@/lib/types';
import { getRatingClass, getRatingColor, getRatingBarHeight, formatDate } from './utils';
import leagueRankings from '../data/league-rankings.json';

type SortKey = 'name' | 'position' | 'club' | 'league' | 'appearances' | 'goals' | 'assists' | 'last5Avg' | 'seasonAvg' | 'lastGame' | 'age' | 'value';
type SortDir = 'asc' | 'desc';

interface StatsTableProps {
  players: Player[];
  stats: Record<string, PlayerStats>;
  rumours: Record<string, TransferRumour[]>;
  lineupPlayerIds: Set<string>;
  activeLeagues: Set<string>;
  onAddRumour: (playerId: string) => void;
  onDeleteRumour: (playerId: string, rumourId?: string) => void;
}

// FotMob image CDN helpers
const teamLogoUrl = (teamId?: number) =>
  teamId ? `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId}.png` : null;

const leagueLogoUrl = (leagueId?: number) =>
  leagueId ? `https://images.fotmob.com/image_resources/logo/leaguelogo/${leagueId}.png` : null;

const StatsTable = React.memo(function StatsTable({
  players,
  stats,
  rumours,
  lineupPlayerIds,
  activeLeagues,
  onAddRumour,
  onDeleteRumour,
}: StatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('league');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [injuredToBottom, setInjuredToBottom] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: / to focus search, Esc to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearchQuery('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'league' || key === 'position' || key === 'age' ? 'asc' : 'desc');
    }
  };

  const getNormalizedLeague = (s?: PlayerStats, p?: Player) => {
    if (s?.leagueId === 9986 || s?.league === 'Canadian Premier League' || p?.league === 'Canadian Premier League') {
      return 'Canadian Premier League';
    }
    const club = s?.club || p?.club || '';
    const l = (s?.league || p?.league || '').trim();
    if (l === 'Premier League' && (club === 'Inter Toronto FC' || club === 'Supra du Québec' || club === 'Forge FC' || club === 'Cavalry FC' || club === 'Pacific FC' || club === 'York United')) {
      return 'Canadian Premier League';
    }
    return l || 'Unknown';
  };

  const leagueFiltered = useMemo(
    () => players.filter(p => activeLeagues.has(getNormalizedLeague(stats[p.id], p))),
    [players, stats, activeLeagues]
  );

  // Search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return leagueFiltered;
    const q = searchQuery.toLowerCase();
    return leagueFiltered.filter(p => {
      const s = stats[p.id];
      const name = p.name.toLowerCase();
      const club = (s?.club || p.club || '').toLowerCase();
      const pos = (s?.positionsDetailed?.[0] ?? p.positions[0] ?? '').toLowerCase();
      const league = getNormalizedLeague(s, p).toLowerCase();
      return name.includes(q) || club.includes(q) || pos.includes(q) || league.includes(q);
    });
  }, [leagueFiltered, stats, searchQuery]);

  // Position group counts for toolbar
  const positionCounts = useMemo(() => {
    const groups = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    const defPositions = new Set(['LB', 'LCB', 'CB', 'RCB', 'RB', 'LWB', 'RWB']);
    const midPositions = new Set(['LDM', 'DM', 'RDM', 'LCM', 'CM', 'RCM', 'LM', 'RM', 'LAM', 'CAM', 'RAM', 'AM']);
    const fwdPositions = new Set(['LW', 'RW', 'LS', 'ST', 'RS', 'SS', 'CF']);
    for (const p of filtered) {
      const s = stats[p.id];
      const pos = s?.positionsDetailed?.[0] ?? p.positions[0] ?? 'ST';
      if (pos === 'GK') groups.GK++;
      else if (defPositions.has(pos)) groups.DEF++;
      else if (midPositions.has(pos)) groups.MID++;
      else if (fwdPositions.has(pos)) groups.FWD++;
      else groups.FWD++; // fallback
    }
    return groups;
  }, [filtered, stats]);

  const sorted = useMemo(() => {
    const posOrder: Record<string, number> = {
      GK: 0,
      LWB: 1, RWB: 1,
      LB: 2, RB: 2,
      LCB: 3, CB: 3, RCB: 3,
      LDM: 6, DM: 6, RDM: 6,
      LCM: 7, CM: 7, RCM: 7,
      LM: 8, RM: 8,
      AM: 9, LAM: 9, CAM: 9, RAM: 9,
      LW: 11, RW: 11,
      LS: 13, ST: 13, RS: 13, SS: 13, CF: 13,
    };

    return [...filtered].sort((a, b) => {
      const sa = stats[a.id];
      const sb = stats[b.id];

      // If injuredToBottom is active, move all injured players to the bottom
      if (injuredToBottom) {
        const aInjured = !!sa?.injured;
        const bInjured = !!sb?.injured;
        if (aInjured !== bInjured) {
          return aInjured ? 1 : -1;
        }
      }

      let av: number | string | null = null;
      let bv: number | string | null = null;

      const aPos = sa?.positionsDetailed?.[0] ?? a.positions[0] ?? 'ST';
      const bPos = sb?.positionsDetailed?.[0] ?? b.positions[0] ?? 'ST';

      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break;
        case 'position': av = posOrder[aPos] ?? 99; bv = posOrder[bPos] ?? 99; break;
        case 'club': av = sa?.club ?? a.club; bv = sb?.club ?? b.club; break;
        case 'league': {
          const leagueA = getNormalizedLeague(sa, a);
          const leagueB = getNormalizedLeague(sb, b);
          const rankings = leagueRankings as Record<string, number>;
          const rankA = rankings[leagueA] ?? 999;
          const rankB = rankings[leagueB] ?? 999;
          av = rankA;
          bv = rankB;
          break;
        }
        case 'appearances': av = sa?.appearances ?? -1; bv = sb?.appearances ?? -1; break;
        case 'goals': av = sa?.goals ?? -1; bv = sb?.goals ?? -1; break;
        case 'assists': av = sa?.assists ?? -1; bv = sb?.assists ?? -1; break;
        case 'last5Avg': av = sa?.last5AvgRating ?? -1; bv = sb?.last5AvgRating ?? -1; break;
        case 'seasonAvg': av = sa?.seasonAvgRating ?? -1; bv = sb?.seasonAvgRating ?? -1; break;
        case 'lastGame': av = sa?.lastGameRating ?? -1; bv = sb?.lastGameRating ?? -1; break;
        case 'age': av = sa?.age ?? 99; bv = sb?.age ?? 99; break;
        case 'value': {
          const parseVal = (v?: string) => {
            if (!v) return 0;
            const n = parseFloat(v.replace(/[^0-9.]/g, ''));
            if (isNaN(n)) return 0;
            if (v.includes('m') || v.includes('M')) return n * 1_000_000;
            if (v.includes('k') || v.includes('K')) return n * 1_000;
            return n;
          };
          av = parseVal(sa?.marketValue); bv = parseVal(sb?.marketValue); break;
        }
      }

      if (av === null) av = -999;
      if (bv === null) bv = -999;
      const cmp = typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, stats, sortKey, sortDir, injuredToBottom]);

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const Th = ({ label, col, title }: { label: string; col: SortKey; title?: string }) => (
    <th
      className={sortKey === col ? 'sorted' : ''}
      onClick={() => handleSort(col)}
      title={title}
    >
      {label}
      <span className="sort-arrow">{arrow(col)}</span>
    </th>
  );

  return (
    <div className="stats-container">
      <div className="stats-table-toolbar">
        <div className="stats-toolbar-left">
          <span className="stats-count-badge">
            {sorted.length} {sorted.length === 1 ? 'Player' : 'Players'}
          </span>
          <div className="pos-group-badges">
            <span className="pos-group-badge gk">{positionCounts.GK} GK</span>
            <span className="pos-group-badge def">{positionCounts.DEF} DEF</span>
            <span className="pos-group-badge mid">{positionCounts.MID} MID</span>
            <span className="pos-group-badge fwd">{positionCounts.FWD} FWD</span>
          </div>
        </div>
        <div className="stats-toolbar-right">
          <button
            className={`mobile-sort-value-btn ${sortKey === 'value' ? 'active' : ''}`}
            onClick={() => handleSort('value')}
            title="Sort by transfer value"
          >
            💰 {sortKey === 'value' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
          </button>
          <div className="stats-search-wrap">
            <span className="stats-search-icon">🔍</span>
            <input
              ref={searchRef}
              type="text"
              className="stats-search-input"
              placeholder="Search players…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
            />
            <span className="stats-search-kbd">/</span>
          </div>
          <button
            className={`btn-toggle-injured ${injuredToBottom ? 'active' : ''}`}
            onClick={() => setInjuredToBottom(prev => !prev)}
            title={injuredToBottom ? 'Injured players are moved to bottom (click to sort normally)' : 'Click to move injured players to bottom'}
          >
            <span className="injured-toggle-dot" />
            <span>🚑 Injured to bottom</span>
          </button>
        </div>
      </div>
      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <Th label="Pos" col="position" />
              <Th label="Player" col="name" />
              <Th label="Age" col="age" />
              <Th label="Club" col="club" />
              <Th label="League" col="league" />
              <Th label="Apps" col="appearances" />
              <Th label="G" col="goals" />
              <Th label="A" col="assists" />
              <th>Last 5</th>
              <Th label="Avg" col="seasonAvg" />
              <Th label="Last Game" col="lastGame" />
              <Th label="Value" col="value" title="Market value" />
              <th>Rumour</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, idx) => {
              const s = stats[player.id];
              const isOnPitch = lineupPlayerIds.has(player.id);

              const positionsList = s?.positionsDetailed && s.positionsDetailed.length > 0
                ? s.positionsDetailed
                : player.positions;
              const primaryPosition = s?.positionsDetailed?.[0] ?? player.positions[0] ?? 'ST';
              const displayPositions = positionsList.join(' / ');

              // Chunk positions into rows of max 3 so wide lists spill to next row
              const posChunks: string[][] = [];
              for (let i = 0; i < positionsList.length; i += 3) {
                posChunks.push(positionsList.slice(i, i + 3));
              }

              const displayClub = s?.club || player.club;
              const displayLeague = getNormalizedLeague(s, player);
              const teamLogo = teamLogoUrl(s?.teamId);
              const leagueLogo = leagueLogoUrl(s?.leagueId);

              const playerRumours = rumours[player.id] ?? [];
              const displayRumours: TransferRumour[] = playerRumours.length > 0
                ? playerRumours
                : s?.rumour
                  ? [{ id: 'auto-' + player.id, playerId: player.id, headline: s.rumour, source: 'FotMob', date: s.lastGameDate || '', isManual: false } as TransferRumour]
                  : [];

              const lastGame = s?.last5Games?.[0];
              const lastOpponent = lastGame?.opponent;
              const lastOpponentTeamId = lastGame?.opponentTeamId;
              const lastComp = lastGame?.competition;
              const lastGameTooltip = lastOpponent
                ? `vs ${lastOpponent}${lastComp ? ` (${lastComp})` : ''}`
                : undefined;

              return (
                <DraggableRow key={player.id} playerId={player.id} isOnPitch={isOnPitch}>
                  {/* Position */}
                  <td>
                    {posChunks.length > 1 ? (
                      <div
                        style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}
                        title={`All positions: ${displayPositions}`}
                      >
                        {posChunks.map((chunk, cIdx) => (
                          <span key={cIdx} className={`pos-badge ${primaryPosition}`}>
                            {chunk.join(' / ')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={`pos-badge ${primaryPosition}`} title={`All positions: ${displayPositions}`}>
                        {displayPositions}
                      </span>
                    )}
                  </td>

                  {/* Player Name */}
                  <td>
                    <div className="player-name-cell">
                      {s?.injured && <span className="injury-icon" title="Injured">🇨🇭</span>}
                      {player.fotmob_url || player.fotmob_id ? (
                        <a
                          className="player-name-link"
                          href={player.fotmob_url || `https://www.fotmob.com/players/${player.fotmob_id}/`}
                          target="_blank"
                          rel="noreferrer"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {player.name}
                        </a>
                      ) : (
                        <span className="player-name-text">{player.name}</span>
                      )}
                    </div>
                  </td>

                  {/* Age */}
                  <td style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>
                    {s?.age != null ? s.age : '—'}
                  </td>

                  {/* Club (with logo) */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {teamLogo && (
                        <img
                          src={teamLogo}
                          alt={displayClub}
                          width={16} height={16}
                          style={{ objectFit: 'contain', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span style={{ color: 'var(--text-primary)', fontSize: 11.5, fontWeight: 700 }}>{displayClub}</span>
                    </div>
                  </td>

                  {/* League (with logo) */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {leagueLogo && (
                        <img
                          src={leagueLogo}
                          alt={displayLeague}
                          width={14} height={14}
                          style={{ objectFit: 'contain', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span style={{ color: 'var(--text-primary)', fontSize: 11.5, fontWeight: 700 }}>{displayLeague}</span>
                    </div>
                  </td>

                  {/* Apps */}
                  <td style={{ fontWeight: 600 }}>{s?.appearances ?? '—'}</td>

                  {/* Goals */}
                  <td style={{ fontWeight: 700, color: s?.goals ? 'var(--rating-great)' : undefined }}>
                    {s?.goals ?? '—'}
                  </td>

                  {/* Assists */}
                  <td style={{ fontWeight: 700, color: s?.assists ? '#5293e3' : undefined }}>
                    {s?.assists ?? '—'}
                  </td>

                  {/* Last five mini bars */}
                  <td><Last5Bars games={s?.last5Games ?? []} /></td>



                  {/* Season Avg */}
                  <td><RatingChip rating={s?.seasonAvgRating ?? null} /></td>

                  {/* Last Game */}
                  <td>
                    {s?.lastGameRating != null || (s?.last5Games && s.last5Games.length > 0) ? (
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}
                        title={lastGameTooltip}
                      >
                        <RatingChip rating={s?.lastGameRating ?? null} title={lastGameTooltip} />
                        {lastOpponent && (
                          <div
                            className="last-game-vs-row"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 1,
                              maxWidth: 120,
                            }}
                          >
                            <span style={{ fontSize: 9.5, color: '#ffffff', fontWeight: 700, textTransform: 'lowercase' }}>vs</span>
                            {lastOpponentTeamId ? (
                              <img
                                src={`https://images.fotmob.com/image_resources/logo/teamlogo/${lastOpponentTeamId}.png`}
                                alt={lastOpponent}
                                width={14}
                                height={14}
                                style={{ objectFit: 'contain', flexShrink: 0 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : null}
                            <span
                              style={{
                                fontSize: 10.5,
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {lastOpponent}
                            </span>
                          </div>
                        )}
                        {s?.lastGameDate && (
                          <span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700 }}>
                            {formatDate(s.lastGameDate)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  {/* Market Value */}
                  <td style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {s?.marketValue ?? '—'}
                  </td>

                  {/* Rumours */}
                  <td>
                    <RumoursCell
                      playerId={player.id}
                      rumours={displayRumours}
                      onAdd={() => onAddRumour(player.id)}
                      onDelete={(rumourId) => onDeleteRumour(player.id, rumourId)}
                    />
                  </td>
                </DraggableRow>
              );
            })}
          </tbody>
        </table>

        {/* Mobile card layout (visible at ≤600px via CSS) */}
        <div
          className="player-card-list"
          onScroll={() => {
            if (expandedCardId) setExpandedCardId(null);
          }}
        >
          <div className="player-card-list-inner">
            {sorted.map(player => {
              const s = stats[player.id];
              const isOnPitch = lineupPlayerIds.has(player.id);
              const primaryPosition = s?.positionsDetailed?.[0] ?? player.positions[0] ?? 'ST';
              const displayClub = s?.club || player.club;
              const displayLeague = getNormalizedLeague(s, player);
              const teamLogo = teamLogoUrl(s?.teamId);
              const leagueLogo = leagueLogoUrl(s?.leagueId);
              const lastGameRating = s?.lastGameRating;
              const isFlipped = expandedCardId === player.id;

              const lastGame = s?.last5Games?.[0];
              const lastOpponent = lastGame?.opponent;
              const lastOpponentTeamId = lastGame?.opponentTeamId;

              const playerRumours = rumours[player.id] ?? [];

              // Hybrid market value: prefer TM value if player has TM rumours with one, otherwise FotMob
              const tmValue = playerRumours.find(r => r.source === 'Transfermarkt' && r.marketValue)?.marketValue;
              const displayValue = tmValue || s?.marketValue;

              return (
                <DraggableCard key={player.id} playerId={player.id} isOnPitch={isOnPitch}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 42 }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName === 'A') return;
                      setExpandedCardId(prev => prev === player.id ? null : player.id);
                    }}
                  >
                    {!isFlipped ? (
                      /* ── FRONT FACE ── */
                      <>
                        <span className={`pos-badge ${primaryPosition}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {primaryPosition}
                        </span>
                        <div className="player-card-main">
                          <div className="player-card-top">
                            {s?.injured && <span className="injury-icon" title="Injured">🇨🇭</span>}
                            <span className="player-card-name">
                              {player.fotmob_url || player.fotmob_id ? (
                                <a
                                  href={player.fotmob_url || `https://www.fotmob.com/players/${player.fotmob_id}/`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onPointerDown={e => e.stopPropagation()}
                                >
                                  {player.name}
                                </a>
                              ) : player.name}
                            </span>
                          </div>
                          <div className="player-card-club">
                            {teamLogo && (
                              <img
                                src={teamLogo}
                                alt={displayClub}
                                width={13} height={13}
                                style={{ objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            {displayClub}
                          </div>
                          <div className="player-card-stats">
                            {s?.appearances != null && <span className="player-card-stat">Apps {s.appearances}</span>}
                            {(s?.goals ?? 0) > 0 && <span className="player-card-stat highlight">⚽ {s!.goals}</span>}
                            {(s?.assists ?? 0) > 0 && <span className="player-card-stat" style={{ background: 'rgba(82,147,227,0.12)', color: '#5293e3' }}>🅰 {s!.assists}</span>}
                            {displayValue && <span className="player-card-stat">{displayValue}</span>}
                          </div>
                        </div>
                        <div className="player-card-rating">
                          <span className="player-card-rating-value" style={{ color: getRatingColor(lastGameRating ?? null) }}>
                            {lastGameRating != null ? lastGameRating.toFixed(1) : '—'}
                          </span>
                          <span className="player-card-rating-label">LAST</span>
                        </div>
                      </>
                    ) : (
                      /* ── BACK FACE (flipped) ── */
                      <div className="player-card-flipped" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span className="player-card-name" style={{ fontSize: 12, fontWeight: 800 }}>{player.name}</span>
                          {s?.age != null && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({s.age})</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* League */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--text-secondary)' }}>
                            {leagueLogo && (
                              <img src={leagueLogo} alt="" width={13} height={13} style={{ objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                            {displayLeague}
                          </div>
                          {/* Avg */}
                          {s?.seasonAvgRating != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg</span>
                              <RatingChip rating={s.seasonAvgRating} />
                            </div>
                          )}
                          {/* Last game */}
                          {lastOpponent && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <RatingChip rating={lastGameRating ?? null} />
                              <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>vs</span>
                              {lastOpponentTeamId && (
                                <img
                                  src={`https://images.fotmob.com/image_resources/logo/teamlogo/${lastOpponentTeamId}.png`}
                                  alt={lastOpponent} width={13} height={13} style={{ objectFit: 'contain' }}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{lastOpponent}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Last 5 bars */}
                          {s?.last5Games && s.last5Games.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>L5</span>
                              <Last5Bars games={s.last5Games} />
                            </div>
                          )}
                          {/* Rumour snippet */}
                          {playerRumours.length > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                              📰 {playerRumours[0].headline}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </DraggableCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default StatsTable;

function DraggableRow({ playerId, isOnPitch, children }: { playerId: string; isOnPitch: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: playerId });
  return (
    <tr
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${isDragging ? 'dragging-row' : ''} ${isOnPitch ? 'on-pitch' : ''}`}
      style={{ cursor: 'grab' }}
    >
      {children}
    </tr>
  );
}

function DraggableCard({ playerId, isOnPitch, children }: { playerId: string; isOnPitch: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: playerId });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`player-card ${isOnPitch ? 'on-pitch' : ''}`}
      style={{ cursor: 'grab', opacity: isDragging ? 0.35 : 1, flexDirection: 'column', alignItems: 'stretch' }}
    >
      {children}
    </div>
  );
}

function RatingChip({ rating, title }: { rating: number | null; title?: string }) {
  const cls = getRatingClass(rating);
  return (
    <span className={`rating-chip ${cls}`} title={title}>
      {rating != null ? rating.toFixed(1) : '—'}
    </span>
  );
}

function Last5Bars({ games }: { games: { rating: number | null; minutesPlayed: number }[] }) {
  const padded = [...games, ...Array(Math.max(0, 5 - games.length)).fill(null)].slice(0, 5);
  return (
    <div className="rating-bars">
      {padded.map((g, i) => {
        const rating = g?.rating ?? null;
        const played = g?.minutesPlayed && g.minutesPlayed > 0;
        const h = getRatingBarHeight(rating);
        const color = !played && g !== null ? 'rgba(255,255,255,0.06)' : getRatingColor(rating);
        return (
          <div
            key={i}
            className="rating-bar"
            title={rating != null ? `${rating.toFixed(1)}` : !played && g ? 'Did not play' : 'No data'}
            style={{ height: `${h}px`, background: color, opacity: g === null ? 0.15 : 1 }}
          />
        );
      })}
    </div>
  );
}

function RumoursCell({
  playerId,
  rumours,
  onAdd,
  onDelete,
}: {
  playerId: string;
  rumours: TransferRumour[];
  onAdd: () => void;
  onDelete: (rumourId: string) => void;
}) {
  return (
    <div className="rumours-cell-container" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 160 }}>
      {rumours.map(r => (
        <div key={r.id} className="rumour-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: r.isManual ? 'rgba(255,255,255,0.03)' : undefined, padding: r.isManual ? '4px 6px' : '0 6px', borderRadius: 4 }}>
          {r.targetClubLogo ? (
            <img
              src={r.targetClubLogo}
              alt=""
              width={14}
              height={14}
              style={{ objectFit: 'contain', marginTop: 2, flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : r.targetClubId ? (
            <img
              src={`https://images.fotmob.com/image_resources/logo/teamlogo/${r.targetClubId}.png`}
              alt=""
              width={14}
              height={14}
              style={{ objectFit: 'contain', marginTop: 2, flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          <div style={{ flex: 1, minWidth: 0, fontSize: 11 }}>
            {r.isManual && <span className="rumour-manual-badge" style={{ marginRight: 4, background: 'rgba(213,43,30,0.15)', color: '#ff6b6b', padding: '0px 3px', borderRadius: 2, fontSize: 9, fontWeight: 'bold' }}>Manual</span>}
            <span className="rumour-text" title={r.headline} style={{ color: 'var(--text-primary)', wordBreak: 'break-word', display: 'block', lineHeight: '1.2' }}>{r.headline}</span>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
              {r.source} · {formatDate(r.date)}
            </div>
          </div>
          {r.isManual && (
            <button
              className="btn btn-danger"
              style={{ padding: '0px 3px', fontSize: 10, flexShrink: 0, border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={e => { e.stopPropagation(); onDelete(r.id); }}
              onPointerDown={e => e.stopPropagation()}
              title="Delete rumour"
            >×</button>
          )}
        </div>
      ))}
      <button
        className="add-rumour-btn"
        onClick={e => { e.stopPropagation(); onAdd(); }}
        onPointerDown={e => e.stopPropagation()}
        style={{ alignSelf: 'flex-start', marginTop: rumours.length > 0 ? 2 : 0, fontSize: 10, padding: '2px 6px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 4, background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
      >
        + Add Rumour
      </button>
    </div>
  );
}
