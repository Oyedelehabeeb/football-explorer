import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CalendarRange, Database, Globe2, Search, ShieldAlert, Trophy } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { coverageCount, currentSeason } from '#/lib/competition'
import { compareCompetitionPriority } from '#/lib/league-priority'

import type { CompetitionFilter } from '#/lib/competition'
import type { CountryCompetitionStatus } from '#/lib/country'
import type { CountryCompetitionsResult } from '#/server/countries'

interface SearchState { q?: string; type?: CompetitionFilter; status?: CountryCompetitionStatus }
const TYPES: { value: CompetitionFilter; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'league', label: 'Leagues' }, { value: 'cup', label: 'Cups' }]
const STATUSES: { value: CountryCompetitionStatus; label: string }[] = [{ value: 'all', label: 'All eras' }, { value: 'active', label: 'Active' }, { value: 'historical', label: 'Historical' }]

export function CountryDetail({ result, search }: { result: CountryCompetitionsResult; search: SearchState }) {
  if (!result.ok) return <main id="main-content" className="competition-detail-error page-shell"><ShieldAlert aria-hidden="true" /><h1>Country unavailable</h1><p>{result.message}</p><Link to="/countries"><ArrowLeft aria-hidden="true" /> Return to countries</Link></main>
  return <CountryDetailContent result={result} search={search} />
}

function CountryDetailContent({ result, search }: { result: Extract<CountryCompetitionsResult, { ok: true }>; search: SearchState }) {
  const navigate = useNavigate({ from: '/countries/$countryName' })
  const [input, setInput] = useState(search.q ?? '')
  const type = search.type ?? 'all'
  const status = search.status ?? 'all'
  const activeCount = result.competitions.filter((item) => item.seasons.some((season) => season.current)).length
  const filtered = useMemo(() => {
    const needle = (search.q ?? '').trim().toLocaleLowerCase()
    return result.competitions.filter((item) => {
      const active = item.seasons.some((season) => season.current)
      return (type === 'all' || item.league.type.toLocaleLowerCase() === type) && (status === 'all' || (status === 'active' ? active : !active)) && (!needle || item.league.name.toLocaleLowerCase().includes(needle))
    }).sort((a, b) => compareCompetitionPriority(a, b) || Number(b.seasons.some((season) => season.current)) - Number(a.seasons.some((season) => season.current)) || (currentSeason(b)?.year ?? 0) - (currentSeason(a)?.year ?? 0) || a.league.name.localeCompare(b.league.name))
  }, [result.competitions, search.q, status, type])
  const update = (next: Partial<SearchState>) => void navigate({ search: { ...search, ...next }, replace: true, resetScroll: false })
  useEffect(() => setInput(search.q ?? ''), [search.q])
  useEffect(() => {
    if (input === (search.q ?? '')) return
    const timer = window.setTimeout(() => update({ q: input || undefined }), 300)
    return () => window.clearTimeout(timer)
  }, [input, search.q])

  return <main id="main-content" className="country-detail-page">
    <section className="country-detail-hero"><div className="page-shell"><Link className="match-back" to="/countries"><ArrowLeft aria-hidden="true" /> All countries</Link><div className="country-detail-identity"><span>{result.country.flag ? <img src={result.country.flag} alt="" /> : <Globe2 aria-hidden="true" />}</span><div><small>{result.country.code ?? 'Global competitions'}</small><h1>{result.country.name}</h1><p>{result.competitions.length} competitions across the provider’s complete season history.</p></div></div><dl><div><dt>Competitions</dt><dd>{result.competitions.length}</dd></div><div><dt>Active</dt><dd>{activeCount}</dd></div><div><dt>Historical</dt><dd>{result.competitions.length - activeCount}</dd></div></dl></div></section>
    <section className="country-competitions page-shell" aria-labelledby="country-competitions-title"><header><div><span className="section-number">02 / COMPETITIONS</span><h2 id="country-competitions-title">Leagues and cups</h2></div><p>{filtered.length} results</p></header><div className="country-filter-row"><label><Search aria-hidden="true" /><span className="sr-only">Search competitions</span><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search this country…" /></label><div role="group" aria-label="Competition type">{TYPES.map((item) => <button key={item.value} className={type === item.value ? 'is-active' : ''} onClick={() => update({ type: item.value })}>{item.label}</button>)}</div><div role="group" aria-label="Competition status">{STATUSES.map((item) => <button key={item.value} className={status === item.value ? 'is-active' : ''} onClick={() => update({ status: item.value })}>{item.label}</button>)}</div></div>
      {filtered.length ? <div className="country-competition-list">{filtered.map((competition) => { const season = currentSeason(competition); const active = competition.seasons.some((item) => item.current); return <Link key={competition.league.id} to="/competitions/$leagueId" params={{ leagueId: String(competition.league.id) }} search={{ season: season?.year ?? 2024 }}><span className="country-competition-logo"><img src={competition.league.logo} alt="" /></span><div><small>{active ? 'Active competition' : 'Historical competition'}</small><h3>{competition.league.name}</h3></div><span><CalendarRange aria-hidden="true" />{season?.year ?? '—'}</span><span><Database aria-hidden="true" />{coverageCount(season)} areas</span><b><Trophy aria-hidden="true" />{competition.league.type}</b></Link> })}</div> : <div className="empty-state"><div className="empty-icon"><Search aria-hidden="true" /></div><h2>No competitions found</h2><p>Adjust the name, type, or era filters.</p></div>}
    </section>
  </main>
}
