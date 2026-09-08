import { createFileRoute } from '@tanstack/react-router'

import { CoachDetail } from '#/components/coach-detail'
import { getCoachDetail } from '#/server/coach-detail'

export const Route = createFileRoute('/coaches/$coachId')({
  loader: ({ params }) => {
    const coachId = Number(params.coachId)
    if (!Number.isInteger(coachId) || coachId <= 0) {
      return { result: { ok: false as const, kind: 'not-found' as const, message: 'This coach could not be found.' } }
    }
    return getCoachDetail({ data: { coachId } }).then((result) => ({ result }))
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.result.ok ? `${loaderData.result.data.coach.name} — Football Explorer` : 'Coach details — Football Explorer' },
      { name: 'description', content: 'Coach profile, current team, career timeline, honours and availability history.' },
    ],
  }),
  component: () => <CoachDetail {...Route.useLoaderData()} />,
})
