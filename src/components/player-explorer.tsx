import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRightLeft, RefreshCw, Search, ShieldAlert, UserRound } from 'lucide-react'

import { Input } from '#/components/ui/input'

import type { PlayerProfile } from '#/lib/player'
import type { PlayerSearchResult } from '#/server/players'

const BATCH_SIZE = 30

function rank(player: PlayerProfile, query: string) {
  const needle = query.toLocaleLowerCase()
  const values = [player.name, player.firstname, player.lastname].filter(Boolean).map((value) => value!.toLocaleLowerCase())
  if (values.some((value) => value === needle)) return 0
  if (values.some((value) => value.startsWith(needle))) return 1
  return 2
}

export function PlayerExplorer({ result, query }: { result: PlayerSearchResult | null; query: string }) {
  const navigate = useNavigate({ from: '/players/' })
  const [input, setInput] = useState(query)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const players = useMemo(() => result?.ok ? [...result.players].sort((a, b) => rank(a, query) - rank(b, query) || a.name.localeCompare(b.name)) : [], [query, result])
  const visible = players.slice(0, visibleCount)
  const hasMore = visibleCount < players.length

  useEffect(() => { setInput(query); setVisibleCount(BATCH_SIZE) }, [query])
  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + BATCH_SIZE, players.length)) }, { rootMargin: '500px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, players.length])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = input.trim()
    if (nextQuery.length > 0 && nextQuery.length < 4) return
    void navigate({ search: { q: nextQuery || undefined }, replace: true, resetScroll: false })
  }

  return <main id="main-content" className="players-page">
    <section className="players-hero"><div className="page-shell"><span className="eyebrow"><span /> PLAYER INDEX</span><h1>Every player has<br /><em>a story in numbers.</em></h1><p>Search football’s global player index, then explore performance, career history and honours.</p><form className="player-search" role="search" onSubmit={submitSearch}><Search aria-hidden="true" /><label className="sr-only" htmlFor="player-search-input">Search players</label><Input id="player-search-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search by surname — e.g. Saka" autoComplete="off" /><button type="submit" disabled={input.trim().length > 0 && input.trim().length < 4}>Search</button></form><small>Enter at least four characters, then select Search.</small></div></section>
    <section className="player-directory page-shell" aria-labelledby="player-results-title"><header><div><span className="section-number">01 / PLAYER SEARCH</span><h2 id="player-results-title">{query ? `Results for “${query}”` : 'Find a player'}</h2></div><div className="player-directory-actions">{result?.ok && <p>{players.length.toLocaleString()} matches</p>}<Link to="/players/compare" search={{ season: 2024 }}><ArrowRightLeft aria-hidden="true" /> Compare players</Link></div></header>
      {!query ? <div className="player-search-prompt"><UserRound aria-hidden="true" /><h3>Start with a player’s surname</h3><p>Search uses the provider’s global profile directory. Current-team information appears on the player page.</p></div> : !result ? null : !result.ok ? <div className="error-state" role="alert"><ShieldAlert aria-hidden="true" /><div><h2>Player search unavailable</h2><p>{result.message}</p></div></div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search aria-hidden="true" /></div><h2>No players found</h2><p>Check the spelling or try a broader surname.</p></div> : <><div className="player-result-grid">{visible.map((player) => <Link key={player.id} className="player-result-card" to="/players/$playerId" params={{ playerId: String(player.id) }} search={{ season: 2024 }}><img src={player.photo} alt="" loading="lazy" /><div><span>{player.nationality ?? 'Nationality unavailable'}</span><h3>{player.name}</h3><p>{[player.position, player.age ? `${player.age} years` : null].filter(Boolean).join(' · ') || 'Profile available'}</p></div><strong>{player.number ?? '—'}</strong></Link>)}</div><div ref={sentinelRef} className="match-load-sentinel" aria-live="polite">{hasMore ? <><RefreshCw aria-hidden="true" /> Loading more players</> : `Showing all ${players.length.toLocaleString()} results`}</div></>}
    </section>
  </main>
}
