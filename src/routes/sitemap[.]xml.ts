import { createFileRoute } from '@tanstack/react-router'

import { PRIORITY_DOMESTIC_CUPS, PRIORITY_LEAGUES, PRIORITY_TOURNAMENTS } from '#/lib/league-priority'
import { absoluteUrl } from '#/lib/seo'

const staticPages = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/countries', changefreq: 'weekly', priority: '0.8' },
  { path: '/competitions', changefreq: 'daily', priority: '0.9' },
  { path: '/teams', changefreq: 'daily', priority: '0.8' },
  { path: '/players', changefreq: 'daily', priority: '0.8' },
] as const

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        const competitionPages = [...PRIORITY_TOURNAMENTS, ...PRIORITY_LEAGUES, ...PRIORITY_DOMESTIC_CUPS].map((competition) => ({
          path: `/competitions/${competition.id}?season=2024`,
          changefreq: 'daily',
          priority: '0.8',
        }))
        const urls = [...staticPages, ...competitionPages]
          .map(({ path, changefreq, priority }) => `  <url>\n    <loc>${escapeXml(absoluteUrl(path, origin))}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`)
          .join('\n')
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
        return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
      },
    },
  },
})
