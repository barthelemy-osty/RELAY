import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { decryptPrivateKey } from '../lib/crypto'
import type { User } from '../types'

let profileChannel: ReturnType<typeof supabase.channel> | null = null

export function useAuth() {
  const { user, privateKey, isLoading, setUser, setPrivateKey, setLoading, logout, setBanned } = useAuthStore()

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

  useEffect(() => {
    if (!user?.id) return
    if (profileChannel) return

    profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`,
      }, async (payload) => {
        const updated = payload.new as User
        if (updated.role === 'banned') {
          await supabase.auth.signOut()
          setBanned(true)
        } else {
          setUser(updated)
        }
      })
      .subscribe()

    return () => {}
  }, [user?.id])

  useEffect(() => {
    if (!user && profileChannel) {
      supabase.removeChannel(profileChannel)
      profileChannel = null
    }
  }, [user])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      if (data.role === 'banned') {
        await supabase.auth.signOut()
        setBanned(true)
        setLoading(false)
        return
      }
      setUser(data as User)
      // Récupère la privateKey depuis sessionStorage (effacé à la fermeture du tab)
      const pk = sessionStorage.getItem(`r3lay-pk-${userId}`)
      if (pk) setPrivateKey(pk)
    }
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
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
      if (insertError.code === '23505') throw new Error('Ce nom d\'utilisateur est déjà pris.')
      throw new Error(insertError.message)
    }

    // Clé chiffrée dans localStorage (permanente), clé en clair dans sessionStorage (session uniquement)
    localStorage.setItem(`r3lay-pk-${userId}`, JSON.stringify(encrypted))
    sessionStorage.setItem(`r3lay-pk-${userId}`, keyPair.privateKey)
    setPrivateKey(keyPair.privateKey)
  }

  async function login(username: string, password: string) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('username', username)
      .single()

    if (profileError || !profile) throw new Error('Utilisateur introuvable.')
    if (profile.role === 'banned') throw new Error('Ce compte a été banni.')

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

    // Clé en clair dans sessionStorage — effacée à la fermeture du tab
    sessionStorage.setItem(`r3lay-pk-${userId}`, pk)
    setPrivateKey(pk)
  }

  async function signOut() {
    if (user?.id) sessionStorage.removeItem(`r3lay-pk-${user.id}`)
    await supabase.auth.signOut()
    logout()
  }

  return { user, privateKey, isLoading, register, login, signOut }
}
