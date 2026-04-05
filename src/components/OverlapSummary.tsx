import { DAYS, formatTime } from '../types'
import type { Availability, Profile } from '../types'

interface OverlapSummaryProps {
  overlap: Record<string, string[]>
  allAvailability: Availability[]
  profiles: Profile[]
}

export default function OverlapSummary({ overlap, allAvailability, profiles }: OverlapSummaryProps) {
  const hasOverlap = Object.values(overlap).some(slots => slots.length > 0)
  const updatedUserIds = allAvailability.map(a => a.user_id)
  const missingUsers = profiles.filter(p => !updatedUserIds.includes(p.id))

  // Group consecutive slots into ranges
  function groupSlots(slots: string[]): string[] {
    if (slots.length === 0) return []
    const sorted = [...slots].sort()
    const ranges: string[] = []
    let start = sorted[0]
    let prev = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
      const prevH = parseInt(prev.split(':')[0])
      const prevM = parseInt(prev.split(':')[1])
      const currH = parseInt(sorted[i].split(':')[0])
      const currM = parseInt(sorted[i].split(':')[1])
      const prevMin = prevH * 60 + prevM
      const currMin = currH * 60 + currM

      if (currMin - prevMin === 30) {
        prev = sorted[i]
      } else {
        const endH = prevH + (prevM === 30 ? 1 : 0)
        const endM = prevM === 30 ? 0 : 30
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
        ranges.push(`${formatTime(start)} - ${formatTime(endTime)}`)
        start = sorted[i]
        prev = sorted[i]
      }
    }
    // Close last range
    const lastH = parseInt(prev.split(':')[0])
    const lastM = parseInt(prev.split(':')[1])
    const endH = lastH + (lastM === 30 ? 1 : 0)
    const endM = lastM === 30 ? 0 : 30
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
    ranges.push(`${formatTime(start)} - ${formatTime(endTime)}`)
    return ranges
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <h3 className="font-semibold text-green-800 mb-3">
        {hasOverlap ? '\u26F3 Everyone Can Play' : 'Overlap Summary'}
      </h3>

      {hasOverlap ? (
        <div className="space-y-2">
          {DAYS.filter(d => (overlap[d.key] || []).length > 0).map(d => (
            <div key={d.key} className="flex gap-2">
              <span className="font-medium text-gray-700 w-10">{d.label}</span>
              <div className="flex flex-wrap gap-1">
                {groupSlots(overlap[d.key]).map(range => (
                  <span key={range} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-sm">
                    {range}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          {allAvailability.length === 0
            ? 'No one has marked availability yet this week.'
            : 'No overlapping times found yet. Waiting on more updates.'}
        </p>
      )}

      {missingUsers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-amber-600">
            Still waiting on: {missingUsers.map(u => u.display_name).join(', ')}
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {allAvailability.length} of {profiles.length} updated this week
        </p>
      </div>
    </div>
  )
}
