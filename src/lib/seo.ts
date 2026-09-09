const DEFAULT_SITE_URL = 'http://localhost:3000'
const SITE_NAME = 'Football Explorer'

type StructuredData = Record<string, unknown> | Array<Record<string, unknown>>

interface SeoOptions {
  title: string
  description: string
  path: string
  image?: string | null
  type?: 'website' | 'profile' | 'article'
  noIndex?: boolean
  structuredData?: StructuredData
}

function configuredOrigin(fallback = DEFAULT_SITE_URL) {
  const value = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()
  try {
    return new URL(value || fallback).origin
  } catch {
    return DEFAULT_SITE_URL
  }
}

export function absoluteUrl(path: string, fallbackOrigin?: string) {
  return new URL(path, `${configuredOrigin(fallbackOrigin)}/`).toString()
}

export function seoHead({ title, description, path, image, type = 'website', noIndex = false, structuredData }: SeoOptions) {
  const canonical = absoluteUrl(path)
  const socialImage = image ? absoluteUrl(image) : null
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: noIndex ? 'noindex, follow' : 'index, follow' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:type', content: type },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      ...(socialImage ? [{ property: 'og:image', content: socialImage }] : []),
      { name: 'twitter:card', content: socialImage ? 'summary_large_image' : 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(socialImage ? [{ name: 'twitter:image', content: socialImage }] : []),
    ],
    links: [{ rel: 'canonical', href: canonical }],
    scripts: structuredData ? [{ type: 'application/ld+json', children: JSON.stringify(structuredData) }] : undefined,
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function seasonLabel(year: number) {
  return `${year}/${String(year + 1).slice(-2)}`
}
