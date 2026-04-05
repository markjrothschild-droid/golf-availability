export interface Profile {
  id: string
  email: string
  display_name: string
}

export interface Availability {
  id: string
  user_id: string
  week_start: string // ISO date string for Monday of the week
  slots: Record<string, string[]> // { "mon": ["06:00", "06:30"], "tue": ["08:00"] }
  updated_at: string
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

// Golf-friendly hours: 6 AM to 7 PM in 30-min slots
export const TIME_SLOTS: string[] = []
for (let h = 6; h < 19; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`)
}

export function formatTime(slot: string): string {
  const [h, m] = slot.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${ampm}`
}
