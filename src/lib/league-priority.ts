export const PRIORITY_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  { id: 61, name: 'Ligue 1', country: 'France' },
  { id: 94, name: 'Primeira Liga', country: 'Portugal' },
  { id: 88, name: 'Eredivisie', country: 'Netherlands' },
] as const

export const PRIORITY_LEAGUE_IDS = PRIORITY_LEAGUES.map((league) => league.id)

const priority = new Map<number, number>(PRIORITY_LEAGUE_IDS.map((id, index) => [id, index]))

export function compareLeaguePriority(a: number, b: number) {
  return (priority.get(a) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b) ?? Number.MAX_SAFE_INTEGER)
}
