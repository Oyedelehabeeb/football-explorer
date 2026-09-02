import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tanstackStart(),
    // Nitro's Vite dev worker currently fails to initialize the SSR
    // environment reliably on Windows. TanStack Start provides its own
    // development SSR server, so Nitro is only needed for production builds.
    command === 'build' && nitro(),
    tailwindcss(),
    viteReact(),
  ],
}))

export default config
