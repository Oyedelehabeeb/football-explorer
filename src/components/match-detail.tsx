import { Link } from '@tanstack/react-router'
import { Activity, ArrowLeft, CalendarDays, Clock3, MapPin, ShieldAlert, Shirt, Trophy, UserRound } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { isLiveStatus } from '#/lib/football'

import type { FixtureDetail, FixtureEvent, FixtureLineup, FixturePlayerStatistics } from '#/lib/match'
import type { MatchDetailResult } from '#/server/matches'

interface MatchDetailProps { result: MatchDetailResult; timezone: string }

function matchStatus(match: FixtureDetail) {
  const status = match.fixture.status
  if (isLiveStatus(status.short)) return status.elapsed ? `${status.elapsed}${status.extra ? `+${status.extra}` : ''}′` : status.long
  return status.long
}

function EventMarker({ event }: { event: FixtureEvent }) {
  const type = event.type.toLowerCase()
  if (type === 'goal') return <span className="event-marker is-goal">⚽</span>
  if (type === 'card') return <span className={`event-marker is-card ${event.detail.toLowerCase().includes('red') ? 'is-red' : ''}`} />
  if (type === 'subst') return <span className="event-marker is-sub">↕</span>
  if (type === 'var') return <span className="event-marker is-var">VAR</span>
  return <span className="event-marker">•</span>
}

function EventTimeline({ match }: { match: FixtureDetail }) {
  if (!match.events.length) return <Unavailable title="No event timeline" copy="Detailed match events are not available for this fixture." />
  return <div className="event-timeline">{match.events.map((event, index) => {
    const home = event.team.id === match.teams.home.id
    return <div className={`event-row ${home ? 'is-home' : 'is-away'}`} key={`${event.time.elapsed}-${event.type}-${event.player.id}-${index}`}>
      <div className="event-copy"><strong>{event.player.name ?? event.detail}</strong><span>{event.type === 'Subst' && event.assist.name ? `For ${event.assist.name}` : event.detail}</span></div>
      <div className="event-time"><span>{event.time.elapsed}{event.time.extra ? `+${event.time.extra}` : ''}′</span><EventMarker event={event} /></div>
    </div>
  })}</div>
}

function Pitch({ lineup }: { lineup: FixtureLineup }) {
  const rows = new Map<number, FixtureLineup['startXI']>()
  for (const item of lineup.startXI) {
    const row = Number(item.player.grid?.split(':')[0] ?? 0)
    const current = rows.get(row) ?? []
    current.push(item)
    rows.set(row, current)
  }
  const orderedRows = [...rows.entries()].sort(([a], [b]) => b - a)

  return <div className="formation-pitch" aria-label={`${lineup.team.name} formation ${lineup.formation ?? ''}`}>
    <div className="pitch-circle" aria-hidden="true" />
    {orderedRows.map(([row, players]) => <div className="formation-row" key={row}>{players.sort((a, b) => Number(a.player.grid?.split(':')[1]) - Number(b.player.grid?.split(':')[1])).map(({ player }) => <div className="formation-player" key={player.id}><span>{player.number ?? '—'}</span><b>{player.name}</b></div>)}</div>)}
  </div>
}

function LineupCard({ lineup }: { lineup: FixtureLineup }) {
  return <article className="lineup-card"><header><img src={lineup.team.logo} alt="" /><div><span>{lineup.formation ?? 'Formation unavailable'}</span><h3>{lineup.team.name}</h3></div></header><Pitch lineup={lineup} /><div className="lineup-coach"><UserRound aria-hidden="true" /><span>Coach</span><strong>{lineup.coach.name ?? 'Unavailable'}</strong></div></article>
}

const PREFERRED_STATS = ['Ball Possession', 'Total Shots', 'Shots on Goal', 'Shots on Target', 'Corner Kicks', 'Fouls', 'Offsides', 'Yellow Cards', 'Red Cards', 'Total passes', 'Passes accurate', 'Passes %']

function TeamStatistics({ match }: { match: FixtureDetail }) {
  if (match.statistics.length < 2) return <Unavailable title="Statistics unavailable" copy="The provider has not supplied team statistics for this fixture." />
  const home = match.statistics.at(0)
  const away = match.statistics.at(1)
  if (!home || !away) return null
  const homeValues = new Map(home.statistics.map((item) => [item.type, item.value]))
  const awayValues = new Map(away.statistics.map((item) => [item.type, item.value]))
  const available = PREFERRED_STATS.filter((type) => homeValues.has(type) || awayValues.has(type))

  return <div className="stats-comparison"><div className="stats-team-head"><span><img src={home.team.logo} alt="" />{home.team.name}</span><span>{away.team.name}<img src={away.team.logo} alt="" /></span></div>{available.map((type) => <div className="stat-row" key={type}><strong>{homeValues.get(type) ?? '—'}</strong><span>{type}</span><strong>{awayValues.get(type) ?? '—'}</strong></div>)}</div>
}

