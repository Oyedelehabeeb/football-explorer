import { createFileRoute } from '@tanstack/react-router'

import { serverCache } from '#/server/cache'
import { serverRuntimeConfig } from '#/server/config'

export const Route = createFileRoute('/health.json')({
  server: {
    handlers: {
      GET: () => {
        const configured = Boolean(serverRuntimeConfig.apiFootballKey)
        return Response.json(
          {
            status: configured ? 'ok' : 'configuration-required',
            service: 'football-explorer',
            environment: serverRuntimeConfig.nodeEnv,
            apiFootball: { configured, checked: false },
            cache: { ...serverCache.stats(), scope: 'process-local' },
            timestamp: new Date().toISOString(),
          },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      },
    },
  },
})

