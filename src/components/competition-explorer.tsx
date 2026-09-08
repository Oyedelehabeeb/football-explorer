import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarRange, Database, Flag, RefreshCw, Search, ShieldAlert, Trophy } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { coverageCount, currentSeason } from '#/lib/competition'
import { compareCompetitionPriority } from '#/lib/league-priority'

import type { CompetitionFilter } from '#/lib/competition'
import type { CompetitionsResult } from '#/server/competitions'

const ITEMS_PER_BATCH = 40
const TYPES: Array<{ value: CompetitionFilter; label: string }> = [{ value: 'all', label: 'All competitions' }, { value: 'league', label: 'Leagues' }, { value: 'cup', label: 'Cups' }]

interface CompetitionExplorerProps {
  result: CompetitionsResult
  search: { q?: string; country?: string; type?: CompetitionFilter }
}

export function CompetitionExplorer({ result, search }: CompetitionExplorerProps) {
  const navigate = useNavigate({ from: '/competitions' })
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const query = search.q ?? ''
  const [searchInput, setSearchInput] = useState(query)
  const lastNavigatedQueryRef = useRef(query)
  const country = search.country ?? 'all'
  const type = search.type ?? 'all'
  const competitions = result.ok ? result.competitions : []
  const countries = useMemo(() => [...new Set(competitions.map((item) => item.country.name))].sort((a, b) => a.localeCompare(b)), [competitions])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return competitions.filter((item) => {
      if (country !== 'all' && item.country.name !== country) return false
      if (type !== 'all' && item.league.type.toLocaleLowerCase() !== type) return false
      return !needle || item.league.name.toLocaleLowerCase().includes(needle) || item.country.name.toLocaleLowerCase().includes(needle)
    }).sort((a, b) => compareCompetitionPriority(a, b) || (currentSeason(b)?.year ?? 0) - (currentSeason(a)?.year ?? 0) || a.country.name.localeCompare(b.country.name) || a.league.name.localeCompare(b.league.name))
  }, [competitions, country, query, type])
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const leagueCount = competitions.filter((item) => item.league.type === 'League').length
  const cupCount = competitions.length - leagueCount
  const setSearch = (next: { q?: string; country?: string; type?: CompetitionFilter }) => void navigate({ search: { q: next.q ?? (query || undefined), country: next.country ?? country, type: next.type ?? type }, replace: true, resetScroll: false })

  useEffect(() => setVisibleCount(ITEMS_PER_BATCH), [query, country, type])
  useEffect(() => {
    if (query !== lastNavigatedQueryRef.current) setSearchInput(query)
  }, [query])
  useEffect(() => {
    if (searchInput === query) return
    const timer = window.setTimeout(() => {
      lastNavigatedQueryRef.current = searchInput
      void navigate({ search: { q: searchInput || undefined, country, type }, replace: true, resetScroll: false })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [country, navigate, query, searchInput, type])
  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + ITEMS_PER_BATCH, filtered.length)) }, { rootMargin: '500px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [filtered.length, hasMore])

  return <main id="main-content" className="competitions-page">
    <section className="competitions-hero"><div className="page-shell"><span className="eyebrow"><span /> The global game</span><div className="competitions-hero-grid"><div><h1>Find your<br /><em>competition.</em></h1><p>Explore the leagues and cups covered across world football in the 2024/25 season.</p></div><div className="competition-index-stats"><div><strong>{competitions.length.toLocaleString()}</strong><span>2024/25 competitions</span></div><div><strong>{countries.length}</strong><span>Countries</span></div><div><strong>{leagueCount}</strong><span>Leagues</span></div><div><strong>{cupCount}</strong><span>Cups</span></div></div></div></div></section>

    <section className="competition-directory page-shell" aria-labelledby="competition-directory-title"><div className="directory-heading"><div><span className="section-number">02 / COMPETITION INDEX</span><h2 id="competition-directory-title">The football directory</h2></div><p>{filtered.length.toLocaleString()} {filtered.length === 1 ? 'competition' : 'competitions'}</p></div>
      <div className="competition-filters"><label className="competition-search"><Search aria-hidden="true" /><span className="sr-only">Search competitions</span><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search league, cup or country…" /></label><Select value={country} onValueChange={(value) => setSearch({ country: value })}><SelectTrigger aria-label="Filter by country"><Flag aria-hidden="true" /><SelectValue placeholder="All countries" /></SelectTrigger><SelectContent><SelectItem value="all">All countries</SelectItem>{countries.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="competition-type-tabs" role="group" aria-label="Filter by competition type">{TYPES.map((item) => <button className={type === item.value ? 'is-active' : ''} key={item.value} onClick={() => setSearch({ type: item.value })}>{item.label}</button>)}</div>
      {!result.ok ? <div className="error-state" role="alert"><ShieldAlert aria-hidden="true" /><div><h2>Competition index unavailable</h2><p>{result.message}</p></div></div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search aria-hidden="true" /></div><h2>No competitions found</h2><p>Try a broader search or clear one of the filters.</p></div> : <><div className="competition-list">{visible.map((competition) => {
        const season = currentSeason(competition)
        return <Link className="competition-row" key={competition.league.id} to="/competitions/$leagueId" params={{ leagueId: String(competition.league.id) }} search={{ season: season?.year ?? 2024 }}><div className="competition-rank">{String(competition.league.id).padStart(3, '0')}</div><div className="competition-logo"><img src={competition.league.logo} alt="" loading="lazy" /></div><div className="competition-name"><span>{competition.country.flag && <img src={competition.country.flag} alt="" loading="lazy" />}{competition.country.name}</span><h3>{competition.league.name}</h3></div><div className="competition-season"><CalendarRange aria-hidden="true" /><div><span>Season</span><strong>{season?.year ?? '—'}</strong></div></div><div className="competition-coverage"><Database aria-hidden="true" /><div><span>Coverage</span><strong>{coverageCount(season)} data areas</strong></div></div><span className={`competition-kind is-${competition.league.type.toLowerCase()}`}><Trophy aria-hidden="true" />{competition.league.type}</span></Link>
      })}</div><div ref={sentinelRef} className="match-load-sentinel" aria-live="polite">{hasMore ? <><RefreshCw aria-hidden="true" /> Loading more competitions</> : `Showing all ${filtered.length.toLocaleString()} competitions`}</div></>}
    </section>
  </main>
}
