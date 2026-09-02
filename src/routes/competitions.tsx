import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/competitions')({
  component: CompetitionLayout,
})

function CompetitionLayout() {
  return <Outlet />
}
