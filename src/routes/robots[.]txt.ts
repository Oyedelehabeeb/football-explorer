import { createFileRoute } from '@tanstack/react-router'

import { absoluteUrl } from '#/lib/seo'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        const body = `User-agent: *\nAllow: /\nDisallow: /_serverFn/\n\nSitemap: ${absoluteUrl('/sitemap.xml', origin)}\n`
        return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
      },
    },
  },
})
