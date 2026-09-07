import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { MapPin, RefreshCw, Search, ShieldAlert, Users } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { PRIORITY_LEAGUES } from '#/lib/league-priority'

import type { CompetitionTeam } from '#/lib/competition'
import type { TeamsResult } from '#/server/teams'

const BATCH_SIZE = 30

function searchRank(item: CompetitionTeam, query: string) {
  const name = item.team.name.toLocaleLowerCase()
  const needle = query.toLocaleLowerCase()
  if (name === needle) return 0
  if (name.startsWith(needle)) return 1
  return 2
}

export function TeamExplorer({ result, query, leagueId }: { result: TeamsResult; query: string; leagueId: number }) {
  const navigate = useNavigate({ from: '/teams/' })
  const [input, setInput] = useState(query)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const league = PRIORITY_LEAGUES.find((item) => item.id === leagueId) ?? PRIORITY_LEAGUES[0]
  const teams = useMemo(() => result.ok ? [...result.teams].sort((a, b) => query ? searchRank(a, query) - searchRank(b, query) || a.team.name.localeCompare(b.team.name) : a.team.name.localeCompare(b.team.name)) : [], [query, result])
  const visible = teams.slice(0, visibleCount)
  const hasMore = visibleCount < teams.length

  useEffect(() => { setInput(query); setVisibleCount(BATCH_SIZE) }, [query, leagueId])
  useEffect(() => {
    if (input.trim() === query) return
    const timer = window.setTimeout(() => void navigate({ search: { q: input.trim().length >= 3 ? input.trim() : undefined, league: leagueId }, replace: true, resetScroll: false }), 450)
    return () => window.clearTimeout(timer)
  }, [input, leagueId, navigate, query])
  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + BATCH_SIZE, teams.length)) }, { rootMargin: '500px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, teams.length])

  const chooseLeague = (id: number) => void navigate({ search: { league: id }, resetScroll: false })
  return <main id="main-content" className="teams-page"><section className="teams-hero"><div className="page-shell"><span className="eyebrow"><span /> CLUB DIRECTORY</span><div><section><h1>Find the club.<br /><em>Know the story.</em></h1><p>Explore the teams shaping Europe’s leading leagues, from identity and home ground to squad and performance.</p></section><div className="teams-hero-mark"><Users aria-hidden="true" /><strong>7</strong><span>Priority leagues</span></div></div></div></section>
    <section className="team-directory page-shell" aria-labelledby="team-directory-title"><header><div><span className="section-number">01 / TEAM INDEX</span><h2 id="team-directory-title">{query ? `Results for “${query}”` : league.name}</h2></div><p>{result.ok ? `${teams.length} teams` : 'Data unavailable'}</p></header>
      <label className="team-search"><Search aria-hidden="true" /><span className="sr-only">Search teams</span><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search any team — minimum 3 characters" autoComplete="off" /></label>
      <div className="priority-league-tabs" role="group" aria-label="Choose a priority league">{PRIORITY_LEAGUES.map((item) => <button key={item.id} className={!query && leagueId === item.id ? 'is-active' : ''} onClick={() => chooseLeague(item.id)}><span>{item.country}</span>{item.name}</button>)}</div>
      {!result.ok ? <div className="error-state" role="alert"><ShieldAlert aria-hidden="true" /><div><h2>Team directory unavailable</h2><p>{result.message}</p></div></div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search aria-hidden="true" /></div><h2>No teams found</h2><p>Try another name or choose one of the priority leagues.</p></div> : <><div className="team-directory-grid">{visible.map((item) => <Link className="team-directory-card" key={item.team.id} to="/teams/$teamId" params={{ teamId: String(item.team.id) }} search={result.source === 'league' && result.leagueId ? { league: result.leagueId, season: 2024 } : { season: 2024 }}><div className="team-card-visual">{item.venue.image && <img src={item.venue.image} alt="" loading="lazy" />}<span><img src={item.team.logo} alt={`${item.team.name} crest`} loading="lazy" /></span></div><div className="team-card-copy"><span>{item.team.country}{item.team.code ? ` · ${item.team.code}` : ''}</span><h3>{item.team.name}</h3><p><MapPin aria-hidden="true" />{item.venue.name ?? 'Venue unavailable'}</p><dl><div><dt>Founded</dt><dd>{item.team.founded ?? '—'}</dd></div><div><dt>City</dt><dd>{item.venue.city ?? '—'}</dd></div><div><dt>Capacity</dt><dd>{item.venue.capacity?.toLocaleString() ?? '—'}</dd></div></dl></div></Link>)}</div><div ref={sentinelRef} className="match-load-sentinel" aria-live="polite">{hasMore ? <><RefreshCw aria-hidden="true" /> Loading more teams</> : `Showing all ${teams.length} teams`}</div></>}
    </section></main>
}
