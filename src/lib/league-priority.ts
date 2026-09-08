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

const PRIORITY_TOURNAMENTS = [
  'World Cup',
  'UEFA Champions League',
  'Euro Championship',
  'UEFA Europa League',
  'UEFA Nations League',
  'UEFA Europa Conference League',
  'UEFA Super Cup',
  'FIFA Club World Cup',
] as const

const tournamentPriority = new Map<string, number>(PRIORITY_TOURNAMENTS.map((name, index) => [name.toLocaleLowerCase(), index]))

export function compareLeaguePriority(a: number, b: number) {
  return (priority.get(a) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b) ?? Number.MAX_SAFE_INTEGER)
}

interface PrioritizableCompetition {
  league: { id: number; name: string }
}

function competitionPriority(competition: PrioritizableCompetition) {
  const leagueRank = priority.get(competition.league.id)
  if (leagueRank !== undefined) return leagueRank

  const tournamentRank = tournamentPriority.get(competition.league.name.toLocaleLowerCase())
  return tournamentRank === undefined ? Number.MAX_SAFE_INTEGER : PRIORITY_LEAGUES.length + tournamentRank
}

export function compareCompetitionPriority(a: PrioritizableCompetition, b: PrioritizableCompetition) {
  return competitionPriority(a) - competitionPriority(b)
}
