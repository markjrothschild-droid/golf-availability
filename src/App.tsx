import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAvailability } from './hooks/useAvailability'
import { getCurrentWeekStart, getWeekStarts, formatWeekLabel, getDayDates } from './lib/weeks'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import WeeklyCalendar from './components/WeeklyCalendar'
import OverlapSummary from './components/OverlapSummary'
import type { Profile } from './types'

export default function App() {
  const { user, profile, loading, signIn, signOut } = useAuth()
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { mySlots, allAvailability, toggleSlot, saveSlots, saving, getOverlap } = useAvailability(user?.id, weekStart)

  const weeks = getWeekStarts(4)

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase.from('profiles').select('*')
      if (data) setProfiles(data)
    }
    fetchProfiles()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-green-600 text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Login onLogin={signIn} />
  }

  const overlap = getOverlap()

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#9971;</span>
            <h1 className="text-lg font-bold text-green-800">Golf Availability</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{profile.display_name}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Week Selector */}
        <div className="flex items-center gap-3">
          {weeks.map(w => (
            <button
              key={w.value}
              onClick={() => setWeekStart(w.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                weekStart === w.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {w.label}
            </button>
          ))}
          <span className="text-sm text-gray-500 ml-2">{formatWeekLabel(weekStart)}</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-200 border border-green-300"></div>
            <span>You're free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-400 border border-green-500 ring-2 ring-green-300"></div>
            <span>Everyone free</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <WeeklyCalendar mySlots={mySlots} overlap={overlap} dayDates={getDayDates(weekStart)} onToggle={toggleSlot} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveSlots}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : 'Save My Availability'}
            </button>
          </div>
        </div>

        {/* Overlap Summary */}
        <OverlapSummary overlap={overlap} allAvailability={allAvailability} profiles={profiles} />
      </main>
    </div>
  )
}
