import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Goal, MapPin, ShieldAlert, Trophy, UserRound, Users } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { isFinishedStatus, isLiveStatus } from '#/lib/football'

import type { FixtureSummary } from '#/lib/football'
import type { SquadPlayer } from '#/lib/team'
import type { TeamDetailResult } from '#/server/team-detail'

const SEASONS = [2024, 2023, 2022]
const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
const seasonLabel = (year: number) => `${year}/${String(year + 1).slice(-2)}`

function resultForTeam(fixture: FixtureSummary, teamId: number) {
  if (!isFinishedStatus(fixture.fixture.status.short)) return null
  const home = fixture.teams.home.id === teamId
  const scored = home ? fixture.goals.home : fixture.goals.away
  const conceded = home ? fixture.goals.away : fixture.goals.home
  if (scored === null || conceded === null) return null
  return scored > conceded ? 'W' : scored < conceded ? 'L' : 'D'
}

function FixtureRow({ fixture, teamId, timezone }: { fixture: FixtureSummary; teamId: number; timezone: string }) {
  const status = fixture.fixture.status.short
  const live = isLiveStatus(status)
  const finished = isFinishedStatus(status)
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: timezone }).format(new Date(fixture.fixture.date))
  const opponent = fixture.teams.home.id === teamId ? fixture.teams.away : fixture.teams.home
  const result = resultForTeam(fixture, teamId)
  return <Link className="team-fixture-row" to="/matches/$fixtureId" params={{ fixtureId: String(fixture.fixture.id) }}><span>{date}</span><img src={fixture.league.logo} alt="" /><div><small>{fixture.league.name}</small><strong>{fixture.teams.home.id === teamId ? 'vs' : '@'} {opponent.name}</strong></div><img src={opponent.logo} alt="" /><b className={result ? `is-${result.toLowerCase()}` : ''}>{live || finished ? `${fixture.goals.home ?? 0}–${fixture.goals.away ?? 0}` : '—'}</b></Link>
}

function SquadGroup({ position, players }: { position: string; players: SquadPlayer[] }) {
  return <section className="squad-group"><header><span>{position}</span><small>{players.length}</small></header><div>{players.map((player) => <article key={player.id}><img src={player.photo} alt="" loading="lazy" /><div><h3>{player.name}</h3><p>{player.age ? `${player.age} years` : position}</p></div><strong>{player.number ?? '—'}</strong></article>)}</div></section>
}

