export interface FixtureAbsence {
  player: {
    id: number
    name: string
    photo: string
    status: string
    reason: string | null
  }
  team: {
    id: number
    name: string
    logo: string
  }
}
