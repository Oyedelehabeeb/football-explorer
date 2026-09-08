export interface CoachTeam {
  id: number
  name: string
  logo: string
}

export interface CoachCareerEntry {
  team: CoachTeam
  start: string
  end: string | null
}

export interface CoachProfile {
  id: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  birth: { date: string | null; place: string | null; country: string | null }
  nationality: string | null
  height: string | null
  weight: string | null
  photo: string
  team: CoachTeam
  career: CoachCareerEntry[]
}

export interface CoachTrophy {
  league: string
  country: string
  season: string | null
  place: string
}

export interface CoachSidelinedPeriod {
  type: string
  start: string
  end: string | null
}

export interface CoachDetailData {
  coach: CoachProfile
  trophies: CoachTrophy[]
  sidelined: CoachSidelinedPeriod[]
  unavailable: Array<'trophies' | 'sidelined'>
}
