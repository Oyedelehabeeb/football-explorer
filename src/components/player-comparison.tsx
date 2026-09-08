import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRightLeft, Search, ShieldAlert, UserRound, X } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { searchPlayers } from '#/server/players'

import type { FormEvent } from 'react'
import type { PlayerProfile, PlayerSeasonResponse, PlayerStatistics } from '#/lib/player'
import type { PlayerComparisonResult } from '#/server/player-detail'

const SEASONS = [2025, 2024, 2023, 2022, 2021, 2020]
const seasonLabel = (year: number) => `${year}/${String(year + 1).slice(-2)}`
const add = (items: PlayerStatistics[], read: (item: PlayerStatistics) => number | null) => items.reduce((total, item) => total + (read(item) ?? 0), 0)

interface Totals { appearances: number; minutes: number; goals: number; assists: number; shotsOn: number; keyPasses: number; tackles: number; interceptions: number; dribbles: number; yellow: number; red: number; rating: number | null }

function totals(items: PlayerStatistics[]): Totals {
  const appearances = add(items, (item) => item.games.appearences)
  const ratings = items.map((item) => ({ rating: Number(item.games.rating), weight: item.games.appearences ?? 0 })).filter((item) => Number.isFinite(item.rating) && item.weight > 0)
  const ratingWeight = ratings.reduce((sum, item) => sum + item.weight, 0)
  return {
    appearances,
    minutes: add(items, (item) => item.games.minutes), goals: add(items, (item) => item.goals.total), assists: add(items, (item) => item.goals.assists),
    shotsOn: add(items, (item) => item.shots.on), keyPasses: add(items, (item) => item.passes.key), tackles: add(items, (item) => item.tackles.total),
    interceptions: add(items, (item) => item.tackles.interceptions), dribbles: add(items, (item) => item.dribbles.success), yellow: add(items, (item) => item.cards.yellow),
    red: add(items, (item) => item.cards.red) + add(items, (item) => item.cards.yellowred), rating: ratingWeight ? ratings.reduce((sum, item) => sum + item.rating * item.weight, 0) / ratingWeight : null,
  }
}

function PlayerSearch({ side, selected, onSelect }: { side: 'left' | 'right'; selected?: PlayerProfile; onSelect: (player: PlayerProfile | null) => void }) {
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (value.length < 4 || loading) return
    setLoading(true); setMessage('')
    const result = await searchPlayers({ data: { query: value } })
    if (result.ok) { setPlayers(result.players); if (!result.players.length) setMessage('No players found.') } else { setPlayers([]); setMessage(result.message) }
    setLoading(false)
  }
  if (selected) return <div className="comparison-selection"><img src={selected.photo} alt={`${selected.name} portrait`} /><div><span>{side === 'left' ? 'Player one' : 'Player two'}</span><strong>{selected.name}</strong><small>{selected.nationality ?? 'Nationality unavailable'}</small></div><button type="button" onClick={() => onSelect(null)} aria-label={`Remove ${selected.name}`}><X aria-hidden="true" /></button></div>
  return <form className="comparison-search" onSubmit={submit}><label><Search aria-hidden="true" /><span className="sr-only">Search for {side === 'left' ? 'player one' : 'player two'}</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search surname…" /></label><button type="submit" disabled={query.trim().length < 4 || loading}>{loading ? 'Searching…' : 'Search'}</button>{message && <p role="status">{message}</p>}{players.length > 0 && <div className="comparison-results">{players.slice(0, 8).map((player) => <button type="button" key={player.id} onClick={() => { onSelect(player); setPlayers([]) }}><img src={player.photo} alt="" /><span><strong>{player.name}</strong><small>{player.nationality ?? 'Nationality unavailable'}</small></span></button>)}</div>}</form>
}

function PlayerHead({ data, season }: { data: PlayerSeasonResponse; season: number }) {
  const primary = [...data.statistics].sort((a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)).at(0)
  return <div className="comparison-player-head"><img src={data.player.photo} alt={`${data.player.name} portrait`} /><div><span>{primary?.games.position ?? data.player.position ?? 'Player'}</span><h2>{data.player.name}</h2><p>{data.player.nationality ?? 'Nationality unavailable'} · {seasonLabel(season)}</p></div></div>
}

const METRICS: Array<{ key: keyof Totals; label: string; digits?: number; lower?: boolean }> = [
  { key: 'rating', label: 'Average rating', digits: 2 }, { key: 'appearances', label: 'Appearances' }, { key: 'minutes', label: 'Minutes' },
  { key: 'goals', label: 'Goals' }, { key: 'assists', label: 'Assists' }, { key: 'shotsOn', label: 'Shots on target' }, { key: 'keyPasses', label: 'Key passes' },
  { key: 'tackles', label: 'Tackles' }, { key: 'interceptions', label: 'Interceptions' }, { key: 'dribbles', label: 'Successful dribbles' },
  { key: 'yellow', label: 'Yellow cards', lower: true }, { key: 'red', label: 'Red cards', lower: true },
]

