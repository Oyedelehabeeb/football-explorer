import type { FixtureSummary, FixtureTeam } from '#/lib/football'

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null }
  team: Pick<FixtureTeam, 'id' | 'name' | 'logo'>
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: 'Goal' | 'Card' | 'Subst' | 'Var' | string
  detail: string
  comments: string | null
}

export interface LineupPlayer {
  id: number
  name: string
  number: number | null
  pos: string | null
  grid: string | null
}

export interface FixtureLineup {
  team: Pick<FixtureTeam, 'id' | 'name' | 'logo'> & {
    colors?: { player?: { primary?: string }; goalkeeper?: { primary?: string } }
  }
  formation: string | null
  startXI: Array<{ player: LineupPlayer }>
  substitutes: Array<{ player: LineupPlayer }>
  coach: { id: number | null; name: string | null; photo: string | null }
}

export interface FixtureTeamStatistics {
  team: Pick<FixtureTeam, 'id' | 'name' | 'logo'>
  statistics: Array<{ type: string; value: number | string | null }>
}

export interface FixturePlayerStatistics {
  team: Pick<FixtureTeam, 'id' | 'name' | 'logo'>
  players: Array<{
    player: { id: number; name: string; photo: string }
    statistics: Array<{
      games: { minutes: number | null; number: number | null; position: string | null; rating: string | null; captain: boolean; substitute: boolean }
      goals: { total: number | null; assists: number | null }
      cards: { yellow: number; red: number }
    }>
  }>
}

export interface FixtureDetail extends FixtureSummary {
  events: FixtureEvent[]
  lineups: FixtureLineup[]
  statistics: FixtureTeamStatistics[]
  players: FixturePlayerStatistics[]
}
