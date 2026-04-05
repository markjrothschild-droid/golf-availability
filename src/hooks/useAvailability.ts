import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Availability, DayKey } from '../types'

export function useAvailability(userId: string | undefined, weekStart: string) {
  const [mySlots, setMySlots] = useState<Record<string, string[]>>({})
  const [allAvailability, setAllAvailability] = useState<Availability[]>([])
  const [saving, setSaving] = useState(false)

  // Fetch everyone's availability for the week
  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('availability')
      .select('*, profiles(display_name)')
      .eq('week_start', weekStart)
    if (data) setAllAvailability(data)
  }, [weekStart])

  // Fetch my availability
  useEffect(() => {
    if (!userId) return
    async function fetchMine() {
      const { data } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .single()
      if (data) setMySlots(data.slots || {})
      else setMySlots({})
    }
    fetchMine()
    fetchAll()
  }, [userId, weekStart, fetchAll])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability', filter: `week_start=eq.${weekStart}` },
        () => { fetchAll() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [weekStart, fetchAll])

  function toggleSlot(day: DayKey, time: string) {
    setMySlots(prev => {
      const daySlots = prev[day] || []
      const updated = daySlots.includes(time)
        ? daySlots.filter(t => t !== time)
        : [...daySlots, time].sort()
      return { ...prev, [day]: updated }
    })
  }

  async function saveSlots() {
    if (!userId) return
    setSaving(true)
    const { data: existing } = await supabase
      .from('availability')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single()

    if (existing) {
      await supabase
        .from('availability')
        .update({ slots: mySlots, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('availability')
        .insert({ user_id: userId, week_start: weekStart, slots: mySlots })
    }
    await fetchAll()

    // Check for overlap and notify everyone if all 4 are free
    try {
      await supabase.functions.invoke('overlap-notify', {
        body: { week_start: weekStart },
      })
    } catch {
      // Non-critical — don't block the save
    }

    setSaving(false)
  }

  // Calculate overlap: slots where ALL users with availability have marked free
  function getOverlap(): Record<string, string[]> {
    if (allAvailability.length === 0) return {}
    const overlap: Record<string, string[]> = {}
    const days: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

    for (const day of days) {
      const allDaySlots = allAvailability.map(a => a.slots[day] || [])
      if (allDaySlots.length === 0) continue
      overlap[day] = allDaySlots[0].filter(slot =>
        allDaySlots.every(userSlots => userSlots.includes(slot))
      )
    }
    return overlap
  }

  return { mySlots, allAvailability, toggleSlot, saveSlots, saving, getOverlap }
}
