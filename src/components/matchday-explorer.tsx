import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Radio, RefreshCw, Search, ShieldAlert, Trophy } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { dateInTimezone, groupFixtures, isFinishedStatus, isLiveStatus, matchesFilter, offsetDate } from '#/lib/football'
import { getMatchday } from '#/server/fixtures'
import type { FixtureSummary, MatchFilter } from '#/lib/football'
import type { MatchdayResult } from '#/server/fixtures'

const FILTERS: Array<{ value: MatchFilter; label: string }> = [
  { value: 'all', label: 'All matches' }, { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' }, { value: 'finished', label: 'Finished' },
]

const MATCHES_PER_PAGE = 30

interface MatchdayExplorerProps { date: string; timezone: string; filter: MatchFilter; initialData: MatchdayResult }

function statusLabel(fixture: FixtureSummary) {
  const status = fixture.fixture.status
  if (isLiveStatus(status.short)) {
    if (status.short === 'HT') return 'Half-time'
    if (status.short === 'SUSP') return 'Suspended'
    if (status.short === 'INT') return 'Interrupted'
    return status.elapsed ? `${status.elapsed}${status.extra ? `+${status.extra}` : ''}′` : 'Live'
  }
  if (isFinishedStatus(status.short)) return status.short
  const labels: Record<string, string> = { TBD: 'Time TBD', PST: 'Postponed', CANC: 'Cancelled', ABD: 'Abandoned', AWD: 'Technical result', WO: 'Walkover' }
  if (labels[status.short]) return labels[status.short]
  return new Intl.DateTimeFormat('en', { timeZone: fixture.fixture.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(fixture.fixture.date))
}

function Team({ team }: { team: FixtureSummary['teams']['home'] }) {
  return <div className="team"><img src={team.logo} alt="" width={34} height={34} loading="lazy" /><span>{team.name}</span></div>
}

function MatchRow({ fixture, timezone }: { fixture: FixtureSummary; timezone: string }) {
  const live = isLiveStatus(fixture.fixture.status.short)
  const hasScore = fixture.goals.home !== null && fixture.goals.away !== null
  return (
    <Link className="match-row" to="/matches/$fixtureId" params={{ fixtureId: String(fixture.fixture.id) }} search={{ timezone }} aria-label={`${fixture.teams.home.name} versus ${fixture.teams.away.name}, view match details`}>
      <div className={`match-state ${live ? 'is-live' : ''}`}>{live && <span className="live-dot" aria-hidden="true" />}{statusLabel(fixture)}</div>
      <div className="match-teams"><Team team={fixture.teams.home} /><Team team={fixture.teams.away} /></div>
      <div className={`match-score ${hasScore ? '' : 'is-pending'}`} aria-label={hasScore ? 'Score' : 'Not started'}><span>{fixture.goals.home ?? '—'}</span><span>{fixture.goals.away ?? '—'}</span></div>
      <div className="match-meta"><span>{fixture.league.round ?? 'Round unavailable'}</span>{fixture.fixture.venue.name && <span>{fixture.fixture.venue.name}</span>}</div>
    </Link>
  )
}

function EmptyState({ filter }: { filter: MatchFilter }) {
  return <div className="empty-state"><div className="empty-icon"><Search aria-hidden="true" /></div><h2>No {filter === 'all' ? '' : `${filter} `}matches found</h2><p>Try another match status or move to a different date.</p></div>
}

export function MatchdayExplorer({ date, timezone, filter, initialData }: MatchdayExplorerProps) {
  const navigate = useNavigate({ from: '/' })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(MATCHES_PER_PAGE)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const query = useQuery({
    queryKey: ['matchday', date, timezone], queryFn: () => getMatchday({ data: { date, timezone } }), initialData,
    refetchInterval: (state) => {
      const value = state.state.data
      return value?.ok && value.fixtures.some((fixture) => isLiveStatus(fixture.fixture.status.short)) ? 60_000 : false
    },
  })

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone === 'UTC' && detected && detected !== 'UTC') void navigate({ search: { date: dateInTimezone(new Date(), detected), timezone: detected, filter }, replace: true })
  }, [])

  const result = query.data
  const fixtures = result.ok ? result.fixtures : []
  const filtered = useMemo(() => fixtures.filter((fixture) => matchesFilter(fixture, filter)), [fixtures, filter])
  const visibleFixtures = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const groups = useMemo(() => groupFixtures(visibleFixtures), [visibleFixtures])
  const hasMore = visibleCount < filtered.length
  const liveCount = fixtures.filter((fixture) => isLiveStatus(fixture.fixture.status.short)).length
  const finishedCount = fixtures.filter((fixture) => isFinishedStatus(fixture.fixture.status.short)).length
  const setSearch = (next: { date?: string; filter?: MatchFilter; timezone?: string }) => void navigate({ search: { date: next.date ?? date, timezone: next.timezone ?? timezone, filter: next.filter ?? filter } })
  const dateTitle = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

  useEffect(() => setVisibleCount(MATCHES_PER_PAGE), [date, timezone, filter])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + MATCHES_PER_PAGE, filtered.length))
        }
      },
      { rootMargin: '400px 0px' },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [filtered.length, hasMore])

  return (
    <main id="main-content">
      <section className="matchday-hero page-shell" aria-labelledby="matchday-title">
        <div className="hero-copy"><span className="eyebrow"><span /> The world game, in focus</span><h1 id="matchday-title">Every match.<br /><em>One clear view.</em></h1><p>Explore today’s football across competitions, with scores, match states and the context that matters.</p></div>
        <div className="hero-scoreboard" aria-label="Selected matchday summary">
          <div className="scoreboard-topline"><span>Matchday index</span>{liveCount > 0 && <span className="live-pill"><span /> {liveCount} live</span>}</div>
          <strong>{fixtures.length.toString().padStart(2, '0')}</strong><span>fixtures across {new Set(fixtures.map((item) => item.league.id)).size} competitions</span>
          <div className="scoreboard-stats"><div><b>{finishedCount}</b><span>Completed</span></div><div><b>{Math.max(0, fixtures.length - finishedCount - liveCount)}</b><span>To play</span></div><div><b>{timezone.split('/').at(-1)?.replaceAll('_', ' ')}</b><span>Your time</span></div></div>
        </div>
      </section>

      <section className="matchday-content page-shell" aria-labelledby="fixtures-title">
        <div className="matchday-heading"><div><span className="section-number">01 / MATCH CENTRE</span><h2 id="fixtures-title">{dateTitle}</h2></div>
          <div className="date-controls"><Button variant="outline" size="icon" aria-label="Previous day" onClick={() => setSearch({ date: offsetDate(date, -1) })}><ChevronLeft aria-hidden="true" /></Button>
            <div className="calendar-control"><Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger asChild><Button variant="outline" aria-label={`Choose match date, currently ${dateTitle}`}><CalendarDays aria-hidden="true" /> Choose date</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={new Date(`${date}T12:00:00`)} onSelect={(selected) => { if (!selected) return; const nextDate = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`; setSearch({ date: nextDate }); setCalendarOpen(false) }} autoFocus /></PopoverContent></Popover></div>
            <Button variant="outline" size="icon" aria-label="Next day" onClick={() => setSearch({ date: offsetDate(date, 1) })}><ChevronRight aria-hidden="true" /></Button></div></div>

        <div className="filter-bar" role="group" aria-label="Filter matches by status">
          {FILTERS.map((item) => <button key={item.value} className={filter === item.value ? 'is-active' : ''} onClick={() => setSearch({ filter: item.value })}>{item.value === 'live' && <Radio aria-hidden="true" />}{item.label}{item.value === 'live' && liveCount > 0 && <span>{liveCount}</span>}</button>)}
          <label className="timezone-select"><Clock3 aria-hidden="true" /><span className="sr-only">Timezone</span><select value={timezone} onChange={(event) => setSearch({ timezone: event.target.value })}><option value={timezone}>{timezone.replaceAll('_', ' ')}</option>{timezone !== 'UTC' && <option value="UTC">UTC</option>}</select></label>
        </div>
        {query.isFetching && <div className="refresh-indicator"><RefreshCw aria-hidden="true" /> Updating scores</div>}
        {!result.ok ? <div className="error-state" role="alert"><ShieldAlert aria-hidden="true" /><div><h2>Match centre unavailable</h2><p>{result.message}</p></div><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div>
          : groups.length === 0 ? <EmptyState filter={filter} /> : <><div className="league-list">{groups.map((group) => <section className="league-group" key={group.key} aria-labelledby={`league-${group.league.id}`}><header><div className="league-identity"><img src={group.league.logo} alt="" width={42} height={42} loading="lazy" /><div><span>{group.league.country}</span><h3 id={`league-${group.league.id}`}>{group.league.name}</h3></div></div><span className="fixture-count"><Trophy aria-hidden="true" /> {group.fixtures.length} {group.fixtures.length === 1 ? 'fixture' : 'fixtures'}</span></header><div>{group.fixtures.map((fixture) => <MatchRow fixture={fixture} timezone={timezone} key={fixture.fixture.id} />)}</div></section>)}</div><div ref={loadMoreRef} className="match-load-sentinel" aria-live="polite">{hasMore ? <><RefreshCw aria-hidden="true" /> Loading more matches</> : `Showing all ${filtered.length} matches`}</div></>}
      </section>
    </main>
  )
}
