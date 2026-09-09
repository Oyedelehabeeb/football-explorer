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

export const PRIORITY_TOURNAMENTS = [
  { id: 2, name: 'UEFA Champions League' },
  { id: 3, name: 'UEFA Europa League' },
  { id: 848, name: 'UEFA Europa Conference League' },
  { id: 1, name: 'World Cup' },
  { id: 15, name: 'FIFA Club World Cup' },
  { id: 4, name: 'Euro Championship' },
  { id: 5, name: 'UEFA Nations League' },
  { id: 531, name: 'UEFA Super Cup' },
] as const

const tournamentIdPriority = new Map<number, number>(PRIORITY_TOURNAMENTS.map((tournament, index) => [tournament.id, index]))
const tournamentNamePriority = new Map<string, number>(PRIORITY_TOURNAMENTS.map((tournament, index) => [tournament.name.toLocaleLowerCase(), index]))

export const PRIORITY_DOMESTIC_CUPS = [
  { id: 45, name: 'FA Cup', country: 'England' },
  { id: 48, name: 'League Cup', country: 'England' },
  { id: 528, name: 'Community Shield', country: 'England' },
  { id: 143, name: 'Copa del Rey', country: 'Spain' },
  { id: 556, name: 'Super Cup', country: 'Spain' },
  { id: 137, name: 'Coppa Italia', country: 'Italy' },
  { id: 547, name: 'Super Cup', country: 'Italy' },
  { id: 81, name: 'DFB Pokal', country: 'Germany' },
  { id: 529, name: 'Super Cup', country: 'Germany' },
  { id: 66, name: 'Coupe de France', country: 'France' },
  { id: 526, name: 'Trophée des Champions', country: 'France' },
  { id: 96, name: 'Taça de Portugal', country: 'Portugal' },
  { id: 97, name: 'Taça da Liga', country: 'Portugal' },
  { id: 550, name: 'Super Cup', country: 'Portugal' },
  { id: 90, name: 'KNVB Beker', country: 'Netherlands' },
  { id: 543, name: 'Super Cup', country: 'Netherlands' },
] as const

const domesticCupPriority = new Map<number, number>(PRIORITY_DOMESTIC_CUPS.map((competition, index) => [competition.id, index]))

export function compareLeaguePriority(a: number, b: number) {
  return (priority.get(a) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b) ?? Number.MAX_SAFE_INTEGER)
}

interface PrioritizableCompetition {
  league: { id: number; name: string }
}

function competitionPriority(competition: PrioritizableCompetition) {
  const tournamentRank = tournamentIdPriority.get(competition.league.id) ?? tournamentNamePriority.get(competition.league.name.toLocaleLowerCase())
  if (tournamentRank !== undefined) return tournamentRank

  const leagueRank = priority.get(competition.league.id)
  if (leagueRank !== undefined) return PRIORITY_TOURNAMENTS.length + leagueRank

  const cupRank = domesticCupPriority.get(competition.league.id)
  return cupRank === undefined ? Number.MAX_SAFE_INTEGER : PRIORITY_TOURNAMENTS.length + PRIORITY_LEAGUES.length + cupRank
}

export function compareCompetitionPriority(a: PrioritizableCompetition, b: PrioritizableCompetition) {
  return competitionPriority(a) - competitionPriority(b)
}
