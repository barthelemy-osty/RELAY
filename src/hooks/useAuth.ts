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

  async function register(email: string, password: string, username: string) {
    try {
      console.log('1. import crypto...')
      const { generateKeyPair, fingerprintKey, encryptPrivateKey } = await import('../lib/crypto')
      console.log('2. generateKeyPair...')
      const keyPair = await generateKeyPair()
      console.log('3. fingerprintKey...', keyPair)
      const fingerprint = await fingerprintKey(keyPair.publicKey)
      console.log('4. encryptPrivateKey...')
      const encrypted = await encryptPrivateKey(keyPair.privateKey, password)
      console.log('5. supabase signUp...')
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      const userId = data.user!.id
      console.log('6. insert user...')
      await supabase.from('users').insert({
        id: userId,
        email,
        username,
        public_key: keyPair.publicKey,
        key_fingerprint: fingerprint,
      })
      localStorage.setItem(`r3lay-pk-${userId}`, JSON.stringify(encrypted))
      setPrivateKey(keyPair.privateKey)
      console.log('7. done!')
    } catch (err) {
      console.error('REGISTER ERROR:', err)
      throw err
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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
