export const FIXTURE_STATUS = {
  scheduled: ['TBD', 'NS'],
  live: ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'],
  finished: ['FT', 'AET', 'PEN'],
  disrupted: ['PST', 'CANC', 'ABD', 'AWD', 'WO'],
} as const

export type MatchFilter = 'all' | 'live' | 'upcoming' | 'finished'

export interface FixtureTeam {
  id: number
  name: string
  logo: string
  winner: boolean | null
}

export interface FixtureSummary {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    periods: { first: number | null; second: number | null }
    venue: { id: number | null; name: string | null; city: string | null }
    status: {
      long: string
      short: string
      elapsed: number | null
      extra: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    round: string | null
  }
  teams: { home: FixtureTeam; away: FixtureTeam }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}

export interface FixtureGroup {
  key: string
  league: FixtureSummary['league']
  fixtures: FixtureSummary[]
}

export function isLiveStatus(status: string) {
  return (FIXTURE_STATUS.live as readonly string[]).includes(status)
}

export function isFinishedStatus(status: string) {
  return (FIXTURE_STATUS.finished as readonly string[]).includes(status)
}

export function matchesFilter(fixture: FixtureSummary, filter: MatchFilter) {
  if (filter === 'all') return true
  if (filter === 'live') return isLiveStatus(fixture.fixture.status.short)
  if (filter === 'finished') return isFinishedStatus(fixture.fixture.status.short)
  return !isLiveStatus(fixture.fixture.status.short) && !isFinishedStatus(fixture.fixture.status.short)
}

export function groupFixtures(fixtures: FixtureSummary[]) {
  const groups = new Map<string, FixtureGroup>()

  for (const fixture of fixtures) {
    const key = `${fixture.league.country}:${fixture.league.id}`
    const current = groups.get(key)
    if (current) current.fixtures.push(fixture)
    else groups.set(key, { key, league: fixture.league, fixtures: [fixture] })
  }

  return [...groups.values()]
}

export function dateInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function offsetDate(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}
