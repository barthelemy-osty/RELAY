import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useSettingsStore, ACCENT_COLORS, FONT_SIZES } from './store/settingsStore'
import { useAuth } from './hooks/useAuth'
import { useAuthStore } from './store/authStore'
import './index.css'

function BannedScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-500/15 rounded-2xl mb-2">
          <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Compte banni</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          Ton compte a été banni par un administrateur.<br />
          Tu ne peux plus accéder à r3lay.
        </p>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
          <p className="text-xs text-rose-400 leading-relaxed">
            Si tu penses que c'est une erreur, contacte un administrateur.
          </p>
        </div>
      </div>
    </div>
  )
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore()
  const { isBanned } = useAuthStore()
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

  if (isBanned) return <BannedScreen />

  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
)
