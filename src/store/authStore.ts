import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  privateKey: string | null
  isLoading: boolean
  isBanned: boolean
  setUser: (user: User | null) => void
  setPrivateKey: (key: string | null) => void
  setLoading: (loading: boolean) => void
  setBanned: (banned: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      privateKey: null,
      isLoading: true,
      isBanned: false,
      setUser: (user) => set({ user }),
      setPrivateKey: (privateKey) => set({ privateKey }),
      setLoading: (isLoading) => set({ isLoading }),
      setBanned: (isBanned) => set({ isBanned }),
      logout: () => set({ user: null, privateKey: null, isBanned: false }),
    }),
    {
      name: 'r3lay-auth',
      partialize: (state) => ({ user: state.user, isBanned: state.isBanned, privateKey: state.privateKey }),
    }
  )
)
