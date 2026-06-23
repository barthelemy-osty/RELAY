import { useSettingsStore, ACCENT_COLORS } from '../store/settingsStore'
import { useAdmin } from '../hooks/useAdmin'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar } from '../components/ui/Avatar'
import { useAuthStore } from '../store/authStore'
import { useState, useEffect } from 'react'
import type { AccentColor, Theme, FontSize, BubbleStyle, MessageDensity, NotificationSound } from '../types'

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/6 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none ${value ? 'bg-accent' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-[18px]' : 'translate-x-0'}`} />
    </button>
  )
}

function ChipSelect<T extends string>({ options, value, onChange, labels }: {
  options: T[]
  value: T
  onChange: (v: T) => void
  labels?: Record<T, string>
}) {
  return (
    <div className="flex gap-1 flex-wrap justify-end">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${value === opt ? 'bg-accent text-white' : 'bg-white/8 text-gray-400 hover:text-white hover:bg-white/12'}`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

export function Settings() {
  const { settings, updateSetting, resetSettings } = useSettingsStore()
  const { user } = useAuthStore()
  const { signOut } = useAuth()
  const { isAppAdmin, bannedUsers, fetchBannedUsers, banUser, unbanUser, searchUsers } = useAdmin()
  const [adminSearch, setAdminSearch] = useState('')
  const [adminResults, setAdminResults] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState<'appearance' | 'notifications' | 'security' | 'account' | 'admin'>('appearance')

  useEffect(() => {
    if (isAppAdmin) fetchBannedUsers()
  }, [isAppAdmin])

  async function handleAdminSearch(q: string) {
    setAdminSearch(q)
    if (q.length < 2) { setAdminResults([]); return }
    const results = await searchUsers(q)
    setAdminResults(results)
  }

  const sections = [
    { id: 'appearance', label: 'Apparence', icon: '🎨' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Sécurité', icon: '🔒' },
    { id: 'account', label: 'Compte', icon: '👤' },
    ...(isAppAdmin ? [{ id: 'admin', label: 'Administration', icon: '🛡️' }] : []),
  ] as const

  return (
    <div className="flex h-full bg-gray-950">
      {/* Sidebar */}
      <nav className="w-52 border-r border-white/6 p-3 flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">Paramètres</p>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as typeof activeSection)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left ${activeSection === s.id ? 'bg-accent/15 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
        <div className="mt-auto pt-3 border-t border-white/6">
          <Button variant="danger" size="sm" className="w-full" onClick={signOut}>
            Déconnexion
          </Button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── APPEARANCE ── */}
        {activeSection === 'appearance' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white mb-4">Apparence</h2>

            <div className="bg-white/4 rounded-2xl px-4 divide-y divide-white/6">
              <SettingRow label="Thème" description="Couleur de fond globale">
                <ChipSelect<Theme>
                  options={['dark', 'light', 'system']}
                  value={settings.theme}
                  onChange={v => updateSetting('theme', v)}
                  labels={{ dark: 'Sombre', light: 'Clair', system: 'Système' }}
                />
              </SettingRow>

              <SettingRow label="Couleur d'accentuation">
                <div className="flex gap-1.5">
                  {Object.entries(ACCENT_COLORS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => updateSetting('accentColor', key as AccentColor)}
                      className={`w-6 h-6 rounded-full transition-all ${settings.accentColor === key ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: val.primary }}
                      title={key}
                    />
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Taille du texte">
                <ChipSelect<FontSize>
                  options={['sm', 'md', 'lg']}
                  value={settings.fontSize}
                  onChange={v => updateSetting('fontSize', v)}
                  labels={{ sm: 'Petit', md: 'Moyen', lg: 'Grand' }}
                />
              </SettingRow>

              <SettingRow label="Style des bulles">
                <ChipSelect<BubbleStyle>
                  options={['modern', 'minimal', 'rounded']}
                  value={settings.bubbleStyle}
                  onChange={v => updateSetting('bubbleStyle', v)}
                  labels={{ modern: 'Moderne', minimal: 'Minimal', rounded: 'Arrondi' }}
                />
              </SettingRow>

              <SettingRow label="Densité des messages">
                <ChipSelect<MessageDensity>
                  options={['compact', 'comfortable', 'spacious']}
                  value={settings.messageDensity}
                  onChange={v => updateSetting('messageDensity', v)}
                  labels={{ compact: 'Compact', comfortable: 'Normal', spacious: 'Aéré' }}
                />
              </SettingRow>

              <SettingRow label="Barre latérale compacte">
                <Toggle value={settings.compactSidebar} onChange={v => updateSetting('compactSidebar', v)} />
              </SettingRow>

              <SettingRow label="Afficher les horodatages">
                <Toggle value={settings.showTimestamps} onChange={v => updateSetting('showTimestamps', v)} />
              </SettingRow>
            </div>

            <Button variant="ghost" size="sm" className="mt-4 text-gray-500" onClick={resetSettings}>
              Réinitialiser les paramètres
            </Button>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeSection === 'notifications' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white mb-4">Notifications</h2>
            <div className="bg-white/4 rounded-2xl px-4 divide-y divide-white/6">
              <SettingRow label="Son de notification">
                <ChipSelect<NotificationSound>
                  options={['none', 'subtle', 'default', 'chime']}
                  value={settings.notificationSound}
                  onChange={v => updateSetting('notificationSound', v)}
                  labels={{ none: 'Aucun', subtle: 'Discret', default: 'Défaut', chime: 'Carillon' }}
                />
              </SettingRow>
              <SettingRow label="Accusés de lecture">
                <Toggle value={settings.showReadReceipts} onChange={v => updateSetting('showReadReceipts', v)} />
              </SettingRow>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {activeSection === 'security' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white mb-4">Sécurité & confidentialité</h2>
            <div className="bg-white/4 rounded-2xl px-4 divide-y divide-white/6">
              <SettingRow label="Envoyer avec Entrée" description="Sinon, utilisez Shift+Entrée">
                <Toggle value={settings.sendOnEnter} onChange={v => updateSetting('sendOnEnter', v)} />
              </SettingRow>
              <SettingRow label="Flouter le contenu sensible">
                <Toggle value={settings.blurSensitiveContent} onChange={v => updateSetting('blurSensitiveContent', v)} />
              </SettingRow>
              <SettingRow label="Empreinte de clé publique" description="Vérifiez votre identité cryptographique">
                <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
                  {user && 'key_fingerprint' in user ? (user as any).key_fingerprint : '—'}
                </span>
              </SettingRow>
            </div>
            <div className="mt-4 p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
              <p className="text-xs text-emerald-400 leading-relaxed">
                🔒 Tous vos messages sont chiffrés de bout en bout avec libsodium (X25519 + XSalsa20-Poly1305).
                Votre clé privée ne quitte jamais votre appareil. r3lay ne peut pas lire vos conversations.
              </p>
            </div>
          </div>
        )}

        {/* ── ACCOUNT ── */}
        {activeSection === 'account' && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white mb-4">Mon compte</h2>
            <div className="flex items-center gap-4 p-4 bg-white/4 rounded-2xl mb-4">
              <Avatar name={user?.username} src={user?.avatar_url} size="lg" />
              <div>
                <p className="font-semibold text-white">{user?.username}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="bg-white/4 rounded-2xl px-4 divide-y divide-white/6">
              <SettingRow label="Langue de l'interface">
                <ChipSelect
                  options={['fr', 'en'] as const}
                  value={settings.language}
                  onChange={v => updateSetting('language', v)}
                  labels={{ fr: 'Français', en: 'English' }}
                />
              </SettingRow>
            </div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {activeSection === 'admin' && isAppAdmin && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-white mb-1">Administration</h2>
            <p className="text-sm text-gray-500 mb-4">Gestion globale des utilisateurs de r3lay</p>

            {/* Search & ban */}
            <div className="bg-white/4 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rechercher un utilisateur</p>
              <Input
                placeholder="Nom d'utilisateur ou email..."
                value={adminSearch}
                onChange={e => handleAdminSearch(e.target.value)}
              />
              {adminResults.length > 0 && (
                <div className="mt-3 space-y-1">
                  {adminResults.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                      <Avatar name={u.username} src={u.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{u.username}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      {u.is_banned ? (
                        <Button variant="outline" size="sm" onClick={() => unbanUser(u.id)}>
                          Débannir
                        </Button>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => banUser(u.id, 'Banni par l\'admin')}>
                          Bannir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Banned users list */}
            <div className="bg-white/4 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Utilisateurs bannis · {bannedUsers.length}
              </p>
              {bannedUsers.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">Aucun utilisateur banni</p>
              ) : (
                <div className="space-y-2">
                  {bannedUsers.map(b => (
                    <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl bg-rose-500/5 border border-rose-500/15">
                      <Avatar name={b.user?.username} src={b.user?.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{b.user?.username}</p>
                        {b.reason && <p className="text-xs text-gray-500">{b.reason}</p>}
                        <p className="text-[10px] text-gray-700">
                          {new Date(b.banned_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => unbanUser(b.banned_user_id)}>
                        Débannir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
