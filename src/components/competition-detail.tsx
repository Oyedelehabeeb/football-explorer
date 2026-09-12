import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Check, MapPin, Shield, ShieldAlert, Trophy, Users } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { CompetitionPerformers } from '#/components/competition-performers'
import { isFinishedStatus, isLiveStatus } from '#/lib/football'

import type { StandingRow } from '#/lib/competition'
import type { FixtureSummary } from '#/lib/football'
import type { CompetitionDetailResult } from '#/server/competition-detail'

interface CompetitionDetailProps { result: CompetitionDetailResult; timezone: string }
const AVAILABLE_PLAN_SEASONS = [2024, 2023, 2022]

function seasonLabel(year: number) { return `${year}/${String(year + 1).slice(-2)}` }

function FixtureCard({ fixture }: { fixture: FixtureSummary }) {
  const status = fixture.fixture.status.short
  const finished = isFinishedStatus(status)
  const live = isLiveStatus(status)
  const kickoff = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: fixture.fixture.timezone }).format(new Date(fixture.fixture.date))
  return <Link className="competition-fixture" to="/matches/$fixtureId" params={{ fixtureId: String(fixture.fixture.id) }}>
    <div className="competition-fixture-meta"><span className={live ? 'is-live' : ''}>{live ? `${fixture.fixture.status.elapsed ?? 0}'` : finished ? 'FT' : kickoff}</span><small>{fixture.fixture.venue.name ?? fixture.fixture.venue.city ?? 'Venue TBC'}</small></div>
    <div className="competition-fixture-team"><span>{fixture.teams.home.name}</span><img src={fixture.teams.home.logo} alt="" /></div>
    <strong>{finished || live ? `${fixture.goals.home ?? 0} — ${fixture.goals.away ?? 0}` : 'vs'}</strong>
    <div className="competition-fixture-team is-away"><img src={fixture.teams.away.logo} alt="" /><span>{fixture.teams.away.name}</span></div>
  </Link>
}

function StandingsTable({ rows, leagueId, season }: { rows: StandingRow[]; leagueId: number; season: number }) {
  return <div className="standings-scroll"><table className="competition-standings"><caption className="sr-only">Competition standings for the {seasonLabel(season)} season</caption><thead><tr><th scope="col">Position</th><th scope="col">Club</th><th scope="col"><span aria-hidden="true">P</span><span className="sr-only">Played</span></th><th scope="col"><span aria-hidden="true">W</span><span className="sr-only">Won</span></th><th scope="col"><span aria-hidden="true">D</span><span className="sr-only">Drawn</span></th><th scope="col"><span aria-hidden="true">L</span><span className="sr-only">Lost</span></th><th scope="col"><span aria-hidden="true">GD</span><span className="sr-only">Goal difference</span></th><th scope="col"><span aria-hidden="true">Pts</span><span className="sr-only">Points</span></th><th scope="col">Form</th></tr></thead><tbody>{rows.map((row) => <tr key={row.team.id}><td><span className="standing-rank">{row.rank}</span></td><th scope="row"><Link className="standing-team-link" to="/teams/$teamId" params={{ teamId: String(row.team.id) }} search={{ league: leagueId, season }}><img src={row.team.logo} alt="" /><span>{row.team.name}</span></Link></th><td>{row.all.played}</td><td>{row.all.win}</td><td>{row.all.draw}</td><td>{row.all.lose}</td><td>{row.goalsDiff > 0 ? '+' : ''}{row.goalsDiff}</td><td><strong>{row.points}</strong></td><td><span className="standing-form">{row.form?.slice(-5) || '—'}</span></td></tr>)}</tbody></table></div>
}

