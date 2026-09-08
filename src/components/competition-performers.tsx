import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Award, LoaderCircle, Medal } from 'lucide-react'

import { getCompetitionPerformers } from '#/server/competition-performers'

import type { PerformerCategory } from '#/lib/competition'
import type { PlayerSeasonResponse, PlayerStatistics } from '#/lib/player'
import type { CompetitionPerformersResult } from '#/server/competition-performers'

interface Props { leagueId: number; season: number }
const categories: { id: PerformerCategory; label: string; value: string }[] = [
  { id: 'scorers', label: 'Goals', value: 'Goals' },
  { id: 'assists', label: 'Assists', value: 'Assists' },
  { id: 'yellow-cards', label: 'Yellow cards', value: 'YC' },
  { id: 'red-cards', label: 'Red cards', value: 'RC' },
]

function rankingValue(stat: PlayerStatistics | undefined, category: PerformerCategory) {
  if (!stat) return null
  if (category === 'scorers') return stat.goals.total
  if (category === 'assists') return stat.goals.assists
  if (category === 'yellow-cards') return stat.cards.yellow
  return stat.cards.red
}

function representativeStatistics(item: PlayerSeasonResponse, leagueId: number) {
  return item.statistics.find((stat) => stat.league.id === leagueId) ?? item.statistics.at(0)
}

export function CompetitionPerformers({ leagueId, season }: Props) {
  const [category, setCategory] = useState<PerformerCategory>('scorers')
  const [results, setResults] = useState<Partial<Record<PerformerCategory, CompetitionPerformersResult>>>({})
  const [loading, setLoading] = useState<PerformerCategory | null>(null)
  const current = results[category]

  const load = async (next: PerformerCategory, force = false) => {
    setCategory(next)
    if ((!force && results[next]) || loading) return
    setLoading(next)
    const result = await getCompetitionPerformers({ data: { leagueId, season, category: next } })
    setResults((existing) => ({ ...existing, [next]: result }))
    setLoading(null)
  }

  return <section className="competition-panel performer-panel" aria-labelledby="performers-title">
    <header><div><span className="section-number">03 / LEADERS</span><h2 id="performers-title">Top performers</h2></div><small>Provider-ranked</small></header>
    <div className="performer-tabs" role="tablist" aria-label="Performance category">{categories.map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.id} className={category === item.id ? 'is-active' : ''} onClick={() => void load(item.id)}>{item.label}</button>)}</div>
    {!current && loading !== category && <div className="performer-gate"><Award aria-hidden="true" /><h3>Meet the competition leaders</h3><p>Load the selected ranking when you need it. Other leaderboards remain untouched.</p><button type="button" onClick={() => void load(category)}>Load {categories.find((item) => item.id === category)?.label.toLowerCase()}</button></div>}
    {loading === category && <div className="performer-loading" role="status"><LoaderCircle aria-hidden="true" /><span>Loading ranking…</span></div>}
    {current && !current.ok && <div className="performer-error" role="alert"><AlertTriangle aria-hidden="true" /><div><strong>Ranking unavailable</strong><p>{current.message}</p></div><button type="button" onClick={() => void load(category, true)}>Try again</button></div>}
    {current?.ok && (current.players.length ? <ol className="performer-list">{current.players.map((item, index) => {
      const stat = representativeStatistics(item, leagueId)
      const teams = [...new Map(item.statistics.map((entry) => [entry.team.id, entry.team])).values()]
      return <li key={item.player.id}>
        <span className="performer-rank">{index === 0 ? <Medal aria-label="First" /> : String(index + 1).padStart(2, '0')}</span>
        <Link className="performer-player" to="/players/$playerId" params={{ playerId: String(item.player.id) }} search={{ season }}><img src={item.player.photo} alt="" /><div><strong>{item.player.name}</strong><span>{stat?.games.position ?? 'Position unavailable'}</span></div></Link>
        <div className="performer-teams" aria-label={`Teams: ${teams.map((team) => team.name).join(', ')}`}>{teams.slice(0, 2).map((team) => <Link key={team.id} to="/teams/$teamId" params={{ teamId: String(team.id) }} search={{ league: leagueId, season }} title={team.name}><img src={team.logo} alt={`${team.name} logo`} /></Link>)}</div>
        <span className="performer-support"><b>{stat?.games.appearences ?? '—'}</b> apps</span>
        <strong className="performer-value">{rankingValue(stat, category) ?? '—'}<small>{categories.find((entry) => entry.id === category)?.value}</small></strong>
      </li>
    })}</ol> : <div className="performer-gate"><Award aria-hidden="true" /><h3>No ranking available</h3><p>The provider returned no players for this competition and season.</p></div>)}
  </section>
}
