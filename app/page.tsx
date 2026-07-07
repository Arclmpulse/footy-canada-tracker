'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import PitchView from '@/components/PitchView';
import StatsTable from '@/components/StatsTable';
import RumourModal from '@/components/RumourModal';
import LeagueFilterModal from '@/components/LeagueFilterModal';
import { Formation, LineupState, Player, PlayerStats, StatsCache, TransferRumour } from '@/lib/types';
import { FORMATIONS } from '@/lib/formations';

const DEFAULT_LINEUP: LineupState = {
  formation: '4-4-2',
  slots: {},
};

const LINEUP_STORAGE_KEY = 'canada-tracker-lineup';

const STADIUMS = [
  { id: 'opaque', name: 'Solid Dark Theme', url: '' },
  { id: 'bmo-field', name: 'BMO Field (Toronto)', url: 'https://storage.googleapis.com/canpl/assets/617f69ca-e182-4f78-8f9d-9dd799ae2af1.png' },
  { id: 'stade-saputo', name: 'Stade Saputo (Montreal)', url: 'https://image-tc.galaxy.tf/wijpeg-czumzpyhcyzfyd9pgtqputxqm/saputo-stadium.jpg' },
  { id: 'bc-place', name: 'BC Place (Vancouver)', url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/BC_Place_2015_Women%27s_FIFA_World_Cup.jpg' },
];

export default function DashboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [rumours, setRumours] = useState<Record<string, TransferRumour[]>>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [lineup, setLineup] = useState<LineupState>(DEFAULT_LINEUP);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rumourdModal, setRumourModal] = useState<{ playerId: string; playerName: string } | null>(null);
  const [activeLeagues, setActiveLeagues] = useState<Set<string>>(new Set());
  const [showLeagueFilter, setShowLeagueFilter] = useState(false);
  const [stadium, setStadium] = useState('bmo-field');

  // Load stadium background from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('canada-tracker-stadium');
      if (saved) setStadium(saved);
    } catch { }
  }, []);

  const handleStadiumChange = (id: string) => {
    setStadium(id);
    try {
      localStorage.setItem('canada-tracker-stadium', id);
    } catch { }
  };

  const activeStadium = STADIUMS.find(s => s.id === stadium) || STADIUMS[0];

  const [manualRumours, setManualRumours] = useState<Record<string, TransferRumour[]>>({});
  const [deletedRumourIds, setDeletedRumourIds] = useState<Set<string>>(new Set());

  // Load manual rumours from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('canada-tracker-manual-rumours');
      if (saved) {
        setManualRumours(JSON.parse(saved));
      }
    } catch { }
  }, []);

  // Load deleted rumours from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('canada-tracker-deleted-rumours');
      if (saved) {
        setDeletedRumourIds(new Set(JSON.parse(saved)));
      }
    } catch { }
  }, []);

  const mergedRumours = useMemo(() => {
    const merged = { ...rumours };
    for (const [pid, list] of Object.entries(manualRumours)) {
      const existingIds = new Set((merged[pid] ?? []).map(r => r.id));
      const uniqueManual = (list ?? []).filter(r => !existingIds.has(r.id));
      merged[pid] = [...uniqueManual, ...(merged[pid] ?? [])];
    }

    // Filter out deleted rumours (e.g. server-side pre-baked rumours)
    for (const pid of Object.keys(merged)) {
      merged[pid] = (merged[pid] ?? []).filter(r => !deletedRumourIds.has(r.id));
    }

    return merged;
  }, [rumours, manualRumours, deletedRumourIds]);

  // ──── Fetch stats from local backend ────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data: { cache: StatsCache; players: Player[] } = await res.json();
      setPlayers(data.players ?? []);
      setStats(data.cache?.players ?? {});
      setRumours(data.cache?.rumours ?? {});
      setLastUpdated(data.cache?.lastUpdated ?? '');
      // Initialise league filter with all leagues enabled
      setActiveLeagues(prev => {
        if (prev.size === 0 && data.players?.length) {
          return new Set(data.players.map((p: Player) => p.league || 'Unknown'));
        }
        return prev;
      });
      return data;
    } catch (err) {
      console.error('[Dashboard] Failed to load stats:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().then(data => {
      if (!data) return;
      const cachedTime = data.cache?.lastUpdated;

      // Auto-trigger FotMob sync on page load if cache is empty or older than 4 hours
      let needsAutoSync = false;
      if (!cachedTime) {
        needsAutoSync = true;
      } else {
        const diffMs = new Date().getTime() - new Date(cachedTime).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 4) {
          needsAutoSync = true;
        }
      }

      if (needsAutoSync) {
        handleRefreshStats();
      }
    });

    // Auto-refresh from stats cache every 3 minutes
    const interval = setInterval(fetchData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ──── Persist lineup to localStorage ────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LINEUP_STORAGE_KEY);
      if (saved) {
        const parsed: LineupState = JSON.parse(saved);
        setLineup(parsed);
      }
    } catch { }
  }, []);

  const saveLineup = useCallback((next: LineupState) => {
    setLineup(next);
    try {
      localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(next));
    } catch { }
  }, []);

  // ──── DnD ────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const playerId = active.id as string;
    const slotId = over.id as string;

    const formation = lineup.formation;
    const validSlot = FORMATIONS[formation].find(s => s.id === slotId);
    if (!validSlot) return;

    const newSlots = { ...lineup.slots };

    // Remove player from old slots if assigned
    for (const [sid, pid] of Object.entries(newSlots)) {
      if (pid === playerId) delete newSlots[sid];
    }

    newSlots[slotId] = playerId;
    saveLineup({ ...lineup, slots: newSlots });
  };

  const handleFormationChange = (f: Formation) => {
    saveLineup({ formation: f, slots: {} });
  };

  const handleSlotClick = (slotId: string) => {
    // Clicking slot cycles details inside token component
  };

  const handleRemovePlayer = (slotId: string) => {
    const newSlots = { ...lineup.slots };
    if (newSlots[slotId]) {
      delete newSlots[slotId];
      saveLineup({ ...lineup, slots: newSlots });
    }
  };

  // ──── Refresh stats by triggering backend sync ────────────────────────────
  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/scrape');
      const data = await res.json();
      if (data.ok) {
        await fetchData();
      } else {
        alert(data.error || 'Scrape failed');
      }
    } catch (err) {
      console.error('[Dashboard] Scrape error:', err);
      alert('An error occurred while updating stats.');
    } finally {
      setRefreshing(false);
    }
  };

  // ──── Manual Rumour Handlers ────────────────────────────
  const handleAddRumour = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setRumourModal({ playerId, playerName: player.name });
  };

  const handleSaveRumour = async (rumourData: {
    headline: string;
    source: string;
    targetClub?: string;
    targetClubId?: number;
    feeOriginal?: string;
    feeAmount?: number;
    currency?: string;
  }) => {
    if (!rumourdModal) return;
    const { playerId } = rumourdModal;

    const newRumour: TransferRumour = {
      id: 'rumour-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      playerId,
      headline: rumourData.headline || '',
      source: rumourData.source || 'Manual',
      date: new Date().toISOString().split('T')[0],
      isManual: true,
      targetClub: rumourData.targetClub || undefined,
      targetClubId: rumourData.targetClubId ? parseInt(rumourData.targetClubId as any, 10) : undefined,
      feeOriginal: rumourData.feeOriginal || undefined,
      feeAmount: rumourData.feeAmount ? parseFloat(rumourData.feeAmount as any) : undefined,
      currency: rumourData.currency || undefined,
    };

    // 1. Save client-side (local storage)
    const nextManual = {
      ...manualRumours,
      [playerId]: [newRumour, ...(manualRumours[playerId] ?? [])],
    };
    setManualRumours(nextManual);
    try {
      localStorage.setItem('canada-tracker-manual-rumours', JSON.stringify(nextManual));
    } catch { }

    // 2. Attempt POST to API (fails silently in read-only hosting)
    try {
      await fetch('/api/rumours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, ...rumourData }),
      });
    } catch (err) {
      console.warn('API save failed (likely read-only hosting like Vercel). Using client-side storage.', err);
    }

    setRumourModal(null);
  };

  const handleDeleteRumour = async (playerId: string, rumourId?: string) => {
    // 1. Delete client-side (local storage)
    const nextManual = { ...manualRumours };
    if (nextManual[playerId]) {
      if (rumourId) {
        nextManual[playerId] = (nextManual[playerId] ?? []).filter(r => r.id !== rumourId);
      } else {
        delete nextManual[playerId];
      }
      setManualRumours(nextManual);
      try {
        localStorage.setItem('canada-tracker-manual-rumours', JSON.stringify(nextManual));
      } catch { }
    }

    // 2. Track deleted backend rumours in localStorage
    if (rumourId) {
      setDeletedRumourIds(prev => {
        const next = new Set(prev);
        next.add(rumourId);
        try {
          localStorage.setItem('canada-tracker-deleted-rumours', JSON.stringify([...next]));
        } catch { }
        return next;
      });
    }

    // 3. Attempt DELETE to API (fails silently in read-only hosting)
    try {
      const url = rumourId
        ? `/api/rumours?playerId=${playerId}&id=${rumourId}`
        : `/api/rumours?playerId=${playerId}`;
      await fetch(url, { method: 'DELETE' });
    } catch (err) {
      console.warn('API delete failed (likely read-only hosting like Vercel). Using client-side storage.', err);
    }
  };

  // ──── Derived ────────────────────────────
  const lineupPlayerIds = new Set(
    Object.values(lineup.slots).filter(Boolean) as string[]
  );

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never synced — pull stats from FotMob';
    const d = new Date(lastUpdated);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    const timeStr = d.toLocaleString('en-CA', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZoneName: 'short',
    });
    const fresh = diffH < 4;
    return { timeStr, fresh };
  };

  const updatedInfo = formatLastUpdated();
  const isFresh = typeof updatedInfo !== 'string' ? updatedInfo.fresh : false;
  const updatedLabel = typeof updatedInfo === 'string' ? updatedInfo : `Updated ${updatedInfo.timeStr}`;

  return (
    <div
      className={`app-shell ${stadium === 'opaque' ? 'theme-opaque' : 'theme-glass'}`}
      style={activeStadium.url ? { backgroundImage: `url(${activeStadium.url})` } : undefined}
    >
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/canada-soccer-logo.png"
            alt="Canada Soccer Logo"
            width={34}
            height={34}
            style={{ objectFit: 'contain', marginRight: 10 }}
          />
          <div>
            <div className="app-header-title">Canada Footy Tracker</div>
            <div className="app-header-subtitle">National Team Scouting Dashboard</div>
          </div>
        </div>
        <div className="app-header-actions">
          <select
            className="stadium-select"
            value={stadium}
            onChange={e => handleStadiumChange(e.target.value)}
            title="Change stadium background"
          >
            {STADIUMS.map(s => (
              <option key={s.id} value={s.id}>🏟 {s.name}</option>
            ))}
          </select>
          <button
            className="btn btn-ghost"
            onClick={() => setShowLeagueFilter(true)}
            disabled={loading}
            title="Filter visible leagues"
          >
            <span className="btn-icon">⚙</span>
            Leagues
          </button>
          <button
            className="btn btn-primary"
            onClick={handleRefreshStats}
            disabled={refreshing || loading}
            title="Sync latest player stats and ratings automatically from FotMob"
          >
            {refreshing ? (
              <>
                <span className="spinner" />
                Syncing FotMob…
              </>
            ) : (
              <>
                <span className="btn-icon">↻</span>
                Sync Live Stats
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
          {/* Left: Pitch */}
          <PitchView
            formation={lineup.formation}
            onFormationChange={handleFormationChange}
            slots={lineup.slots}
            players={players}
            stats={stats}
            onSlotClick={handleSlotClick}
            onRemovePlayer={handleRemovePlayer}
          />

          {/* Right: Stats */}
          <div className="stats-panel">
            <div className="stats-panel-header">
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                Player Roster & live statistics
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Drag players to the pitch
              </span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: 10 }}>
                <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--canada-red)' }} />
                Loading players…
              </div>
            ) : (
              <StatsTable
                players={players}
                stats={stats}
                rumours={mergedRumours}
                lineupPlayerIds={lineupPlayerIds}
                activeLeagues={activeLeagues}
                onAddRumour={handleAddRumour}
                onDeleteRumour={handleDeleteRumour}
              />
            )}
          </div>
        </DndContext>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div className="footer-updated">
          <div className={`footer-dot ${isFresh ? '' : 'stale'}`} />
          <span>{updatedLabel}</span>
        </div>
        <span>🍁 Canada Footy Tracker · v1.2.1 · Automated FotMob API data synchronization</span>
      </footer>

      {/* ── Rumour Modal ── */}
      {rumourdModal && (
        <RumourModal
          playerName={rumourdModal.playerName}
          existingRumours={mergedRumours[rumourdModal.playerId] ?? []}
          onSave={handleSaveRumour}
          onDeleteRumour={rumourId => handleDeleteRumour(rumourdModal.playerId, rumourId)}
          onClose={() => setRumourModal(null)}
        />
      )}

      {showLeagueFilter && (
        <LeagueFilterModal
          players={players}
          activeLeagues={activeLeagues}
          onToggle={league => setActiveLeagues(prev => {
            const next = new Set(prev);
            if (next.has(league)) next.delete(league); else next.add(league);
            return next;
          })}
          onSelectAll={() => setActiveLeagues(new Set(players.map(p => p.league || 'Unknown')))}
          onClearAll={() => setActiveLeagues(new Set())}
          onClose={() => setShowLeagueFilter(false)}
        />
      )}
    </div>
  );
}
