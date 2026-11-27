export const ADVENT_DAYS = 24

export type AdventType = 'poem' | 'link' | 'image' | 'audio' | 'challenge' | 'riddle' | 'coupon' | 'joke' | 'fact' | 'quote'
export type AdventEntry =
  | { type: 'poem' | 'link' | 'image' | 'audio' | 'challenge' | 'fact'; content: string }
  | { type: 'riddle'; content: string; answer: string | null }
  | { type: 'joke'; content: string; punchline: string | null }
  | { type: 'coupon'; content: string; image: string | null }
  | { type: 'quote'; content: string; author: string | null }
export type AdventContent = Record<number, AdventEntry>

type AdventEntryWithUnlockDate = AdventEntry & { unlockDate?: string }

export function nextUnopenedDay(opened: ReadonlySet<number>): number | null {
  for (let day = 1; day <= ADVENT_DAYS; day++) {
    if (!opened.has(day)) return day
  }
  return null
}

function parseDateOnly(value: unknown): { year: number; month: number; day: number } | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return { year, month, day }
}

export function isAdventDayAvailable(day: number, now: Date = new Date(), unlockDate?: unknown): boolean {
  if (!Number.isInteger(day) || day < 1 || day > ADVENT_DAYS) return false
  const configured = parseDateOnly(unlockDate)
  const target = configured ?? { year: now.getFullYear(), month: 12, day }
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  if (today.year !== target.year) return today.year > target.year
  if (today.month !== target.month) return today.month > target.month
  return today.day >= target.day
}

export const isDayAvailable = isAdventDayAvailable

export function isValidDayOrder(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === ADVENT_DAYS
    && value.every((day) => Number.isInteger(day) && day >= 1 && day <= ADVENT_DAYS)
    && new Set(value).size === ADVENT_DAYS
}

export function shuffleDays(random: () => number = Math.random): number[] {
  const days = Array.from({ length: ADVENT_DAYS }, (_, index) => index + 1)
  for (let index = days.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[days[index], days[other]] = [days[other], days[index]]
  }
  if (days.every((day, index) => day === index + 1)) {
    ;[days[0], days[1]] = [days[1], days[0]]
  }
  return days
}

const TYPES: Record<string, AdventType> = {
  poem: 'poem',
  link: 'link',
  image: 'image',
  online_image: 'image',
  audio: 'audio',
  challenge: 'challenge',
  riddle: 'riddle',
  coupon: 'coupon',
  joke: 'joke',
  fact: 'fact',
  quote: 'quote',
}

function addEntries(target: AdventContent, source: unknown) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return
  for (const [key, value] of Object.entries(source)) {
    const day = Number(key)
    if (!Number.isInteger(day) || day < 1 || day > ADVENT_DAYS) continue
    if (!value || typeof value !== 'object') continue
    const { type, content, answer, image, punchline, author, unlockDate, date } = value as Record<string, unknown>
    const configuredDate = typeof unlockDate === 'string'
      ? unlockDate
      : typeof date === 'string'
        ? date
        : null
    const normalized = typeof type === 'string' ? TYPES[type.trim().toLowerCase()] : undefined
    if (normalized && typeof content === 'string' && content.trim()) {
      let entry: AdventEntry
      if (normalized === 'riddle') {
        entry = { type: normalized, content, answer: typeof answer === 'string' && answer.trim() ? answer : null }
      } else if (normalized === 'joke') {
        entry = { type: normalized, content, punchline: typeof punchline === 'string' && punchline.trim() ? punchline : null }
      } else if (normalized === 'coupon') {
        entry = { type: normalized, content, image: typeof image === 'string' && image.trim() ? image : null }
      } else if (normalized === 'quote') {
        entry = { type: normalized, content, author: typeof author === 'string' && author.trim() ? author : null }
      } else {
        entry = { type: normalized, content }
      }
      if (configuredDate && parseDateOnly(configuredDate)) {
        ;(entry as AdventEntryWithUnlockDate).unlockDate = configuredDate.trim()
      }
      target[day] = entry
    }
  }
}

// Accepts `{ "days": [{ "1": {...}, "2": {...} }] }` or `{ "days": { "1": {...} } }`.
export function parseAdventContent(json: unknown): AdventContent {
  const result: AdventContent = {}
  const days = json && typeof json === 'object' ? (json as { days?: unknown }).days : undefined
  if (Array.isArray(days)) days.forEach((group) => addEntries(result, group))
  else addEntries(result, days)
  return result
}

// Allows absolute HTTP(S) URLs and same-site root paths such as `/images/gift.jpg`.
export function safeMediaUrl(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) return trimmed
  try {
    const url = new URL(trimmed)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function safeLocalMediaUrl(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')
    ? trimmed : null
}
