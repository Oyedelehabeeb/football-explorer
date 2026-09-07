export interface PlayerProfile {
  id: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  birth: { date: string | null; place: string | null; country: string | null }
  nationality: string | null
  height: string | null
  weight: string | null
  number?: number | null
  position?: string | null
  injured?: boolean
  photo: string
}

export interface PlayerStatistics {
  team: { id: number; name: string; logo: string }
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number }
  games: { appearences: number | null; lineups: number | null; minutes: number | null; number: number | null; position: string | null; rating: string | null; captain: boolean }
  substitutes: { in: number | null; out: number | null; bench: number | null }
  shots: { total: number | null; on: number | null }
  goals: { total: number | null; conceded: number | null; assists: number | null; saves: number | null }
  passes: { total: number | null; key: number | null; accuracy: number | string | null }
  tackles: { total: number | null; blocks: number | null; interceptions: number | null }
  duels: { total: number | null; won: number | null }
  dribbles: { attempts: number | null; success: number | null; past: number | null }
  fouls: { drawn: number | null; committed: number | null }
  cards: { yellow: number | null; yellowred: number | null; red: number | null }
  penalty: { won: number | null; commited: number | null; scored: number | null; missed: number | null; saved: number | null }
}

export interface PlayerSeasonResponse { player: PlayerProfile; statistics: PlayerStatistics[] }
export interface PlayerCareerTeam { team: { id: number; name: string; logo: string }; seasons: number[] }
export interface PlayerTrophy { league: string; country: string; season: string | null; place: string }
export interface PlayerSidelined { type: string; start: string; end: string | null }
export interface PlayerTransfer { date: string; type: string | null; teams: { in: { id: number; name: string; logo: string }; out: { id: number; name: string; logo: string } } }
export interface PlayerTransferGroup { player: { id: number; name: string }; update: string; transfers: PlayerTransfer[] }

export interface PlayerDetailData {
  player: PlayerProfile
  statistics: PlayerStatistics[]
  career: PlayerCareerTeam[]
  season: number
  unavailable: string[]
}

export interface PlayerSupportingData {
  trophies: PlayerTrophy[]
  sidelined: PlayerSidelined[]
  transfers: PlayerTransferGroup[]
  unavailable: string[]
}
