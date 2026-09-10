import {
  HeadContent,
  Scripts,
  Link,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { CalendarDays, Flag, Search, Trophy, UserRound, Users } from 'lucide-react'

import appCss from '../styles.css?url'
import { ThemeToggle, THEME_STORAGE_KEY } from '../components/theme-toggle'
import { absoluteUrl, seoHead } from '../lib/seo'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => {
    const seo = seoHead({
      title: 'Football Explorer — Every match, one clear view',
      description: 'Explore football fixtures, scores, competitions, teams and players from one clear football intelligence platform.',
      path: '/',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Football Explorer',
        url: absoluteUrl('/'),
        potentialAction: {
          '@type': 'SearchAction',
          target: absoluteUrl('/search?q={search_term_string}'),
          'query-input': 'required name=search_term_string',
        },
      },
    })
    return {
      ...seo,
      meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, ...seo.meta],
      links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      ...seo.links,
      ],
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const themeScript = `(() => { try { const key = '${THEME_STORAGE_KEY}'; const saved = localStorage.getItem(key); const theme = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'; const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.dataset.themePreference = theme; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch {} })();`

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="site-header">
          <div className="page-shell header-inner">
            <a className="wordmark" href="/" aria-label="Football Explorer home"><span className="wordmark-ball" aria-hidden="true">FE</span><span>Football<strong>Explorer</strong></span></a>
            <nav aria-label="Primary navigation"><Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'is-active', 'aria-current': 'page' }}>Matches</Link><Link to="/countries" activeProps={{ className: 'is-active', 'aria-current': 'page' }}>Countries</Link><Link to="/competitions" activeProps={{ className: 'is-active', 'aria-current': 'page' }}>Competitions</Link><Link to="/teams" activeProps={{ className: 'is-active', 'aria-current': 'page' }}>Teams</Link><Link to="/players" activeProps={{ className: 'is-active', 'aria-current': 'page' }}>Players</Link></nav>
            <div className="header-actions"><Link to="/search" aria-label="Search" activeProps={{ className: 'is-active' }}><Search aria-hidden="true" /></Link><ThemeToggle /></div>
          </div>
        </header>
        {children}
        <footer className="site-footer"><div className="page-shell footer-inner"><span>Football Explorer</span><p>Football intelligence, without the noise.</p><span>Data provided by API-Football</span></div></footer>
        <nav className="mobile-navigation" aria-label="Mobile primary navigation">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'is-active', 'aria-current': 'page' }}><CalendarDays aria-hidden="true" /><span>Matches</span></Link>
          <Link to="/countries" activeProps={{ className: 'is-active', 'aria-current': 'page' }}><Flag aria-hidden="true" /><span>Countries</span></Link>
          <Link to="/competitions" activeProps={{ className: 'is-active', 'aria-current': 'page' }}><Trophy aria-hidden="true" /><span>Competitions</span></Link>
          <Link to="/teams" activeProps={{ className: 'is-active', 'aria-current': 'page' }}><Users aria-hidden="true" /><span>Teams</span></Link>
          <Link to="/players" activeProps={{ className: 'is-active', 'aria-current': 'page' }}><UserRound aria-hidden="true" /><span>Players</span></Link>
        </nav>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
