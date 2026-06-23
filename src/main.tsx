import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useSettingsStore, ACCENT_COLORS, FONT_SIZES } from './store/settingsStore'
import { useAuth } from './hooks/useAuth'
import './index.css'

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore()
  useAuth()

  useEffect(() => {
    const root = document.documentElement
    const accent = ACCENT_COLORS[settings.accentColor]
    root.style.setProperty('--accent', accent.primary)
    root.style.setProperty('--accent-light', accent.light)
    root.style.setProperty('--accent-ring', accent.ring)
    root.style.setProperty('--font-size-base', FONT_SIZES[settings.fontSize])
    if (settings.theme === 'light') {
      root.classList.add('light')
    } else if (settings.theme === 'dark') {
      root.classList.remove('light')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('light', !prefersDark)
    }
  }, [settings.accentColor, settings.fontSize, settings.theme])

  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
)
