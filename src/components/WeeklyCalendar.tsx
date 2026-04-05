import { DAYS, TIME_SLOTS, formatTime } from '../types'
import type { DayKey } from '../types'

interface WeeklyCalendarProps {
  mySlots: Record<string, string[]>
  overlap: Record<string, string[]>
  dayDates: string[]
  onToggle: (day: DayKey, time: string) => void
}

export default function WeeklyCalendar({ mySlots, overlap, dayDates, onToggle }: WeeklyCalendarProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr>
            <th className="p-1 sm:p-2 text-right text-gray-500 w-16 sm:w-20"></th>
            {DAYS.map((d, i) => (
              <th key={d.key} className="p-1 sm:p-2 text-center">
                <div className="text-gray-400 text-xs">{dayDates[i]}</div>
                <div className="font-semibold text-gray-700">{d.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map(time => (
            <tr key={time}>
              <td className="p-1 sm:p-2 text-right text-gray-400 text-xs whitespace-nowrap">
                {time.endsWith(':00') ? formatTime(time) : ''}
              </td>
              {DAYS.map(d => {
                const isSelected = (mySlots[d.key] || []).includes(time)
                const isOverlap = (overlap[d.key] || []).includes(time)
                return (
                  <td key={d.key} className="p-0.5">
                    <button
                      onClick={() => onToggle(d.key, time)}
                      className={`w-full h-6 sm:h-7 rounded transition-all border ${
                        isOverlap
                          ? 'bg-green-400 border-green-500 ring-2 ring-green-300'
                          : isSelected
                            ? 'bg-blue-200 border-blue-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      title={`${d.label} ${formatTime(time)}${isOverlap ? ' - Everyone free!' : isSelected ? ' - You\'re free' : ''}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
