import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Flag, Globe2, RefreshCw, Search, ShieldAlert } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { compareCountryPriority } from '#/lib/country'

import type { CountriesResult } from '#/server/countries'

const BATCH_SIZE = 36

export function CountryExplorer({ result, query }: { result: CountriesResult; query: string }) {
  const navigate = useNavigate({ from: '/countries/' })
  const [input, setInput] = useState(query)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinel = useRef<HTMLDivElement>(null)
  const countries = result.ok ? result.countries : []
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return countries.filter((country) => !needle || country.name.toLocaleLowerCase().includes(needle) || country.code?.toLocaleLowerCase().includes(needle)).sort(compareCountryPriority)
  }, [countries, query])
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  useEffect(() => setVisibleCount(BATCH_SIZE), [query])
  useEffect(() => setInput(query), [query])
  useEffect(() => {
    if (input === query) return
    const timer = window.setTimeout(() => void navigate({ search: { q: input || undefined }, replace: true, resetScroll: false }), 300)
    return () => window.clearTimeout(timer)
  }, [input, navigate, query])
  useEffect(() => {
    const target = sentinel.current
    if (!target || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + BATCH_SIZE, filtered.length)) }, { rootMargin: '500px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [filtered.length, hasMore])

  return <main id="main-content" className="countries-page">
    <section className="countries-hero"><div className="page-shell"><div><span className="eyebrow"><span /> Football without borders</span><h1>Explore the game<br /><em>country by country.</em></h1><p>Move from national football landscapes into their leagues, cups, clubs and players.</p></div><Globe2 aria-hidden="true" /></div></section>
    <section className="country-directory page-shell" aria-labelledby="country-directory-title"><header><div><span className="section-number">01 / COUNTRY INDEX</span><h2 id="country-directory-title">The football world</h2></div><p>{filtered.length} of {countries.length} countries</p></header>
      <label className="country-search"><Search aria-hidden="true" /><span className="sr-only">Search countries</span><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search country or code…" /></label>
      {!result.ok ? <div className="error-state" role="alert"><ShieldAlert aria-hidden="true" /><div><h2>Country index unavailable</h2><p>{result.message}</p></div></div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search aria-hidden="true" /></div><h2>No countries found</h2><p>Try another country name or code.</p></div> : <><div className="country-grid">{visible.map((country, index) => <Link key={country.name} to="/countries/$countryName" params={{ countryName: country.name }} className="country-card"><span>{country.flag ? <img src={country.flag} alt="" loading="lazy" /> : <Globe2 aria-hidden="true" />}</span><div><small>{String(index + 1).padStart(3, '0')} · {country.code ?? 'GLOBAL'}</small><h3>{country.name}</h3></div><Flag aria-hidden="true" /></Link>)}</div><div ref={sentinel} className="match-load-sentinel" aria-live="polite">{hasMore ? <><RefreshCw aria-hidden="true" /> Loading more countries</> : `Showing all ${filtered.length} countries`}</div></>}
    </section>
  </main>
}