function ComparisonData({ result }: { result: Extract<PlayerComparisonResult, { ok: true }> }) {
  const shared = useMemo(() => {
    const rightIds = new Set(result.right.statistics.map((item) => item.league.id))
    return result.left.statistics.filter((item, index, all) => rightIds.has(item.league.id) && all.findIndex((candidate) => candidate.league.id === item.league.id) === index).sort((a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0))
  }, [result])
  const [scope, setScope] = useState(shared[0] ? String(shared[0].league.id) : 'all')
  const filter = (data: PlayerSeasonResponse) => scope === 'all' ? data.statistics : data.statistics.filter((item) => String(item.league.id) === scope)
  const left = totals(filter(result.left)); const right = totals(filter(result.right))
  return <section className="comparison-board" aria-labelledby="comparison-results-title"><header><div><span className="section-number">02 / COMPARISON</span><h2 id="comparison-results-title">Season performance</h2></div><label><span>Scope</span><Select value={scope} onValueChange={setScope}><SelectTrigger aria-label="Select comparison scope"><SelectValue /></SelectTrigger><SelectContent>{shared.map((item) => <SelectItem key={item.league.id} value={String(item.league.id)}>{item.league.name}</SelectItem>)}<SelectItem value="all">All recorded competitions</SelectItem></SelectContent></Select></label></header><div className="comparison-heads"><PlayerHead data={result.left} season={result.season} /><span>VS</span><PlayerHead data={result.right} season={result.season} /></div><div className="comparison-metrics">{METRICS.map(({ key, label, digits, lower }) => { const leftValue = left[key]; const rightValue = right[key]; const leftLeads = leftValue !== null && rightValue !== null && (lower ? leftValue < rightValue : leftValue > rightValue); const rightLeads = leftValue !== null && rightValue !== null && (lower ? rightValue < leftValue : rightValue > leftValue); const format = (value: number | null) => value === null ? '—' : digits ? value.toFixed(digits) : value.toLocaleString(); return <div key={key}><strong className={leftLeads ? 'is-leading' : ''}>{format(leftValue)}</strong><span>{label}</span><strong className={rightLeads ? 'is-leading' : ''}>{format(rightValue)}</strong></div> })}</div><footer><ShieldAlert aria-hidden="true" /><p>Totals reflect API-Football records for the selected season and scope. Ratings are weighted by appearances; for disciplinary cards, the lower value is highlighted.</p></footer></section>
}

export function PlayerComparison({ left, right, season, result }: { left?: number; right?: number; season: number; result: PlayerComparisonResult | null }) {
  const navigate = useNavigate({ from: '/players/compare' })
  const [leftPlayer, setLeftPlayer] = useState<PlayerProfile | undefined>(result?.ok ? result.left.player : undefined)
  const [rightPlayer, setRightPlayer] = useState<PlayerProfile | undefined>(result?.ok ? result.right.player : undefined)
  const update = (next: { left?: number | null; right?: number | null; season?: number }) => void navigate({ search: { left: next.left === null ? undefined : next.left ?? left, right: next.right === null ? undefined : next.right ?? right, season: next.season ?? season } })
  const selectLeft = (player: PlayerProfile | null) => { setLeftPlayer(player ?? undefined); update({ left: player?.id ?? null }) }
  const selectRight = (player: PlayerProfile | null) => { setRightPlayer(player ?? undefined); update({ right: player?.id ?? null }) }
  const content = result === null
    ? <div className="comparison-empty"><UserRound aria-hidden="true" /><h2>Select two players</h2><p>The comparison will load after both player slots are filled.</p></div>
    : result.ok
      ? <ComparisonData key={`${result.left.player.id}-${result.right.player.id}-${result.season}`} result={result} />
      : <div className="comparison-error" role="alert"><ShieldAlert aria-hidden="true" /><h2>Comparison unavailable</h2><p>{result.message}</p></div>
  return <main id="main-content" className="player-comparison-page"><section className="comparison-hero"><div className="page-shell"><Link className="match-back" to="/players"><ArrowLeft aria-hidden="true" /> Player index</Link><span className="eyebrow"><span /> HEAD TO HEAD</span><h1>Compare the game<br /><em>behind the names.</em></h1><p>Place two players side by side using their recorded season performance.</p></div></section><div className="page-shell comparison-content"><section className="comparison-builder" aria-labelledby="comparison-builder-title"><header><div><span className="section-number">01 / SELECT PLAYERS</span><h2 id="comparison-builder-title">Build your comparison</h2></div><label><span>Season</span><Select value={String(season)} onValueChange={(value) => update({ season: Number(value) })}><SelectTrigger aria-label="Select season"><SelectValue /></SelectTrigger><SelectContent>{SEASONS.map((year) => <SelectItem key={year} value={String(year)}>{seasonLabel(year)}</SelectItem>)}</SelectContent></Select></label></header><div className="comparison-pickers"><PlayerSearch side="left" selected={leftPlayer} onSelect={selectLeft} /><ArrowRightLeft aria-hidden="true" /><PlayerSearch side="right" selected={rightPlayer} onSelect={selectRight} /></div>{left && right && left === right && <p className="comparison-warning" role="alert">Choose two different players to compare.</p>}</section>{content}</div></main>
}
