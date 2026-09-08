import { PRIORITY_LEAGUES } from '#/lib/league-priority'

export interface FootballCountry { name: string; code: string | null; flag: string | null }
export type CountryCompetitionStatus = 'all' | 'active' | 'historical'

const priority = new Map<string, number>(PRIORITY_LEAGUES.map((league, index) => [league.country, index]))

export function compareCountryPriority(a: FootballCountry, b: FootballCountry) {
  return (priority.get(a.name) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.name) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)
}
