import { useState } from 'react'
import { Activity, BrainCircuit, LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-react'

import { getMatchPrediction } from '#/server/predictions'

import type { MatchOutlook as MatchOutlookData, PredictionSide } from '#/lib/prediction'
import type { PredictionResult } from '#/server/predictions'

const comparisons: { key: keyof MatchOutlookData['comparison']; label: string }[] = [
  { key: 'form', label: 'Recent form' }, { key: 'attack', label: 'Attacking' }, { key: 'defence', label: 'Defending' },
  { key: 'poisson', label: 'Goal model' }, { key: 'headToHead', label: 'Head-to-head' }, { key: 'goals', label: 'Goals' }, { key: 'total', label: 'Overall' },
]
const numeric = (value: string | null) => Math.max(0, Math.min(100, Number.parseFloat(value ?? '0') || 0))

function TeamForm({ team }: { team: PredictionSide }) {
  return <article className="outlook-team"><header><img src={team.logo} alt="" /><div><h3>{team.name}</h3><span>{team.recent.played ?? 0} recent matches sampled</span></div></header><div className="outlook-form" aria-label={`${team.name} league form`}>{team.leagueForm ? [...team.leagueForm].map((result, index) => <b className={`is-${result.toLocaleLowerCase()}`} key={`${result}-${index}`}>{result}</b>) : <span>Form unavailable</span>}</div><dl><div><dt>Recent form</dt><dd>{team.recent.form ?? '—'}</dd></div><div><dt>Goals scored</dt><dd>{team.recent.goalsFor.total ?? '—'}<small>{team.recent.goalsFor.average ? `${team.recent.goalsFor.average} avg` : ''}</small></dd></div><div><dt>Goals allowed</dt><dd>{team.recent.goalsAgainst.total ?? '—'}<small>{team.recent.goalsAgainst.average ? `${team.recent.goalsAgainst.average} avg` : ''}</small></dd></div></dl></article>
}

function OutlookData({ data }: { data: MatchOutlookData }) {
  return <div className="outlook-loaded"><div className="outlook-probability"><span>Provider model outlook</span><div><div><strong>{data.percent.home ?? '—'}</strong><small>{data.home.name}</small></div><div><strong>{data.percent.draw ?? '—'}</strong><small>Draw</small></div><div><strong>{data.percent.away ?? '—'}</strong><small>{data.away.name}</small></div></div><p>{data.advantage.name ? `Model edge: ${data.advantage.name}` : 'No model edge is available.'} This is an analytical estimate, not a certainty.</p></div><div className="outlook-teams"><TeamForm team={data.home} /><TeamForm team={data.away} /></div><div className="outlook-comparisons">{comparisons.map(({ key, label }) => { const item = data.comparison[key]; const home = numeric(item.home); const away = numeric(item.away); return <div key={key}><strong>{item.home ?? '—'}</strong><section><span>{label}</span><div aria-hidden="true"><i style={{ width: `${home}%` }} /><i style={{ width: `${away}%` }} /></div></section><strong>{item.away ?? '—'}</strong></div> })}</div><div className="outlook-disclaimer"><Activity aria-hidden="true" /><p>Based on provider algorithms and currently available team data. Small early-season samples can produce volatile estimates.</p></div></div>
}

export function MatchOutlook({ fixtureId, homeName, awayName }: { fixtureId: number; homeName: string; awayName: string }) {
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const load = async () => { if (loading) return; setLoading(true); setResult(await getMatchPrediction({ data: { fixtureId } })); setLoading(false) }
  if (loading) return <div className="outlook-gate" role="status"><LoaderCircle className="is-loading" aria-hidden="true" /><strong>Building match outlook…</strong></div>
  if (!result) return <div className="outlook-gate"><BrainCircuit aria-hidden="true" /><strong>{homeName} vs {awayName}</strong><p>Load a model-based comparison using form, scoring and historical performance signals.</p><button type="button" onClick={() => void load()}>Load match outlook</button></div>
  if (!result.ok) return <div className="outlook-error" role="alert"><ShieldAlert aria-hidden="true" /><div><strong>Match outlook unavailable</strong><p>{result.message}</p></div><button type="button" onClick={() => void load()}><RefreshCw aria-hidden="true" /> Try again</button></div>
  if (!result.outlook) return <div className="outlook-gate"><BrainCircuit aria-hidden="true" /><strong>No outlook available</strong><p>The provider returned no analytical model for this fixture.</p></div>
  return <OutlookData data={result.outlook} />
}
