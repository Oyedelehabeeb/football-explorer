import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CircleAlert, HeartPulse, LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-react'

import { getFixtureAvailability } from '#/server/availability'

import type { FixtureTeam } from '#/lib/football'
import type { FixtureAbsence } from '#/lib/availability'
import type { AvailabilityResult } from '#/server/availability'

function TeamAvailability({ team, absences, season }: { team: FixtureTeam; absences: FixtureAbsence[]; season: number }) {
  return <article className="availability-team"><header><img src={team.logo} alt="" /><div><h3>{team.name}</h3><span>{absences.length} reported {absences.length === 1 ? 'player' : 'players'}</span></div></header>{absences.length ? <div className="availability-list">{absences.map(({ player }) => {
    const questionable = player.status.toLocaleLowerCase() === 'questionable'
    return <Link key={player.id} to="/players/$playerId" params={{ playerId: String(player.id) }} search={{ season }}><img src={player.photo} alt={`${player.name} portrait`} loading="lazy" /><div><strong>{player.name}</strong><span>{player.reason ?? 'Reason unavailable'}</span></div><b className={questionable ? 'is-questionable' : ''}>{player.status}</b></Link>
  })}</div> : <div className="availability-clear"><HeartPulse aria-hidden="true" /><p>No absences have been reported for this team.</p></div>}</article>
}

export function MatchAvailability({ fixtureId, home, away, season }: { fixtureId: number; home: FixtureTeam; away: FixtureTeam; season: number }) {
  const [result, setResult] = useState<AvailabilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (loading) return
    setLoading(true)
    setResult(await getFixtureAvailability({ data: { fixtureId } }))
    setLoading(false)
  }

  if (loading) return <div className="availability-gate" role="status"><LoaderCircle className="is-loading" aria-hidden="true" /><strong>Checking team availability…</strong></div>
  if (!result) return <div className="availability-gate"><HeartPulse aria-hidden="true" /><strong>Latest squad availability</strong><p>Check the provider’s latest reported absences and selection doubts for both teams.</p><button type="button" onClick={() => void load()}>Check team availability</button></div>
  if (!result.ok) return <div className="availability-error" role="alert"><ShieldAlert aria-hidden="true" /><div><strong>Team availability unavailable</strong><p>{result.message}</p></div><button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" /> Try again</button></div>

  const homeAbsences = result.absences.filter((item) => item.team.id === home.id)
  const awayAbsences = result.absences.filter((item) => item.team.id === away.id)
  return <div className="availability-loaded"><div className="availability-teams"><TeamAvailability team={home} absences={homeAbsences} season={season} /><TeamAvailability team={away} absences={awayAbsences} season={season} /></div><div className="availability-note"><CircleAlert aria-hidden="true" /><p>Availability reports can change before kickoff. “Questionable” means participation has not been confirmed either way.</p></div></div>
}
