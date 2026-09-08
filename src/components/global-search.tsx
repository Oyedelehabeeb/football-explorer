import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Database, Search, ShieldAlert, Trophy, UserRound, Users } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { currentSeason } from '#/lib/competition'
import { compareCompetitionPriority } from '#/lib/league-priority'

import type { FormEvent } from 'react'
import type { CompetitionsResult } from '#/server/competitions'
import type { PlayerSearchResult } from '#/server/players'
import type { TeamsResult } from '#/server/teams'

interface GlobalSearchResult { competitions: CompetitionsResult; teams: TeamsResult; players: PlayerSearchResult }

function SectionError({ label, message }: { label: string; message: string }) {
  return <div className="global-search-category-error"><ShieldAlert aria-hidden="true" /><div><strong>{label} unavailable</strong><p>{message}</p></div></div>
}

export function GlobalSearch({ query, result }: { query: string; result: GlobalSearchResult | null }) {
  const navigate = useNavigate({ from: '/search' })
  const [input, setInput] = useState(query)
  useEffect(() => setInput(query), [query])
  const competitions = useMemo(() => {
    if (!result?.competitions.ok) return []
    const needle = query.toLocaleLowerCase()
    return result.competitions.competitions.filter((item) => item.league.name.toLocaleLowerCase().includes(needle) || item.country.name.toLocaleLowerCase().includes(needle)).sort((a, b) => compareCompetitionPriority(a, b) || a.league.name.localeCompare(b.league.name)).slice(0, 8)
  }, [query, result])
  const teams = result?.teams.ok ? result.teams.teams.slice(0, 8) : []
  const players = result?.players.ok ? result.players.players.slice(0, 8) : []
  const total = competitions.length + teams.length + players.length
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = input.trim()
    if (value.length >= 4 && value !== query) void navigate({ search: { q: value } })
  }

  return <main id="main-content" className="global-search-page"><section className="global-search-hero"><div className="page-shell"><span className="eyebrow"><span /> GLOBAL SEARCH</span><h1>Search the whole<br /><em>football world.</em></h1><form onSubmit={submit}><label><Search aria-hidden="true" /><span className="sr-only">Search competitions, teams and players</span><Input autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search competitions, clubs or players…" autoComplete="off" /></label><button type="submit" disabled={input.trim().length < 4 || input.trim() === query}>Search</button></form><small>Enter at least four characters. Requests are sent only when you submit.</small></div></section><div className="global-search-content page-shell">
    {!result ? <div className="global-search-prompt"><Search aria-hidden="true" /><h2>One search, every direction</h2><p>Find a competition, open a club, or move directly into a player’s story.</p></div> : <><header className="global-search-summary"><div><span className="section-number">01 / SEARCH RESULTS</span><h2>Results for “{query}”</h2></div><p>{total} shown</p></header>
      <section className="global-search-section" aria-labelledby="global-competitions"><header><Trophy aria-hidden="true" /><div><h2 id="global-competitions">Competitions</h2><span>{competitions.length} results</span></div></header>{!result.competitions.ok ? <SectionError label="Competitions" message={result.competitions.message} /> : competitions.length ? <div className="global-competition-results">{competitions.map((item) => { const season = currentSeason(item); return <Link key={item.league.id} to="/competitions/$leagueId" params={{ leagueId: String(item.league.id) }} search={{ season: season?.year ?? 2024 }}><span><img src={item.league.logo} alt="" /></span><div><small>{item.country.name} · {item.league.type}</small><strong>{item.league.name}</strong></div><ArrowRight aria-hidden="true" /></Link> })}</div> : <p className="global-no-results">No matching competitions.</p>}</section>
      <section className="global-search-section" aria-labelledby="global-teams"><header><Users aria-hidden="true" /><div><h2 id="global-teams">Teams</h2><span>{teams.length} results</span></div></header>{!result.teams.ok ? <SectionError label="Teams" message={result.teams.message} /> : teams.length ? <div className="global-team-results">{teams.map(({ team, venue }) => <Link key={team.id} to="/teams/$teamId" params={{ teamId: String(team.id) }} search={{ season: 2024 }}><img src={team.logo} alt="" /><div><small>{team.country}{venue.city ? ` · ${venue.city}` : ''}</small><strong>{team.name}</strong></div><ArrowRight aria-hidden="true" /></Link>)}</div> : <p className="global-no-results">No matching teams.</p>}</section>
      <section className="global-search-section" aria-labelledby="global-players"><header><UserRound aria-hidden="true" /><div><h2 id="global-players">Players</h2><span>{players.length} results</span></div></header>{!result.players.ok ? <SectionError label="Players" message={result.players.message} /> : players.length ? <div className="global-player-results">{players.map((player) => <Link key={player.id} to="/players/$playerId" params={{ playerId: String(player.id) }} search={{ season: 2024 }}><img src={player.photo} alt="" /><div><small>{player.nationality ?? 'Nationality unavailable'}</small><strong>{player.name}</strong></div><ArrowRight aria-hidden="true" /></Link>)}</div> : <p className="global-no-results">No matching players.</p>}</section>
      {total === 0 && result.competitions.ok && result.teams.ok && result.players.ok && <div className="global-search-empty"><Database aria-hidden="true" /><h2>No results found</h2><p>Try a surname, full club name, competition, or country.</p></div>}
    </>}
  </div></main>
}
