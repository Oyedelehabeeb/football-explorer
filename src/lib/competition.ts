export type CompetitionType = 'League' | 'Cup'
export type CompetitionFilter = 'all' | 'league' | 'cup'

export interface CompetitionSeason {
  year: number
  start: string
  end: string
  current: boolean
  coverage: {
    fixtures: { events: boolean; lineups: boolean; statistics_fixtures: boolean; statistics_players: boolean }
    standings: boolean
    players: boolean
    top_scorers: boolean
    top_assists: boolean
    top_cards: boolean
    injuries: boolean
    predictions: boolean
  }
}

export interface Competition {
  league: { id: number; name: string; type: CompetitionType; logo: string }
  country: { name: string; code: string | null; flag: string | null }
  seasons: CompetitionSeason[]
}

export interface StandingRow {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form: string | null
  status: string
  description: string | null
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
}

export interface CompetitionTeam {
  team: { id: number; name: string; code: string | null; country: string; founded: number | null; national: boolean; logo: string }
  venue: { id: number | null; name: string | null; address: string | null; city: string | null; capacity: number | null; surface: string | null; image: string | null }
}

export interface CompetitionRound { round: string; dates: string[] }

export type PerformerCategory = 'scorers' | 'assists' | 'yellow-cards' | 'red-cards'

export function currentSeason(competition: Competition) {
  return competition.seasons.find((season) => season.current) ?? competition.seasons.at(-1)
}

export function coverageCount(season: CompetitionSeason | undefined) {
  if (!season) return 0
  const fixtureCoverage = Object.values(season.coverage.fixtures).filter(Boolean).length
  const generalCoverage = Object.entries(season.coverage)
    .filter(([key]) => key !== 'fixtures')
    .filter(([, value]) => value).length
  return fixtureCoverage + generalCoverage
}
