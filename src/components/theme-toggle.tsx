import { useEffect, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

export const THEME_STORAGE_KEY = 'football-explorer-theme'

type ThemePreference = 'light' | 'dark' | 'system'

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function applyTheme(theme: ThemePreference) {
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark)

  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.dataset.themePreference = theme
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>('system')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const initialTheme = isThemePreference(savedTheme) ? savedTheme : 'system'

    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const syncSystemTheme = () => {
      if (theme === 'system') applyTheme('system')
    }

    mediaQuery.addEventListener('change', syncSystemTheme)
    return () => mediaQuery.removeEventListener('change', syncSystemTheme)
  }, [theme])

  const selectTheme = (nextTheme: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  const ActiveIcon = themeOptions.find((option) => option.value === theme)?.icon ?? Monitor

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Theme: ${theme}`}>
          <ActiveIcon aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="theme-menu" align="end" sideOffset={10}>
        <div className="theme-menu-heading">
          <strong>Appearance</strong>
          <span>Choose how Football Explorer looks.</span>
        </div>
        <div className="theme-options" role="radiogroup" aria-label="Color theme">
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isSelected = theme === option.value

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={isSelected ? 'is-selected' : undefined}
                onClick={() => selectTheme(option.value)}
              >
                <Icon aria-hidden="true" />
                <span>{option.label}</span>
                {isSelected ? <Check aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
