import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { decryptPrivateKey } from '../lib/crypto'
import type { User } from '../types'

export function useAuth() {
  const { user, privateKey, isLoading, setUser, setPrivateKey, setLoading, logout } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        logout()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setUser(data as User)
    setLoading(false)
  }

  async function register(username: string, password: string) {
    const { generateKeyPair, fingerprintKey, encryptPrivateKey } = await import('../lib/crypto')
    const keyPair = await generateKeyPair()
    const fingerprint = await fingerprintKey(keyPair.publicKey)
    const encrypted = await encryptPrivateKey(keyPair.privateKey, password)

    const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@r3lay.local`

    const { data, error } = await supabase.auth.signUp({ email: fakeEmail, password })
    if (error) throw error

    const userId = data.user!.id

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email: fakeEmail,
      username,
      public_key: keyPair.publicKey,
      key_fingerprint: fingerprint,
    })

    if (insertError) {
      // Supprimer le compte auth si l'insert échoue
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
      if (insertError.code === '23505') throw new Error('Ce nom d\'utilisateur est déjà pris.')
      throw new Error(insertError.message)
    }

    localStorage.setItem(`r3lay-pk-${userId}`, JSON.stringify(encrypted))
    setPrivateKey(keyPair.privateKey)
  }

  async function login(username: string, password: string) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, is_banned')
      .eq('username', username)
      .single()

    if (profileError || !profile) throw new Error('Utilisateur introuvable.')
    if (profile.is_banned) throw new Error('Ce compte a été banni.')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    })
    if (error) throw new Error('Mot de passe incorrect.')

    const userId = data.user.id
    const stored = localStorage.getItem(`r3lay-pk-${userId}`)
    if (!stored) throw new Error('Clé privée introuvable sur cet appareil.')

    const { encryptedKey, salt, nonce } = JSON.parse(stored)
    const pk = await decryptPrivateKey(encryptedKey, salt, nonce, password)
    setPrivateKey(pk)
  }

  async function signOut() {
    await supabase.auth.signOut()
    logout()
  }

  return { user, privateKey, isLoading, register, login, signOut }
}
