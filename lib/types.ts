export type Position =
  | 'GK'
  | 'LB' | 'LCB' | 'CB' | 'RCB' | 'RB'
  | 'LWB' | 'RWB'
  | 'LDM' | 'DM' | 'RDM'
  | 'LCM' | 'CM' | 'RCM'
  | 'LM' | 'RM'
  | 'LAM' | 'CAM' | 'RAM'
  | 'LW' | 'RW'
  | 'LS' | 'CF' | 'ST' | 'RS' | 'SS';

export interface Player {
  id: string;
  name: string;
  positions: Position[]; // fallback
  club: string;
  league: string;
  fotmob_id: number;
  fotmob_url?: string;
}

export interface GameRating {
  date: string;
  opponent: string;
  rating: number | null;
  minutesPlayed: number;
  competition: string;
}

export interface PlayerStats {
  playerId: string;
  appearances: number;
  goals: number;
  assists: number;
  seasonAvgRating: number | null;
  last5Games: GameRating[];
  last5AvgRating: number | null;
  lastGameRating: number | null;
  lastGameDate: string | null;
  currentSeason: string;
  injured: boolean;
  club: string;
  league: string;
  positionsDetailed: string[];
  rumour?: string;
  // FotMob enriched fields
  kitNumber?: number;
  age?: number;
  marketValue?: string;
  teamId?: number;
  leagueId?: number;
}

export interface TransferRumour {
  id: string;
  playerId: string;
  headline: string;
  date: string;
  source: string;
  isManual: boolean;
  targetClub?: string;
  targetClubId?: number;
  targetClubLogo?: string;
  feeOriginal?: string;
  feeAmount?: number;
  currency?: string;
}

export interface StatsCache {
  lastUpdated: string;
  players: Record<string, PlayerStats>;
  rumours: Record<string, TransferRumour[]>;
}

export type Formation =
  | '4-4-2'
  | '4-3-3-CDM'
  | '4-2-3-1'
  | '5-4-1'
  | '5-3-2'
  | '3-5-2'
  | '3-4-3';

export interface FormationSlot {
  id: string;
  position: Position;
  x: number;
  y: number;
  label: string;
}

export interface LineupState {
  formation: Formation;
  slots: Record<string, string | null>;
}
