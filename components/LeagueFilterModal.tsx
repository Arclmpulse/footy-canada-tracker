'use client';

import React, { useMemo, useEffect } from 'react';
import { Player } from '@/lib/types';

interface LeagueFilterModalProps {
  players: Player[];
  activeLeagues: Set<string>;
  onToggle: (league: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export default function LeagueFilterModal({
  players,
  activeLeagues,
  onToggle,
  onSelectAll,
  onClearAll,
  onClose,
}: LeagueFilterModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const leagues = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) {
      const l = p.league || 'Unknown';
      map.set(l, (map.get(l) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [players]);

  const allSelected = leagues.every(([l]) => activeLeagues.has(l));
  const noneSelected = leagues.every(([l]) => !activeLeagues.has(l));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, width: '90%', padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="modal-title" style={{ margin: 0, fontSize: 16 }}>Filter Leagues</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <div className="league-filter-actions" style={{ marginBottom: 14 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={onSelectAll}
            disabled={allSelected}
          >
            Select All
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={onClearAll}
            disabled={noneSelected}
          >
            Clear All
          </button>
        </div>

        {/* 3-column grid for checkbox list */}
        <div
          className="league-filter-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px 16px',
            maxHeight: 280,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {leagues.map(([league, count]) => {
            const isActive = activeLeagues.has(league);
            return (
              <label
                key={league}
                className="league-filter-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: 12.5,
                  transition: 'background var(--transition)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => onToggle(league)}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: 'var(--canada-red)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}
                  title={league}
                >
                  {league}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-elevated)',
                    borderRadius: '999px',
                    padding: '1px 6px',
                    flexShrink: 0,
                  }}
                >
                  {count}
                </span>
              </label>
            );
          })}
        </div>

        <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: 12, padding: '6px 14px' }}>
            Done ({activeLeagues.size} leagues)
          </button>
        </div>
      </div>
    </div>
  );
}