function PlayerTeam({ team }: { team: FixturePlayerStatistics }) {
  return <article className="player-stat-team"><header><img src={team.team.logo} alt="" /><h3>{team.team.name}</h3></header><div className="player-stat-list">{team.players.map(({ player, statistics }) => {
    const stat = statistics.at(0)
    if (!stat) return null
    return <div className="player-stat-row" key={player.id}><img src={player.photo} alt="" loading="lazy" /><div><strong>{player.name}</strong><span>{stat.games.position ?? 'Player'} · {stat.games.minutes ?? 0} min</span></div><div><b>{stat.games.rating ? Number(stat.games.rating).toFixed(1) : '—'}</b><span>Rating</span></div></div>
  })}</div></article>
}

function Unavailable({ title, copy }: { title: string; copy: string }) {
  return <div className="match-unavailable"><Activity aria-hidden="true" /><div><strong>{title}</strong><p>{copy}</p></div></div>
}

function ScoreBreakdown({ match }: { match: FixtureDetail }) {
  const rows = [
    ['Half-time', match.score.halftime], ['Full-time', match.score.fulltime],
    ['Extra time', match.score.extratime], ['Penalties', match.score.penalty],
  ] as const
  return <div className="score-breakdown">{rows.filter(([, score]) => score.home !== null || score.away !== null).map(([label, score]) => <div key={label}><span>{label}</span><strong>{score.home ?? '—'} — {score.away ?? '—'}</strong></div>)}</div>
}

export function MatchDetail({ result, timezone }: MatchDetailProps) {
  if (!result.ok) return <main id="main-content" className="match-detail-page page-shell"><div className="match-detail-error"><ShieldAlert aria-hidden="true" /><h1>Match unavailable</h1><p>{result.message}</p><Button asChild><Link to="/">Return to matches</Link></Button></div></main>

  const match = result.match
  const date = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short', timeZone: timezone }).format(new Date(match.fixture.date))
  const hasScore = match.goals.home !== null || match.goals.away !== null

  return <main id="main-content" className="match-detail-page">
    <section className="match-hero"><div className="page-shell"><Link className="match-back" to="/" search={{ timezone }}><ArrowLeft aria-hidden="true" /> All matches</Link><div className="match-competition"><img src={match.league.logo} alt="" /><span>{match.league.country}</span><strong>{match.league.name}</strong><span>·</span><span>{match.league.round}</span></div><div className="match-scoreline">
      <div className="match-team is-home"><img src={match.teams.home.logo} alt="" /><h1>{match.teams.home.name}</h1></div>
      <div className="match-score-centre"><span className={isLiveStatus(match.fixture.status.short) ? 'is-live' : ''}>{matchStatus(match)}</span><strong>{hasScore ? `${match.goals.home ?? 0} — ${match.goals.away ?? 0}` : 'VS'}</strong><small>{date}</small></div>
      <div className="match-team is-away"><img src={match.teams.away.logo} alt="" /><h1>{match.teams.away.name}</h1></div>
    </div><div className="match-facts"><span><CalendarDays aria-hidden="true" />{date}</span>{match.fixture.venue.name && <span><MapPin aria-hidden="true" />{match.fixture.venue.name}{match.fixture.venue.city ? `, ${match.fixture.venue.city}` : ''}</span>}{match.fixture.referee && <span><UserRound aria-hidden="true" />{match.fixture.referee}</span>}<span><Clock3 aria-hidden="true" />{timezone.replaceAll('_', ' ')}</span></div></div></section>

    <div className="match-detail-grid page-shell"><div className="match-main-column">
      <section className="match-section"><header><span>01</span><div><small>Match story</small><h2>Events</h2></div></header><EventTimeline match={match} /></section>
      <section className="match-section"><header><span>02</span><div><small>On the pitch</small><h2>Lineups</h2></div></header>{match.lineups.length ? <div className="lineup-grid">{match.lineups.map((lineup) => <LineupCard lineup={lineup} key={lineup.team.id} />)}</div> : <Unavailable title="Lineups unavailable" copy="Lineups have not been published for this fixture." />}</section>
      <section className="match-section"><header><span>03</span><div><small>Match data</small><h2>Team statistics</h2></div></header><TeamStatistics match={match} /></section>
      <section className="match-section"><header><span>04</span><div><small>Individual performance</small><h2>Player statistics</h2></div></header>{match.players.length ? <div className="player-stats-grid">{match.players.map((team) => <PlayerTeam team={team} key={team.team.id} />)}</div> : <Unavailable title="Player statistics unavailable" copy="Individual performance data was not supplied for this fixture." />}</section>
    </div><aside className="match-sidebar"><div className="match-summary-card"><span>Match summary</span><ScoreBreakdown match={match} /></div><div className="match-coverage-card"><Trophy aria-hidden="true" /><strong>Available coverage</strong><ul><li className={match.events.length ? 'is-available' : ''}>Events</li><li className={match.lineups.length ? 'is-available' : ''}>Lineups</li><li className={match.statistics.length ? 'is-available' : ''}>Team statistics</li><li className={match.players.length ? 'is-available' : ''}>Player statistics</li></ul></div><div className="match-note"><Shirt aria-hidden="true" /><p>Coverage varies by competition and fixture. Unavailable sections are shown explicitly.</p></div></aside></div>
  </main>
}
