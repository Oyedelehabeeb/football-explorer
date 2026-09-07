import {
  HeadContent,
  Scripts,
  Link,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { Search, SunMedium } from 'lucide-react'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Football Explorer — Every match, one clear view',
      },
      {
        name: 'description',
        content: 'Explore football fixtures, scores and match states across competitions.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="site-header">
          <div className="page-shell header-inner">
            <a className="wordmark" href="/" aria-label="Football Explorer home"><span className="wordmark-ball" aria-hidden="true">FE</span><span>Football<strong>Explorer</strong></span></a>
            <nav aria-label="Primary navigation"><Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'is-active' }}>Matches</Link><Link to="/competitions" activeProps={{ className: 'is-active' }}>Competitions</Link><Link to="/teams" activeProps={{ className: 'is-active' }}>Teams</Link><Link to="/players" activeProps={{ className: 'is-active' }}>Players</Link></nav>
            <div className="header-actions"><button aria-label="Search (coming soon)" disabled><Search aria-hidden="true" /></button><button aria-label="Theme selection (coming soon)" disabled><SunMedium aria-hidden="true" /></button></div>
          </div>
        </header>
        {children}
        <footer className="site-footer"><div className="page-shell footer-inner"><span>Football Explorer</span><p>Football intelligence, without the noise.</p><span>Data provided by API-Football</span></div></footer>
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
