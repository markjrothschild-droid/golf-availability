import { startOfWeek, addWeeks, addDays, format } from 'date-fns'

export function getCurrentWeekStart(): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}

export function getWeekStarts(count: number): { value: string; label: string }[] {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const labels = ['This Week', 'Next Week', 'In 2 Weeks', 'In 3 Weeks']
  return Array.from({ length: count }, (_, i) => ({
    value: format(addWeeks(monday, i), 'yyyy-MM-dd'),
    label: labels[i] || `Week ${i + 1}`,
  }))
}

export function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00')
  const end = new Date(date)
  end.setDate(end.getDate() + 6)
  return `${format(date, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

export function getDayDates(weekStart: string): string[] {
  const monday = new Date(weekStart + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'd'))
}
