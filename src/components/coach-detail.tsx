import { Link } from '@tanstack/react-router'
import { ArrowLeft, Award, CalendarDays, MapPin, Ruler, ShieldAlert, Trophy, UserRound } from 'lucide-react'

import type { CoachTrophy } from '#/lib/coach'
import type { CoachDetailResult } from '#/server/coach-detail'

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function ageFromBirthDate(value: string | null, fallback: number | null) {
  if (!value) return fallback
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return fallback
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1
  return age
}

function uniqueTrophies(items: CoachTrophy[]) {
  const dated = new Set(items.filter((item) => item.season).map((item) => `${item.league}|${item.country}|${item.place}`))
  return items.filter((item, index) => {
    const identity = `${item.league}|${item.country}|${item.place}`
    if (!item.season && dated.has(identity)) return false
    return items.findIndex((candidate) => candidate.league === item.league && candidate.country === item.country && candidate.season === item.season && candidate.place === item.place) === index
  })
}

export function CoachDetail({ result }: { result: CoachDetailResult }) {
  if (!result.ok) {
    return <main id="main-content" className="competition-detail-error page-shell"><ShieldAlert aria-hidden="true" /><h1>Coach unavailable</h1><p>{result.message}</p><Link to="/teams"><ArrowLeft aria-hidden="true" /> Return to teams</Link></main>
  }

  const { coach, sidelined, unavailable } = result.data
  const trophies = uniqueTrophies(result.data.trophies)
  const career = [...coach.career].sort((left, right) => right.start.localeCompare(left.start))
  const age = ageFromBirthDate(coach.birth.date, coach.age)
  const currentRole = career.find((entry) => entry.end === null) ?? null

  return <main id="main-content" className="coach-detail-page">
    <section className="coach-hero"><div className="page-shell"><Link className="match-back" to="/teams"><ArrowLeft aria-hidden="true" /> Back to teams</Link><div className="coach-hero-grid"><div className="coach-portrait"><img src={coach.photo} alt={`${coach.name} portrait`} /></div><div className="coach-identity"><span><UserRound aria-hidden="true" /> Head coach</span><h1>{coach.firstname || coach.name}<br /><em>{coach.lastname ?? ''}</em></h1><p>{coach.nationality ?? 'Nationality unavailable'}{age !== null ? ` · ${age} years` : ''}</p></div><dl className="coach-facts"><div><dt>Born</dt><dd>{formatDate(coach.birth.date)}</dd></div><div><dt>Birthplace</dt><dd>{[coach.birth.place, coach.birth.country].filter(Boolean).join(', ') || 'Unavailable'}</dd></div><div><dt>Height</dt><dd>{coach.height ?? '—'}</dd></div><div><dt>Weight</dt><dd>{coach.weight ?? '—'}</dd></div></dl></div></div></section>
    <div className="coach-detail-layout page-shell"><div className="coach-main-column">
      <section className="coach-panel" aria-labelledby="coach-career-title"><header><div><span className="section-number">01 / CAREER</span><h2 id="coach-career-title">Coaching timeline</h2></div><small>{career.length} appointments</small></header>{career.length ? <div className="coach-timeline">{career.map((entry, index) => <article key={`${entry.team.id}-${entry.start}-${index}`} className={entry.end === null ? 'is-current' : undefined}><span className="coach-timeline-marker" /><Link to="/teams/$teamId" params={{ teamId: String(entry.team.id) }} search={{}}><img src={entry.team.logo} alt="" /><div><strong>{entry.team.name}</strong><span>{formatDate(entry.start)} — {entry.end ? formatDate(entry.end) : 'Present'}</span></div></Link>{entry.end === null ? <b>Current</b> : null}</article>)}</div> : <div className="coach-empty"><CalendarDays aria-hidden="true" /><p>No coaching appointments are recorded.</p></div>}</section>
      <section className="coach-panel" aria-labelledby="coach-honours-title"><header><div><span className="section-number">02 / HONOURS</span><h2 id="coach-honours-title">Career honours</h2></div><small>{trophies.length} recorded finishes</small></header>{trophies.length ? <div className="coach-honours">{trophies.map((item, index) => <article key={`${item.league}-${item.season}-${index}`}><Award aria-hidden="true" /><div><strong>{item.league}</strong><span>{item.country} · {item.season ?? 'Season unavailable'}</span></div><b>{item.place}</b></article>)}</div> : <div className="coach-empty"><Trophy aria-hidden="true" /><p>{unavailable.includes('trophies') ? 'Career honours could not be loaded.' : 'No career honours are recorded.'}</p></div>}<footer><ShieldAlert aria-hidden="true" /><p>Provider records may include honours earned across both playing and coaching careers.</p></footer></section>
      {sidelined.length || unavailable.includes('sidelined') ? <section className="coach-panel" aria-labelledby="coach-availability-title"><header><div><span className="section-number">03 / AVAILABILITY</span><h2 id="coach-availability-title">Sidelined history</h2></div><small>{sidelined.length} periods</small></header>{sidelined.length ? <div className="coach-absences">{sidelined.map((item, index) => <article key={`${item.type}-${item.start}-${index}`}><span /><div><strong>{item.type}</strong><small>{formatDate(item.start)} — {item.end ? formatDate(item.end) : 'Ongoing'}</small></div></article>)}</div> : <div className="coach-empty"><ShieldAlert aria-hidden="true" /><p>Sidelined history could not be loaded.</p></div>}</section> : null}
    </div><aside className="coach-sidebar"><section><span>Current appointment</span>{currentRole ? <Link to="/teams/$teamId" params={{ teamId: String(currentRole.team.id) }} search={{}}><img src={currentRole.team.logo} alt="" /><h2>{currentRole.team.name}</h2><p>Since {formatDate(currentRole.start)}</p></Link> : <><UserRound aria-hidden="true" /><h2>No current appointment</h2><p>The provider has no open-ended career entry.</p></>}</section><section><MapPin aria-hidden="true" /><span>Profile scope</span><p>Career dates and honours reflect records supplied by API-Football.</p></section><section><Ruler aria-hidden="true" /><span>Physical profile</span><dl><div><dt>Height</dt><dd>{coach.height ?? '—'}</dd></div><div><dt>Weight</dt><dd>{coach.weight ?? '—'}</dd></div></dl></section></aside></div>
  </main>
}
