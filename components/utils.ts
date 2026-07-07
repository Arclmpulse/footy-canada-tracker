// Rating utility helpers — shared between PitchView and StatsTable

export type RatingClass = 'great' | 'good' | 'avg' | 'poor' | 'bad' | 'none';

export function getRatingClass(rating: number | null): RatingClass {
  if (rating === null) return 'none';
  if (rating >= 7.5) return 'great';
  if (rating >= 7.0) return 'good';
  if (rating >= 6.5) return 'avg';
  if (rating >= 6.0) return 'poor';
  return 'bad';
}

export function getRatingColor(rating: number | null): string {
  const cls = getRatingClass(rating);
  const map: Record<RatingClass, string> = {
    great: '#52e384',
    good: '#a8e63d',
    avg: '#f5c842',
    poor: '#f58a42',
    bad: '#e34a4a',
    none: 'rgba(255,255,255,0.35)',
  };
  return map[cls];
}

export function getRatingBarHeight(rating: number | null): number {
  if (rating === null) return 4;
  // Map 5.0–10.0 to 4–18px height
  return Math.max(4, Math.min(18, ((rating - 5) / 5) * 14 + 4));
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}
