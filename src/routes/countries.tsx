import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/countries')({ component: () => <Outlet /> })
