'use client';

import React, { useState, useEffect } from 'react';
import { TransferRumour } from '@/lib/types';

interface RumourModalProps {
  playerName: string;
  existingRumours: TransferRumour[];
  onSave: (data: {
    id?: string;
    headline: string;
    source: string;
    targetClub?: string;
    targetClubId?: number;
    feeOriginal?: string;
    feeAmount?: number;
    currency?: string;
  }) => void;
  onDeleteRumour: (rumourId: string) => void;
  onClose: () => void;
}

export default function RumourModal({
  playerName,
  existingRumours = [],
  onSave,
  onDeleteRumour,
  onClose,
}: RumourModalProps) {
  const [headline, setHeadline] = useState('');
  const [source, setSource] = useState('');
  const [targetClubInput, setTargetClubInput] = useState('');
  const [feeInput, setFeeInput] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [resolvedTeam, setResolvedTeam] = useState<{ id: number; name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounced search for FotMob team suggest
  useEffect(() => {
    if (!targetClubInput.trim()) {
      setResolvedTeam(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-team?q=${encodeURIComponent(targetClubInput)}`);
        const data = await res.json();
        if (data.teamId) {
          setResolvedTeam({ id: data.teamId, name: data.teamName });
        } else {
          setResolvedTeam(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [targetClubInput]);

  const handleStartEdit = (r: TransferRumour) => {
    setEditingId(r.id);
    setHeadline(r.headline);
    setSource(r.source);
    setTargetClubInput(r.targetClub || '');
    if (r.targetClubId) {
      setResolvedTeam({ id: r.targetClubId, name: r.targetClub || '' });
    } else {
      setResolvedTeam(null);
    }
    if (r.feeOriginal) {
      const match = r.feeOriginal.match(/[\d.]+/);
      setFeeInput(match ? match[0] : '');
      if (r.feeOriginal.startsWith('£')) setCurrency('GBP');
      else if (r.feeOriginal.startsWith('$')) setCurrency('USD');
      else setCurrency('EUR');
    } else {
      setFeeInput('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setHeadline('');
    setSource('');
    setTargetClubInput('');
    setFeeInput('');
    setResolvedTeam(null);
  };

  const handleSave = () => {
    // We require either a headline OR a target club to save
    if (!headline.trim() && !targetClubInput.trim()) return;

    // Currency/fee calculation
    let feeOriginal: string | undefined;
    let feeAmount: number | undefined;

    if (feeInput.trim()) {
      const feeNum = parseFloat(feeInput);
      if (!isNaN(feeNum)) {
        let rate = 1.0;
        let symbol = '€';
        if (currency === 'GBP') {
          rate = 1.18;
          symbol = '£';
        } else if (currency === 'USD') {
          rate = 0.92;
          symbol = '$';
        }

        feeOriginal = `${symbol}${feeNum}m`;
        feeAmount = parseFloat((feeNum * rate).toFixed(2));
      }
    }

    let finalHeadline = headline.trim();
    if (!finalHeadline && targetClubInput.trim()) {
      const clubName = resolvedTeam?.name || targetClubInput.trim();
      if (feeOriginal) {
        finalHeadline = `Linked to ${clubName} for ${feeOriginal}`;
      } else {
        finalHeadline = `Rumoured interest from ${clubName}`;
      }
    }

    onSave({
      id: editingId || undefined,
      headline: finalHeadline,
      source: source.trim() || 'Manual',
      targetClub: resolvedTeam?.name || targetClubInput.trim() || undefined,
      targetClubId: resolvedTeam?.id || undefined,
      feeOriginal,
      feeAmount,
      currency: currency || undefined,
    });

    handleCancelEdit();
  };

  const handleOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const activeRumours = existingRumours;

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal" style={{ maxWidth: 480, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Transfer Rumours</h2>
          <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 16 }}>
          Manage rumours for <strong style={{ color: 'var(--text-primary)' }}>{playerName}</strong>
        </p>

        {/* Existing Rumours List */}
        {activeRumours.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>Active Rumours</h4>
            <div className="existing-rumours-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
              {activeRumours.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '4px 6px', background: 'var(--bg-elevated)', borderRadius: 4, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    {r.targetClubLogo ? (
                      <img
                        src={r.targetClubLogo}
                        alt=""
                        width={14}
                        height={14}
                        style={{ objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : r.targetClubId ? (
                      <img
                        src={`https://images.fotmob.com/image_resources/logo/teamlogo/${r.targetClubId}.png`}
                        alt=""
                        width={14}
                        height={14}
                        style={{ objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : null}
                    <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.headline}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({r.source})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r.isManual && (
                      <button
                        onClick={() => handleStartEdit(r)}
                        style={{ background: 'none', border: 'none', color: '#ffb300', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}
                        title="Edit rumour"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteRumour(r.id)}
                      style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', padding: '2px 4px' }}
                      title="Delete rumour"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>
          {editingId ? 'Edit Rumour' : 'Add New Rumour'}
        </h4>
        
        {/* Form Group: Target Club Autocomplete */}
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <label style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>Target Club</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="modal-input"
              placeholder="e.g. Juventus, Arsenal..."
              value={targetClubInput}
              onChange={e => setTargetClubInput(e.target.value)}
              style={{ margin: 0, flex: 1 }}
            />
            {/* Club Logo Preview */}
            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {resolvedTeam ? (
                <img
                  src={`https://images.fotmob.com/image_resources/logo/teamlogo/${resolvedTeam.id}.png`}
                  alt={resolvedTeam.name}
                  width={22}
                  height={22}
                  style={{ objectFit: 'contain' }}
                />
              ) : searching ? (
                <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>...</span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⚽</span>
              )}
            </div>
          </div>
          {resolvedTeam && (
            <div style={{ fontSize: 10, color: '#45d072', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✓ Auto-resolved: <strong>{resolvedTeam.name}</strong> (ID: {resolvedTeam.id})</span>
            </div>
          )}
        </div>

        {/* Form Group: Fee and Currency */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>Transfer Fee (Millions)</label>
            <input
              className="modal-input"
              type="number"
              step="any"
              placeholder="e.g. 15, 25.5..."
              value={feeInput}
              onChange={e => setFeeInput(e.target.value)}
              style={{ margin: 0 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>Currency</label>
            <select
              className="modal-input"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{ margin: 0, paddingRight: 24, cursor: 'pointer', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>

        {/* Form Group: Custom Headline */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Custom Headline (Optional)
          </label>
          <textarea
            className="modal-input"
            placeholder="If left blank, a headline will be generated automatically..."
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            rows={2}
            style={{ margin: 0 }}
          />
        </div>

        {/* Form Group: Source */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>Source</label>
          <input
            className="modal-input"
            placeholder="e.g. Fabrizio Romano, The Athletic..."
            value={source}
            onChange={e => setSource(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 0 }}>
          {editingId ? (
            <button className="btn btn-ghost" onClick={handleCancelEdit}>Cancel Edit</button>
          ) : (
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!headline.trim() && !targetClubInput.trim()}
          >
            {editingId ? 'Update Rumour' : 'Save Rumour'}
          </button>
        </div>
      </div>
    </div>
  );
}
