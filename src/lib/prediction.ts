export interface PredictionSide {
  id: number
  name: string
  logo: string
  recent: {
    played: number | null
    form: string | null
    attack: string | null
    defence: string | null
    goalsFor: { total: number | null; average: string | null }
    goalsAgainst: { total: number | null; average: string | null }
  }
  leagueForm: string | null
}

export interface MatchOutlook {
  advantage: { id: number | null; name: string | null }
  percent: { home: string | null; draw: string | null; away: string | null }
  comparison: Record<'form' | 'attack' | 'defence' | 'poisson' | 'headToHead' | 'goals' | 'total', { home: string | null; away: string | null }>
  home: PredictionSide
  away: PredictionSide
}
