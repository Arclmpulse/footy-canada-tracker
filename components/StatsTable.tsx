'use client';

import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Player, PlayerStats, TransferRumour } from '@/lib/types';
import { getRatingClass, getRatingColor, getRatingBarHeight, formatDate } from './utils';

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

export default function StatsTable({
  players,
  stats,
  rumours,
  lineupPlayerIds,
  activeLeagues,
  onAddRumour,
  onDeleteRumour,
}: StatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(
    () => players.filter(p => activeLeagues.has(p.league || 'Unknown')),
    [players, activeLeagues]
  );

  const sorted = useMemo(() => {
    const posOrder: Record<string, number> = {
      GK: 0,
      LWB: 1, RWB: 1,
      LB: 2, RB: 2,
      LCB: 3, CB: 3, RCB: 3,
      LDM: 6, DM: 6, RDM: 6,
      LCM: 7, CM: 7, RCM: 7,
      LM: 8, RM: 8,
      LAM: 10, CAM: 10, RAM: 10,
      LW: 11, RW: 11,
      LS: 13, ST: 13, RS: 13, SS: 13, CF: 13,
    };

    return [...filtered].sort((a, b) => {
      const sa = stats[a.id];
      const sb = stats[b.id];
      let av: number | string | null = null;
      let bv: number | string | null = null;

      const aPos = sa?.positionsDetailed?.[0] ?? a.positions[0] ?? 'ST';
      const bPos = sb?.positionsDetailed?.[0] ?? b.positions[0] ?? 'ST';

      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break;
        case 'position': av = posOrder[aPos] ?? 99; bv = posOrder[bPos] ?? 99; break;
        case 'club': av = sa?.club ?? a.club; bv = sb?.club ?? b.club; break;
        case 'league': av = sa?.league ?? a.league; bv = sb?.league ?? b.league; break;
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
            if (v.includes('m')) return n * 1_000_000;
            if (v.includes('k')) return n * 1_000;
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
  }, [filtered, stats, sortKey, sortDir]);

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

            const displayPositions = s?.positionsDetailed && s.positionsDetailed.length > 0
              ? s.positionsDetailed.join(' / ')
              : player.positions.join(' / ');
            const primaryPosition = s?.positionsDetailed?.[0] ?? player.positions[0] ?? 'ST';

            const displayClub = s?.club || player.club;
            const displayLeague = s?.league || player.league;
            const teamLogo = teamLogoUrl(s?.teamId);
            const leagueLogo = leagueLogoUrl(s?.leagueId);

            const playerManualRumours = (rumours[player.id] ?? []).filter(r => r.isManual);
            const displayRumours: TransferRumour[] = playerManualRumours.length > 0
              ? playerManualRumours
              : s?.rumour
                ? [{ id: 'auto-' + player.id, playerId: player.id, headline: s.rumour, source: 'FotMob', date: s.lastGameDate || '', isManual: false } as TransferRumour]
                : [];

            return (
              <DraggableRow key={player.id} playerId={player.id} isOnPitch={isOnPitch}>
                {/* Position */}
                <td>
                  <span className={`pos-badge ${primaryPosition}`} title={`All positions: ${displayPositions}`}>
                    {displayPositions}
                  </span>
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
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{displayClub}</span>
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
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{displayLeague}</span>
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

                {/* Last 5 mini bars */}
                <td><Last5Bars games={s?.last5Games ?? []} /></td>



                {/* Season Avg */}
                <td><RatingChip rating={s?.seasonAvgRating ?? null} /></td>

                {/* Last Game */}
                <td>
                  {s?.lastGameRating != null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <RatingChip rating={s.lastGameRating} />
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{formatDate(s.lastGameDate)}</span>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>

                {/* Market Value */}
                <td style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
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
    </div>
  );
}

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

function RatingChip({ rating }: { rating: number | null }) {
  const cls = getRatingClass(rating);
  return (
    <span className={`rating-chip ${cls}`}>
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
          {r.targetClubId && (
            <img
              src={`https://images.fotmob.com/image_resources/logo/teamlogo/${r.targetClubId}.png`}
              alt=""
              width={14}
              height={14}
              style={{ objectFit: 'contain', marginTop: 2, flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
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