export function TeamDetail({ result, timezone }: { result: TeamDetailResult; timezone: string }) {
  const navigate = useNavigate({ from: '/teams/$teamId' })
  if (!result.ok) return <main id="main-content" className="competition-detail-error page-shell"><ShieldAlert aria-hidden="true" /><h1>Team unavailable</h1><p>{result.message}</p><Link to="/competitions"><ArrowLeft aria-hidden="true" /> Return to competitions</Link></main>
  const { team, season, leagueId, squad, coach, statistics, fixtures, unavailable } = result.data
  const now = Date.now()
  const ordered = [...fixtures].sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
  const recent = ordered.filter((item) => item.fixture.timestamp * 1000 <= now).slice(-5).reverse()
  const upcoming = ordered.filter((item) => item.fixture.timestamp * 1000 > now).slice(0, 5)
  const recentForm = recent.map((item) => resultForTeam(item, team.team.id)).filter((item): item is 'W' | 'D' | 'L' => item !== null).reverse()
  const form = statistics?.form?.slice(-10).split('') ?? recentForm
  const grouped = POSITIONS.map((position) => ({ position, players: squad.filter((player) => player.position === position) })).filter((group) => group.players.length)
  const updateSeason = (value: string) => void navigate({ search: (current) => ({ ...current, season: Number(value), timezone }), resetScroll: false })
  return <main id="main-content" className="team-detail-page">
    <section className="team-hero"><div className="page-shell"><Link className="match-back" to={leagueId ? '/competitions/$leagueId' : '/competitions'} params={leagueId ? { leagueId: String(leagueId) } : {}} search={leagueId ? { season } : {}}><ArrowLeft aria-hidden="true" /> Back to competition</Link><div className="team-hero-grid"><div className="team-identity"><div><img src={team.team.logo} alt={`${team.team.name} crest`} /></div><section><span>{team.team.country}{team.team.code ? ` · ${team.team.code}` : ''}</span><h1>{team.team.name}</h1><p>{team.team.founded ? `Founded ${team.team.founded}` : 'Professional football team'}</p></section></div>{statistics && <div className="team-record"><div><strong>{statistics.fixtures.played.total}</strong><span>Played</span></div><div><strong>{statistics.fixtures.wins.total}</strong><span>Wins</span></div><div><strong>{statistics.fixtures.draws.total}</strong><span>Draws</span></div><div><strong>{statistics.fixtures.loses.total}</strong><span>Losses</span></div></div>}</div><div className="team-hero-bottom"><label><span>Season</span><Select value={String(season)} onValueChange={updateSeason}><SelectTrigger aria-label="Select season"><SelectValue /></SelectTrigger><SelectContent>{SEASONS.map((year) => <SelectItem key={year} value={String(year)}>{seasonLabel(year)}</SelectItem>)}</SelectContent></Select></label><div className="team-form"><span>Recent form</span><div>{form.length ? form.map((item, index) => <b className={`is-${item.toLowerCase()}`} key={`${item}-${index}`}>{item}</b>) : '—'}</div></div></div></div></section>
    <div className="team-detail-layout page-shell"><div className="team-detail-main">
      <section className="team-panel" aria-labelledby="performance-title"><header><div><span className="section-number">01 / PERFORMANCE</span><h2 id="performance-title">Season at a glance</h2></div><small>{statistics?.league.name ?? seasonLabel(season)}</small></header>{statistics ? <div className="team-performance"><div className="performance-primary"><article><Goal aria-hidden="true" /><span>Goals scored</span><strong>{statistics.goals.for.total.total}</strong><small>{statistics.goals.for.average.total ?? '—'} per match</small></article><article><ShieldAlert aria-hidden="true" /><span>Goals conceded</span><strong>{statistics.goals.against.total.total}</strong><small>{statistics.goals.against.average.total ?? '—'} per match</small></article><article><Trophy aria-hidden="true" /><span>Clean sheets</span><strong>{statistics.clean_sheet.total}</strong><small>{statistics.failed_to_score.total} failed to score</small></article></div><div className="formation-usage"><span>Formation usage</span>{statistics.lineups.slice(0, 4).map((item) => <div key={item.formation}><strong>{item.formation}</strong><span><i style={{ width: `${Math.round(item.played / Math.max(1, statistics.fixtures.played.total) * 100)}%` }} /></span><b>{item.played}</b></div>)}</div></div> : <Empty label="Season statistics" failed={unavailable.includes('statistics')} />}</section>
      <section className="team-panel" aria-labelledby="fixtures-team-title"><header><div><span className="section-number">02 / MATCHES</span><h2 id="fixtures-team-title">Fixtures & results</h2></div><small>{fixtures.length} matches</small></header>{fixtures.length ? <div className="team-fixture-columns"><section><h3>Recent results</h3>{recent.map((fixture) => <FixtureRow key={fixture.fixture.id} fixture={fixture} teamId={team.team.id} timezone={timezone} />)}</section><section><h3>Upcoming</h3>{upcoming.length ? upcoming.map((fixture) => <FixtureRow key={fixture.fixture.id} fixture={fixture} teamId={team.team.id} timezone={timezone} />) : <p className="team-no-fixtures">No upcoming fixtures in this season.</p>}</section></div> : <Empty label="Fixtures" failed={unavailable.includes('fixtures')} />}</section>
      <section className="team-panel" aria-labelledby="squad-title"><header><div><span className="section-number">03 / SQUAD</span><h2 id="squad-title">First-team squad</h2></div><small>{squad.length} players</small></header>{grouped.length ? <div className="squad-groups">{grouped.map((group) => <SquadGroup key={group.position} {...group} />)}</div> : <Empty label="Squad" failed={unavailable.includes('squad')} />}</section>
    </div><aside className="team-detail-sidebar"><section className="team-venue-card">{team.venue.image && <img src={team.venue.image} alt="" />}<div><MapPin aria-hidden="true" /><span>Home ground</span><h2>{team.venue.name ?? 'Venue unavailable'}</h2><p>{[team.venue.address, team.venue.city].filter(Boolean).join(', ')}</p><dl><div><dt>Capacity</dt><dd>{team.venue.capacity?.toLocaleString() ?? '—'}</dd></div><div><dt>Surface</dt><dd>{team.venue.surface ?? '—'}</dd></div></dl></div></section><section className="team-coach-card"><UserRound aria-hidden="true" /><span>Head coach</span>{coach ? <><img src={coach.photo} alt="" /><h2>{coach.name}</h2><p>{coach.nationality ?? 'Nationality unavailable'} · {coach.age ?? '—'} years</p></> : <p>{unavailable.includes('coach') ? 'Coach data could not be loaded.' : 'No current coach identified.'}</p>}</section><section className="team-data-note"><Users aria-hidden="true" /><p>Squad data reflects the provider’s current team roster. Performance and fixtures use the selected season.</p></section></aside></div>
  </main>
}

function Empty({ label, failed }: { label: string; failed: boolean }) { return <div className="competition-unavailable"><CalendarDays aria-hidden="true" /><div><strong>{label} {failed ? 'could not be loaded' : 'are unavailable'}</strong><p>Other team information remains available.</p></div></div> }
