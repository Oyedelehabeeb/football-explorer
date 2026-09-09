import { createFileRoute } from '@tanstack/react-router'

import { CoachDetail } from '#/components/coach-detail'
import { absoluteUrl, breadcrumbJsonLd, seoHead } from '#/lib/seo'
import { getCoachDetail } from '#/server/coach-detail'

export const Route = createFileRoute('/coaches/$coachId')({
  loader: ({ params }) => {
    const coachId = Number(params.coachId)
    if (!Number.isInteger(coachId) || coachId <= 0) {
      return { result: { ok: false as const, kind: 'not-found' as const, message: 'This coach could not be found.' } }
    }
    return getCoachDetail({ data: { coachId } }).then((result) => ({ result }))
  },
  head: ({ loaderData, params }) => {
    const result = loaderData?.result
    const path = `/coaches/${params.coachId}`
    if (!result?.ok) return seoHead({ title: 'Coach details — Football Explorer', description: 'Coach profile, career timeline and honours.', path, noIndex: true })
    const coach = result.data.coach
    const description = `Explore ${coach.name}’s coaching profile, career timeline, current team and honours.`
    return seoHead({
      title: `${coach.name} — Coaching career and trophies`,
      description,
      path,
      image: coach.photo,
      type: 'profile',
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'Person', name: coach.name, url: absoluteUrl(path), image: coach.photo, nationality: coach.nationality || undefined, birthDate: coach.birth.date || undefined, jobTitle: 'Football coach', affiliation: { '@type': 'SportsTeam', name: coach.team.name, logo: coach.team.logo } },
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Teams', path: '/teams' }, { name: coach.name, path }]),
      ],
    })
  },
  component: () => <CoachDetail {...Route.useLoaderData()} />,
})
