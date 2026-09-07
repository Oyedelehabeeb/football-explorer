import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Award, CalendarDays, ChevronDown, Goal, ShieldAlert, Shirt, Timer, Trophy, Users } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { getPlayerSupportingData } from '#/server/player-detail'

import type { PlayerStatistics, PlayerSupportingData, PlayerTrophy } from '#/lib/player'
import type { PlayerDetailResult, PlayerSupportingResult } from '#/server/player-detail'

const seasonLabel = (year: number) => `${year}/${String(year + 1).slice(-2)}`
const value = (number: number | null) => number ?? '—'

function CompetitionStats({ item }: { item: PlayerStatistics }) {
  return <article className="player-stat-card"><header><img src={item.league.logo} alt="" /><div><span>{item.league.country}</span><h3>{item.league.name}</h3></div><strong>{item.games.rating ? Number(item.games.rating).toFixed(2) : '—'}<small>Rating</small></strong></header><div><dl><div><dt>Appearances</dt><dd>{value(item.games.appearences)}</dd></div><div><dt>Minutes</dt><dd>{item.games.minutes?.toLocaleString() ?? '—'}</dd></div><div><dt>Goals</dt><dd>{value(item.goals.total)}</dd></div><div><dt>Assists</dt><dd>{value(item.goals.assists)}</dd></div><div><dt>Shots on target</dt><dd>{value(item.shots.on)}</dd></div><div><dt>Key passes</dt><dd>{value(item.passes.key)}</dd></div></dl><Link to="/teams/$teamId" params={{ teamId: String(item.team.id) }} search={{ league: item.league.id, season: item.league.season }}><img src={item.team.logo} alt="" />{item.team.name}</Link></div></article>
}

function uniqueTrophies(items: PlayerTrophy[]) {
  const dated = new Set(items.filter((item) => item.season).map((item) => `${item.league}|${item.country}|${item.place}`))
  return items.filter((item, index) => {
    const identity = `${item.league}|${item.country}|${item.place}`
    if (!item.season && dated.has(identity)) return false
    return items.findIndex((candidate) => candidate.league === item.league && candidate.country === item.country && candidate.season === item.season && candidate.place === item.place) === index
  })
}

function SupportingHistory({ data }: { data: PlayerSupportingData }) {
  const trophies = uniqueTrophies(data.trophies)
  const transfers = data.transfers.flatMap((group) => group.transfers)
  return <div className="player-history-grid"><section><header><Trophy aria-hidden="true" /><div><span>Honours</span><h3>{trophies.length} recorded finishes</h3></div></header>{trophies.length ? <div className="trophy-list">{trophies.map((item, index) => <div key={`${item.league}-${item.season}-${index}`}><Award aria-hidden="true" /><div><strong>{item.league}</strong><span>{item.country} · {item.season ?? 'Season unavailable'}</span></div><b>{item.place}</b></div>)}</div> : <p className="player-history-empty">No trophies are recorded for this player.</p>}</section><section><header><CalendarDays aria-hidden="true" /><div><span>Availability history</span><h3>{data.sidelined.length} recorded absences</h3></div></header>{data.sidelined.length ? <div className="sidelined-list">{data.sidelined.slice(0, 8).map((item) => <div key={`${item.type}-${item.start}`}><i /><div><strong>{item.type}</strong><span>{item.start} — {item.end ?? 'Ongoing'}</span></div></div>)}</div> : <p className="player-history-empty">No sidelined periods are recorded.</p>}</section><section><header><Shirt aria-hidden="true" /><div><span>Transfers</span><h3>{transfers.length} recorded moves</h3></div></header>{transfers.length ? <div className="transfer-list">{transfers.map((item, index) => <div key={`${item.date}-${index}`}><span>{item.date}</span><strong>{item.teams.out.name} → {item.teams.in.name}</strong><small>{item.type ?? 'Type unavailable'}</small></div>)}</div> : <p className="player-history-empty">No recorded transfers for this player.</p>}</section></div>
}

