import type { CompetitionTeam } from '#/lib/competition'
import type { FixtureSummary } from '#/lib/football'

export type TeamProfile = CompetitionTeam

export interface SquadPlayer { id: number; name: string; age: number | null; number: number | null; position: string; photo: string }
export interface SquadResponse { team: { id: number; name: string; logo: string }; players: SquadPlayer[] }

export interface CoachProfile {
  id: number; name: string; firstname: string | null; lastname: string | null; age: number | null
  birth: { date: string | null; place: string | null; country: string | null }
  nationality: string | null; height: string | null; weight: string | null; photo: string
  team: { id: number; name: string; logo: string }
  career: Array<{ team: { id: number; name: string; logo: string }; start: string; end: string | null }>
}

interface HomeAwayTotal { home: number; away: number; total: number }
export interface TeamSeasonStatistics {
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number }
  team: { id: number; name: string; logo: string }
  form: string | null
  fixtures: { played: HomeAwayTotal; wins: HomeAwayTotal; draws: HomeAwayTotal; loses: HomeAwayTotal }
  goals: {
    for: { total: HomeAwayTotal; average: { home: string | null; away: string | null; total: string | null } }
    against: { total: HomeAwayTotal; average: { home: string | null; away: string | null; total: string | null } }
  }
  biggest: { streak: { wins: number; draws: number; loses: number }; wins: { home: string | null; away: string | null }; loses: { home: string | null; away: string | null } }
  clean_sheet: HomeAwayTotal
  failed_to_score: HomeAwayTotal
  penalty: { scored: { total: number; percentage: string }; missed: { total: number; percentage: string }; total: number }
  lineups: Array<{ formation: string; played: number }>
}

export interface TeamDetailData {
  team: TeamProfile
  season: number
  leagueId: number | null
  squad: SquadPlayer[]
  coach: CoachProfile | null
  statistics: TeamSeasonStatistics | null
  fixtures: FixtureSummary[]
  unavailable: string[]
}