export function CompetitionDetail({ result, timezone }: CompetitionDetailProps) {
  const navigate = useNavigate({ from: '/competitions/$leagueId' })
  if (!result.ok) return <main id="main-content" className="competition-detail-error page-shell"><ShieldAlert aria-hidden="true" /><h1>Competition unavailable</h1><p>{result.message}</p><Link to="/competitions"><ArrowLeft aria-hidden="true" /> Return to competitions</Link></main>

  const { competition, season, standings, teams, rounds, selectedRound, fixtures, unavailable } = result
  const selectedSeason = competition.seasons.find((item) => item.year === season)
  const coverage = selectedSeason?.coverage
  const coverageItems = [
    ['Standings', coverage?.standings], ['Players', coverage?.players], ['Match events', coverage?.fixtures.events],
    ['Lineups', coverage?.fixtures.lineups], ['Match statistics', coverage?.fixtures.statistics_fixtures], ['Injuries', coverage?.injuries],
  ] as const
  const updateSearch = (next: { season?: number; round?: string }) => void navigate({ search: (current) => ({ ...current, ...next, timezone, round: next.season ? undefined : next.round ?? current.round }), resetScroll: false })

  return <main id="main-content" className="competition-detail-page">
    <section className="competition-detail-hero"><div className="page-shell">
      <Link className="match-back" to="/competitions"><ArrowLeft aria-hidden="true" /> All competitions</Link>
      <div className="competition-identity"><div className="competition-detail-logo"><img src={competition.league.logo} alt={`${competition.league.name} logo`} /></div><div><span>{competition.country.flag && <img src={competition.country.flag} alt="" />} {competition.country.name} · {competition.league.type}</span><h1>{competition.league.name}</h1><p>Standings, clubs and every fixture from the selected round.</p></div></div>
      <div className="competition-detail-controls"><label><span>Season</span><Select value={String(season)} onValueChange={(value) => updateSearch({ season: Number(value) })}><SelectTrigger aria-label="Select season"><SelectValue /></SelectTrigger><SelectContent>{AVAILABLE_PLAN_SEASONS.map((year) => <SelectItem key={year} value={String(year)}>{seasonLabel(year)}</SelectItem>)}</SelectContent></Select></label><div><span>Teams</span><strong>{teams.length || '—'}</strong></div><div><span>Rounds</span><strong>{rounds.length || '—'}</strong></div></div>
    </div></section>

    <nav className="entity-section-nav page-shell" aria-label={`${competition.league.name} page sections`}><a href="#competition-table">Table</a><a href="#competition-fixtures">Fixtures</a>{coverage?.top_scorers || coverage?.top_assists || coverage?.top_cards ? <a href="#competition-leaders">Leaders</a> : null}<a href="#competition-clubs">Clubs</a></nav>
    <div className="competition-detail-layout page-shell">
      <div className="competition-detail-main">
        <section id="competition-table" className="competition-panel" aria-labelledby="standings-title"><header><div><span className="section-number">01 / TABLE</span><h2 id="standings-title">Standings</h2></div><small>{seasonLabel(season)}</small></header>
          {standings.length ? standings.map((group, index) => <div key={group[0]?.group ?? index}>{standings.length > 1 && <h3 className="standing-group-title">{group[0]?.group}</h3>}<StandingsTable rows={group} leagueId={competition.league.id} season={season} /></div>) : <Unavailable label="Standings" unavailable={unavailable.includes('standings')} />}
        </section>

        <section id="competition-fixtures" className="competition-panel" aria-labelledby="fixtures-title"><header><div><span className="section-number">02 / FIXTURES</span><h2 id="fixtures-title">Round fixtures</h2></div>{rounds.length > 0 && <Select value={selectedRound ?? undefined} onValueChange={(value) => updateSearch({ round: value })}><SelectTrigger aria-label="Select round" className="round-select"><SelectValue placeholder="Select round" /></SelectTrigger><SelectContent>{rounds.map((item) => <SelectItem key={item.round} value={item.round}>{item.round}</SelectItem>)}</SelectContent></Select>}</header>
          {fixtures.length ? <div className="competition-fixtures">{fixtures.map((fixture) => <FixtureCard key={fixture.fixture.id} fixture={fixture} />)}</div> : <Unavailable label="Fixtures" unavailable={unavailable.includes('fixtures') || unavailable.includes('rounds')} />}
        </section>

        {coverage?.top_scorers || coverage?.top_assists || coverage?.top_cards ? <div id="competition-leaders"><CompetitionPerformers key={`${competition.league.id}-${season}`} leagueId={competition.league.id} season={season} /></div> : null}

        <section id="competition-clubs" className="competition-panel" aria-labelledby="clubs-title"><header><div><span className="section-number">04 / CLUBS</span><h2 id="clubs-title">Competing teams</h2></div><small>{teams.length} clubs</small></header>
          {teams.length ? <div className="competition-team-grid">{teams.map(({ team, venue }) => <Link key={team.id} to="/teams/$teamId" params={{ teamId: String(team.id) }} search={{ league: competition.league.id, season }}><img src={team.logo} alt="" /><div><h3>{team.name}</h3><p><MapPin aria-hidden="true" />{venue.city ?? team.country}</p></div><span>{team.founded ?? '—'}</span></Link>)}</div> : <Unavailable label="Teams" unavailable={unavailable.includes('teams')} />}
        </section>
      </div>

      <aside className="competition-detail-sidebar">
        <section><Trophy aria-hidden="true" /><span>Competition profile</span><dl><div><dt>Country</dt><dd>{competition.country.name}</dd></div><div><dt>Format</dt><dd>{competition.league.type}</dd></div><div><dt>Season</dt><dd>{seasonLabel(season)}</dd></div></dl></section>
        <section><Shield aria-hidden="true" /><span>Data coverage</span><ul>{coverageItems.map(([label, available]) => <li className={available ? 'is-available' : ''} key={label}>{available ? <Check aria-hidden="true" /> : <span />} {label}</li>)}</ul><p>Coverage reflects what the provider currently makes available for this season.</p></section>
        <section className="competition-sidebar-note"><Users aria-hidden="true" /><p>Team and standings data are cached and shared across this page. Only the selected round’s fixtures are requested.</p></section>
      </aside>
    </div>
  </main>
}

function Unavailable({ label, unavailable }: { label: string; unavailable: boolean }) { return <div className="competition-unavailable"><CalendarDays aria-hidden="true" /><div><strong>{label} {unavailable ? 'could not be loaded' : 'are not available'}</strong><p>{unavailable ? 'The provider did not return this section. Other competition data remains available.' : 'No data was returned for this competition and season.'}</p></div></div> }
