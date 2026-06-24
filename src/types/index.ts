export interface User {
  id: string
  email: string
  username: string
  avatar_url: string | null
  public_key: string
  key_fingerprint: string
  bio: string | null
  role: 'user' | 'moderator' | 'admin' | 'banned'
  created_at: string
}

export interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  avatar_url: string | null
  description: string | null
  created_by: string
  created_at: string
  last_message?: Message | null
  participants?: Participant[]
  unread_count?: number
}

export interface Participant {
  user_id: string
  conversation_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  encrypted_group_key: string | null
  user?: User
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  ciphertext: string
  nonce: string
  created_at: string
  edited_at: string | null
  reply_to_id: string | null
  sender?: User
  reply_to?: Message | null
  decrypted?: string
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export type Theme = 'dark' | 'light' | 'system'
export type AccentColor = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan'
export type FontSize = 'sm' | 'md' | 'lg'
export type BubbleStyle = 'modern' | 'minimal' | 'rounded'
export type MessageDensity = 'compact' | 'comfortable' | 'spacious'
export type BackgroundPattern = 'none' | 'dots' | 'grid' | 'noise'
export type NotificationSound = 'none' | 'subtle' | 'default' | 'chime'

export interface AppSettings {
  theme: Theme
  accentColor: AccentColor
  fontSize: FontSize
  bubbleStyle: BubbleStyle
  messageDensity: MessageDensity
  backgroundPattern: BackgroundPattern
  notificationSound: NotificationSound
  sendOnEnter: boolean
  showTimestamps: boolean
  showReadReceipts: boolean
  compactSidebar: boolean
  blurSensitiveContent: boolean
  language: 'fr' | 'en'
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'violet',
  fontSize: 'md',
  bubbleStyle: 'modern',
  messageDensity: 'comfortable',
  backgroundPattern: 'none',
  notificationSound: 'subtle',
  sendOnEnter: true,
  showTimestamps: true,
  showReadReceipts: true,
  compactSidebar: false,
  blurSensitiveContent: false,
  language: 'fr',
}