export function PlayerDetail({ result }: { result: PlayerDetailResult }) {
  const navigate = useNavigate({ from: '/players/$playerId' })
  const [support, setSupport] = useState<PlayerSupportingResult | null>(null)
  const [loadingSupport, setLoadingSupport] = useState(false)
  if (!result.ok) return <main id="main-content" className="competition-detail-error page-shell"><ShieldAlert aria-hidden="true" /><h1>Player unavailable</h1><p>{result.message}</p><Link to="/players"><ArrowLeft aria-hidden="true" /> Return to players</Link></main>
  const { player, statistics, career, season } = result.data
  const seasons = [...new Set(career.flatMap((entry) => entry.seasons).concat(season))].sort((a, b) => b - a)
  const primary = statistics.find((item) => item.team.id !== 10) ?? statistics.at(0)
  const loadHistory = async () => {
    if (support || loadingSupport) return
    setLoadingSupport(true)
    setSupport(await getPlayerSupportingData({ data: { playerId: player.id } }))
    setLoadingSupport(false)
  }
  const history = support === null
    ? <button className="load-player-history" onClick={() => void loadHistory()} disabled={loadingSupport}>{loadingSupport ? <><Timer aria-hidden="true" /> Loading history…</> : <><ChevronDown aria-hidden="true" /> Load career history</>}</button>
    : support.ok
      ? <SupportingHistory data={support.data} />
      : <div className="error-state" role="alert"><ShieldAlert aria-hidden="true" /><div><h2>History unavailable</h2><p>{support.message}</p></div></div>
  return <main id="main-content" className="player-detail-page"><section className="player-profile-hero"><div className="page-shell"><Link className="match-back" to="/players"><ArrowLeft aria-hidden="true" /> Back to players</Link><div className="player-profile-grid"><div className="player-portrait"><img src={player.photo} alt={`${player.name} portrait`} /></div><div className="player-profile-copy"><span>{player.nationality ?? 'Nationality unavailable'} · {primary?.games.position ?? player.position ?? 'Position unavailable'}</span><h1>{player.firstname || player.name}<br /><em>{player.lastname ?? ''}</em></h1><p>{primary ? <><img src={primary.team.logo} alt="" /> {primary.team.name}</> : 'Team unavailable'}</p></div><div className="player-profile-facts"><div><span>Age</span><strong>{player.age ?? '—'}</strong></div><div><span>Height</span><strong>{player.height ?? '—'}</strong></div><div><span>Weight</span><strong>{player.weight ?? '—'}</strong></div><div><span>Status</span><strong>{player.injured ? 'Injured' : 'Available'}</strong></div></div></div><label className="player-season-select"><span>Season</span><Select value={String(season)} onValueChange={(next) => void navigate({ search: { season: Number(next) }, resetScroll: false })}><SelectTrigger aria-label="Select season"><SelectValue /></SelectTrigger><SelectContent>{seasons.map((year) => <SelectItem key={year} value={String(year)}>{seasonLabel(year)}</SelectItem>)}</SelectContent></Select></label></div></section>
    <div className="player-detail-body page-shell"><section className="player-section" aria-labelledby="player-performance-title"><header><div><span className="section-number">01 / PERFORMANCE</span><h2 id="player-performance-title">Competition record</h2></div><p>{statistics.length} competitions · totals kept separate</p></header>{statistics.length ? <div className="player-stat-grid">{statistics.map((item, index) => <CompetitionStats item={item} key={`${item.team.id}-${item.league.id}-${index}`} />)}</div> : <div className="player-search-prompt"><Goal aria-hidden="true" /><h3>No statistics for {seasonLabel(season)}</h3><p>Choose another season to explore this player’s record.</p></div>}</section>
      <section className="player-section" aria-labelledby="career-title"><header><div><span className="section-number">02 / CAREER</span><h2 id="career-title">Teams & seasons</h2></div><p>{career.length} teams</p></header>{career.length ? <div className="career-team-list">{career.map((entry) => <Link key={entry.team.id} to="/teams/$teamId" params={{ teamId: String(entry.team.id) }} search={{ season: entry.seasons[0] ?? season }}><img src={entry.team.logo} alt="" /><div><h3>{entry.team.name}</h3><p>{entry.seasons.length ? `${Math.min(...entry.seasons)} — ${Math.max(...entry.seasons)}` : 'Seasons unavailable'}</p></div><span>{entry.seasons.length}</span></Link>)}</div> : <div className="player-search-prompt"><Users aria-hidden="true" /><h3>Career history unavailable</h3></div>}</section>
      <section className="player-section player-history" aria-labelledby="history-title"><header><div><span className="section-number">03 / HISTORY</span><h2 id="history-title">Honours, absences & transfers</h2></div></header>{history}</section>
    </div></main>
}
