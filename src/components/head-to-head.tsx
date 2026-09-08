import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowDown, CalendarClock, LoaderCircle, RefreshCw, ShieldAlert, Swords } from 'lucide-react'

import { isFinishedStatus } from '#/lib/football'
import { getHeadToHead } from '#/server/head-to-head'

import type { FixtureSummary, FixtureTeam } from '#/lib/football'
import type { HeadToHeadResult } from '#/server/head-to-head'

interface Props { home: FixtureTeam; away: FixtureTeam; timezone: string }

function FixtureRow({ fixture, timezone }: { fixture: FixtureSummary; timezone: string }) {
  const finished = isFinishedStatus(fixture.fixture.status.short)
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone }).format(new Date(fixture.fixture.date))
  return <Link className="h2h-fixture" to="/matches/$fixtureId" params={{ fixtureId: String(fixture.fixture.id) }} search={{ timezone }}><div><span>{date}</span><small>{fixture.league.name}</small></div><span><img src={fixture.teams.home.logo} alt="" />{fixture.teams.home.name}</span><strong>{finished ? `${fixture.goals.home ?? 0} — ${fixture.goals.away ?? 0}` : fixture.fixture.status.long}</strong><span className="is-away">{fixture.teams.away.name}<img src={fixture.teams.away.logo} alt="" /></span></Link>
}

function LoadedHeadToHead({ result, home, away, timezone }: Props & { result: Extract<HeadToHeadResult, { ok: true }> }) {
  const [expanded, setExpanded] = useState(false)
  const { completed, upcoming, summary } = useMemo(() => {
    const completedFixtures = result.fixtures.filter((fixture) => isFinishedStatus(fixture.fixture.status.short)).sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
    const upcomingFixtures = result.fixtures.filter((fixture) => !isFinishedStatus(fixture.fixture.status.short) && fixture.fixture.timestamp * 1000 >= Date.now()).sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
    const teamSummary = new Map<number, { wins: number; goals: number; cleanSheets: number }>([[home.id, { wins: 0, goals: 0, cleanSheets: 0 }], [away.id, { wins: 0, goals: 0, cleanSheets: 0 }]])
    for (const fixture of completedFixtures) {
      const homeStats = teamSummary.get(fixture.teams.home.id); const awayStats = teamSummary.get(fixture.teams.away.id)
      if (!homeStats || !awayStats) continue
      homeStats.goals += fixture.goals.home ?? 0; awayStats.goals += fixture.goals.away ?? 0
      if (fixture.teams.home.winner) homeStats.wins += 1
      if (fixture.teams.away.winner) awayStats.wins += 1
      if (fixture.goals.away === 0) homeStats.cleanSheets += 1
      if (fixture.goals.home === 0) awayStats.cleanSheets += 1
    }
    return { completed: completedFixtures, upcoming: upcomingFixtures, summary: teamSummary }
  }, [away.id, home.id, result.fixtures])
  const draws = completed.length - (summary.get(home.id)?.wins ?? 0) - (summary.get(away.id)?.wins ?? 0)
  const shown = expanded ? completed : completed.slice(0, 5)
  const teamSummary = (team: FixtureTeam) => <div className="h2h-team-summary"><img src={team.logo} alt="" /><strong>{team.name}</strong><dl><div><dt>Wins</dt><dd>{summary.get(team.id)?.wins ?? 0}</dd></div><div><dt>Goals</dt><dd>{summary.get(team.id)?.goals ?? 0}</dd></div><div><dt>Clean sheets</dt><dd>{summary.get(team.id)?.cleanSheets ?? 0}</dd></div></dl></div>
  return <div className="h2h-loaded"><div className="h2h-summary">{teamSummary(home)}<div><span>{completed.length}</span><strong>Meetings</strong><small>{draws} draws</small></div>{teamSummary(away)}</div>{upcoming.length > 0 && <div className="h2h-upcoming"><h3><CalendarClock aria-hidden="true" /> Upcoming meetings</h3>{upcoming.map((fixture) => <FixtureRow fixture={fixture} timezone={timezone} key={fixture.fixture.id} />)}</div>} {shown.length > 0 ? <div className="h2h-history"><h3>Recent meetings</h3>{shown.map((fixture) => <FixtureRow fixture={fixture} timezone={timezone} key={fixture.fixture.id} />)}{completed.length > 5 && <button type="button" onClick={() => setExpanded((value) => !value)}><ArrowDown className={expanded ? 'is-up' : ''} aria-hidden="true" />{expanded ? 'Show recent five' : `View all ${completed.length} meetings`}</button>}</div> : <div className="match-unavailable"><Swords aria-hidden="true" /><div><strong>No completed meetings</strong><p>The provider returned no historical results for these teams.</p></div></div>}</div>
}

export function HeadToHead({ home, away, timezone }: Props) {
  const [result, setResult] = useState<HeadToHeadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const load = async () => { if (loading) return; setLoading(true); setResult(await getHeadToHead({ data: { homeId: home.id, awayId: away.id, timezone } })); setLoading(false) }
  if (loading) return <div className="h2h-gate" role="status"><LoaderCircle className="is-loading" aria-hidden="true" /><strong>Loading previous meetings…</strong></div>
  if (!result) return <div className="h2h-gate"><Swords aria-hidden="true" /><strong>{home.name} versus {away.name}</strong><p>Load their completed history, upcoming meetings and comparison record.</p><button type="button" onClick={() => void load()}>Load head-to-head</button></div>
  if (!result.ok) return <div className="h2h-error" role="alert"><ShieldAlert aria-hidden="true" /><div><strong>Head-to-head unavailable</strong><p>{result.message}</p></div><button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" /> Try again</button></div>
  return <LoadedHeadToHead result={result} home={home} away={away} timezone={timezone} />
}
