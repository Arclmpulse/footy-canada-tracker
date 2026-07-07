'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Formation, FormationSlot, Player, PlayerStats } from '@/lib/types';
import { FORMATIONS, FORMATION_LABELS } from '@/lib/formations';
import { getRatingColor } from './utils';

interface PitchViewProps {
  formation: Formation;
  onFormationChange: (f: Formation) => void;
  slots: Record<string, string | null>;
  players: Player[];
  stats: Record<string, PlayerStats>;
  onSlotClick: (slotId: string) => void;
  onRemovePlayer: (slotId: string) => void;
}

export default function PitchView({
  formation,
  onFormationChange,
  slots,
  players,
  stats,
  onSlotClick,
  onRemovePlayer,
}: PitchViewProps) {
  const formationSlots = FORMATIONS[formation];

  return (
    <div className="pitch-panel">
      <div className="pitch-panel-header">
        <span className="pitch-panel-title">Lineup</span>
        <select
          className="formation-select"
          value={formation}
          onChange={e => onFormationChange(e.target.value as Formation)}
        >
          {(Object.keys(FORMATION_LABELS) as Formation[]).map(f => (
            <option key={f} value={f}>{FORMATION_LABELS[f]}</option>
          ))}
        </select>
      </div>

      <div className="pitch-outer">
        <div className="pitch">
          {/* FM Pitch Markings */}
          <div className="pitch-marking-outline" />
          <div className="pitch-marking-midline" />
          <div className="pitch-marking-center-circle" />
          <div className="pitch-marking-center-spot" />
          <div className="pitch-marking-penalty-top" />
          <div className="pitch-marking-penalty-bottom" />
          <div className="pitch-marking-six-yard-top" />
          <div className="pitch-marking-six-yard-bottom" />

          {/* Absolute-positioned player slots */}
          <div className="pitch-slots-abs">
            {formationSlots.map(slot => {
              const playerId = slots[slot.id] ?? null;
              const player = playerId ? players.find(p => p.id === playerId) : null;
              const playerStats = player ? stats[player.id] : null;

              return (
                <PitchSlot
                  key={slot.id}
                  slot={slot}
                  player={player ?? null}
                  stats={playerStats ?? null}
                  onClick={() => onSlotClick(slot.id)}
                  onRemove={() => onRemovePlayer(slot.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Individual Pitch Slot (absolute positioned)
// ─────────────────────────────────────────
type RatingMode = 'lastGame' | 'last5' | 'season';

function PitchSlot({
  slot,
  player,
  stats,
  onClick,
  onRemove,
}: {
  slot: FormationSlot;
  player: Player | null;
  stats: PlayerStats | null;
  onClick: () => void;
  onRemove: () => void;
}) {
  // Move the droppable node ref and drop state to the circular token element
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: slot.id });
  const [ratingMode, setRatingMode] = useState<RatingMode>('lastGame');

  const getRating = () => {
    if (!stats) return null;
    if (ratingMode === 'lastGame') return stats.lastGameRating;
    if (ratingMode === 'last5') return stats.last5AvgRating;
    return stats.seasonAvgRating;
  };

  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRatingMode(prev =>
      prev === 'lastGame' ? 'last5' : prev === 'last5' ? 'season' : 'lastGame'
    );
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  const rating = getRating();
  const ratingColor = rating ? getRatingColor(rating) : 'rgba(255,255,255,0.4)';
  const modeLabelMap: Record<RatingMode, string> = { lastGame: 'L', last5: '5', season: 'S' };

  // FotMob player face image URL
  const faceUrl = player?.fotmob_id
    ? `https://images.fotmob.com/image_resources/playerimages/${player.fotmob_id}.png`
    : null;

  return (
    <div
      className="pitch-slot-abs"
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
      onClick={player ? cycleMode : onClick}
      title={player ? `${player.name} — click to cycle rating view` : `Drop here (${slot.label})`}
    >
      <div
        ref={dropRef}
        className={`pitch-slot-token ${player ? 'filled' : 'empty'} ${isOver ? 'drag-over-slot' : ''}`}
      >
        {player ? (
          <>
            {/* Player face or silhouette */}
            {faceUrl ? (
              <img
                src={faceUrl}
                alt={player.name}
                className="player-face"
                onError={(e) => {
                  // Fallback to silhouette if face image fails
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display:block');
                }}
              />
            ) : null}
            <PlayerSilhouette hidden={!!faceUrl} />

            <div className="token-rating" style={{ color: ratingColor }}>
              {rating != null ? rating.toFixed(1) : '—'}
            </div>
            <div className="rating-mode-badge" title="Click player to cycle rating mode">
              {stats?.teamId ? (
                <img
                  src={`https://images.fotmob.com/image_resources/logo/teamlogo/${stats.teamId}.png`}
                  alt="Club logo"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain', padding: '1px', background: '#fff' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent && !parent.innerText) {
                      parent.innerText = modeLabelMap[ratingMode];
                    }
                  }}
                />
              ) : (
                modeLabelMap[ratingMode]
              )}
            </div>
            {stats?.leagueId && (
              <div className="token-league-badge" title={`Plays in ${stats.league}`}>
                <img
                  src={`https://images.fotmob.com/image_resources/logo/leaguelogo/${stats.leagueId}.png`}
                  alt="League logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1px', background: '#fff' }}
                />
              </div>
            )}
            <button
              className="token-remove-btn"
              onClick={handleRemoveClick}
              title="Remove from pitch"
            >
              ×
            </button>
          </>
        ) : (
          <PlayerSilhouette faded />
        )}
      </div>

      {player ? (
        <span className="pitch-slot-name">
          {player.name.split(' ').pop()}
          {stats?.injured && ' 🇨🇭'}
        </span>
      ) : (
        <span className="pitch-slot-label">{slot.label}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SVG Silhouette
// ─────────────────────────────────────────
function PlayerSilhouette({ faded = false, hidden = false }: { faded?: boolean; hidden?: boolean }) {
  return (
    <svg
      className="player-silhouette"
      viewBox="0 0 40 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: faded ? 0.25 : 1, display: hidden ? 'none' : undefined }}
    >
      <circle cx="20" cy="10" r="8" fill="rgba(255,255,255,0.85)" />
      <path
        d="M8 36 C8 24 12 20 20 20 C28 20 32 24 32 36 L30 56 H10 L8 36Z"
        fill="rgba(255,255,255,0.7)"
      />
      <path d="M8 36 L2 28 C1 26 3 24 5 26 L10 34" fill="rgba(255,255,255,0.5)" />
      <path d="M32 36 L38 28 C39 26 37 24 35 26 L30 34" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}
