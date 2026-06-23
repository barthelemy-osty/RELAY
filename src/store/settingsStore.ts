import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type AppSettings, DEFAULT_SETTINGS } from '../types'

interface SettingsState {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: 'r3lay-settings' }
  )
)

// CSS variable map for accent colors
export const ACCENT_COLORS: Record<string, { primary: string; light: string; ring: string }> = {
  violet: { primary: '#7C3AED', light: '#EDE9FE', ring: '#7C3AED40' },
  blue:   { primary: '#2563EB', light: '#DBEAFE', ring: '#2563EB40' },
  emerald:{ primary: '#059669', light: '#D1FAE5', ring: '#05966940' },
  rose:   { primary: '#E11D48', light: '#FFE4E6', ring: '#E11D4840' },
  amber:  { primary: '#D97706', light: '#FEF3C7', ring: '#D9770640' },
  cyan:   { primary: '#0891B2', light: '#CFFAFE', ring: '#0891B240' },
}

export const FONT_SIZES: Record<string, string> = {
  sm: '13px',
  md: '15px',
  lg: '17px',
}
