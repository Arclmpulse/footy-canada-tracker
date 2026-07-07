import { Formation, FormationSlot } from './types';

// Each formation slot is defined by absolute left (x%) and top (y%) coordinates.
// Refined with specific Left/Right positions (LCB/RCB, LCM/RCM, LS/RS, etc.)
// to prevent identical slot overrides and make the tactician board look realistic.
export const FORMATIONS: Record<Formation, FormationSlot[]> = {
  '4-4-2': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lb',  position: 'LB',  x: 15, y: 64, label: 'LB' },
    { id: 'lcb', position: 'LCB', x: 35, y: 72, label: 'LCB' },
    { id: 'rcb', position: 'RCB', x: 65, y: 72, label: 'RCB' },
    { id: 'rb',  position: 'RB',  x: 85, y: 64, label: 'RB' },
    { id: 'lm',  position: 'LM',  x: 15, y: 35, label: 'LM' },
    { id: 'lcm', position: 'LCM', x: 35, y: 44, label: 'LCM' },
    { id: 'rcm', position: 'RCM', x: 65, y: 44, label: 'RCM' },
    { id: 'rm',  position: 'RM',  x: 85, y: 35, label: 'RM' },
    { id: 'ls',  position: 'LS',  x: 38, y: 14, label: 'LS' },
    { id: 'rs',  position: 'RS',  x: 62, y: 14, label: 'RS' },
  ],

  '4-3-3-CDM': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lb',  position: 'LB',  x: 15, y: 64, label: 'LB' },
    { id: 'lcb', position: 'LCB', x: 35, y: 72, label: 'LCB' },
    { id: 'rcb', position: 'RCB', x: 65, y: 72, label: 'RCB' },
    { id: 'rb',  position: 'RB',  x: 85, y: 64, label: 'RB' },
    { id: 'dm',  position: 'DM',  x: 50, y: 52, label: 'CDM' },
    { id: 'lcm', position: 'LCM', x: 30, y: 40, label: 'LCM' },
    { id: 'rcm', position: 'RCM', x: 70, y: 40, label: 'RCM' },
    { id: 'lw',  position: 'LW',  x: 15, y: 18, label: 'LW' },
    { id: 'st',  position: 'ST',  x: 50, y: 12, label: 'ST' },
    { id: 'rw',  position: 'RW',  x: 85, y: 18, label: 'RW' },
  ],

  '4-2-3-1': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lb',  position: 'LB',  x: 15, y: 64, label: 'LB' },
    { id: 'lcb', position: 'LCB', x: 35, y: 72, label: 'LCB' },
    { id: 'rcb', position: 'RCB', x: 65, y: 72, label: 'RCB' },
    { id: 'rb',  position: 'RB',  x: 85, y: 64, label: 'RB' },
    { id: 'ldm', position: 'LDM', x: 35, y: 54, label: 'LDM' },
    { id: 'rdm', position: 'RDM', x: 65, y: 54, label: 'RDM' },
    { id: 'lam', position: 'LAM', x: 15, y: 32, label: 'LAM' },
    { id: 'cam', position: 'CAM', x: 50, y: 32, label: 'CAM' },
    { id: 'ram', position: 'RAM', x: 85, y: 32, label: 'RAM' },
    { id: 'st',  position: 'ST',  x: 50, y: 12, label: 'ST' },
  ],

  '5-4-1': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lwb', position: 'LWB', x: 14, y: 60, label: 'LWB' },
    { id: 'lcb', position: 'LCB', x: 30, y: 72, label: 'LCB' },
    { id: 'cb',  position: 'CB',  x: 50, y: 72, label: 'CB' },
    { id: 'rcb', position: 'RCB', x: 70, y: 72, label: 'RCB' },
    { id: 'rwb', position: 'RWB', x: 86, y: 60, label: 'RWB' },
    { id: 'lm',  position: 'LM',  x: 20, y: 38, label: 'LM' },
    { id: 'lcm', position: 'LCM', x: 40, y: 42, label: 'LCM' },
    { id: 'rcm', position: 'RCM', x: 60, y: 42, label: 'RCM' },
    { id: 'rm',  position: 'RM',  x: 80, y: 38, label: 'RM' },
    { id: 'st',  position: 'ST',  x: 50, y: 15, label: 'ST' },
  ],

  '5-3-2': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lwb', position: 'LWB', x: 14, y: 60, label: 'LWB' },
    { id: 'lcb', position: 'LCB', x: 30, y: 72, label: 'LCB' },
    { id: 'cb',  position: 'CB',  x: 50, y: 72, label: 'CB' },
    { id: 'rcb', position: 'RCB', x: 70, y: 72, label: 'RCB' },
    { id: 'rwb', position: 'RWB', x: 86, y: 60, label: 'RWB' },
    { id: 'lcm', position: 'LCM', x: 30, y: 42, label: 'LCM' },
    { id: 'cm',  position: 'CM',  x: 50, y: 46, label: 'CM' },
    { id: 'rcm', position: 'RCM', x: 70, y: 42, label: 'RCM' },
    { id: 'ls',  position: 'LS',  x: 38, y: 16, label: 'LS' },
    { id: 'rs',  position: 'RS',  x: 62, y: 16, label: 'RS' },
  ],

  '3-5-2': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lcb', position: 'LCB', x: 25, y: 72, label: 'LCB' },
    { id: 'cb',  position: 'CB',  x: 50, y: 72, label: 'CB' },
    { id: 'rcb', position: 'RCB', x: 75, y: 72, label: 'RCB' },
    { id: 'lwb', position: 'LWB', x: 15, y: 56, label: 'LWB' },
    { id: 'lcm', position: 'LCM', x: 33, y: 44, label: 'LCM' },
    { id: 'dm',  position: 'DM',  x: 50, y: 48, label: 'CDM' },
    { id: 'rcm', position: 'RCM', x: 67, y: 44, label: 'RCM' },
    { id: 'rwb', position: 'RWB', x: 85, y: 56, label: 'RWB' },
    { id: 'ls',  position: 'LS',  x: 38, y: 16, label: 'LS' },
    { id: 'rs',  position: 'RS',  x: 62, y: 16, label: 'RS' },
  ],

  '3-4-3': [
    { id: 'gk',  position: 'GK',  x: 50, y: 88, label: 'GK' },
    { id: 'lcb', position: 'LCB', x: 25, y: 72, label: 'LCB' },
    { id: 'cb',  position: 'CB',  x: 50, y: 72, label: 'CB' },
    { id: 'rcb', position: 'RCB', x: 75, y: 72, label: 'RCB' },
    { id: 'lm',  position: 'LM',  x: 15, y: 46, label: 'LM' },
    { id: 'lcm', position: 'LCM', x: 38, y: 46, label: 'LCM' },
    { id: 'rcm', position: 'RCM', x: 62, y: 46, label: 'RCM' },
    { id: 'rm',  position: 'RM',  x: 85, y: 46, label: 'RM' },
    { id: 'lw',  position: 'LW',  x: 15, y: 18, label: 'LW' },
    { id: 'st',  position: 'ST',  x: 50, y: 15, label: 'ST' },
    { id: 'rw',  position: 'RW',  x: 85, y: 18, label: 'RW' },
  ],
};

export const FORMATION_LABELS: Record<Formation, string> = {
  '4-4-2': '4-4-2',
  '4-3-3-CDM': '4-3-3 (CDM)',
  '4-2-3-1': '4-2-3-1',
  '5-4-1': '5-4-1',
  '5-3-2': '5-3-2',
  '3-5-2': '3-5-2',
  '3-4-3': '3-4-3',
};
