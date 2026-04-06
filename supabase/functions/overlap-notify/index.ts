// Supabase Edge Function: Overlap notification
// Called after a user saves availability. Checks if all 4 users overlap
// and emails everyone if a new overlap is found.
//
// Deploy: supabase functions deploy overlap-notify --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
const TOTAL_USERS = 4

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

const DAY_OFFSETS: Record<string, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
}

function getDateForDay(weekStart: string, day: string): string {
  const date = new Date(weekStart + 'T00:00:00')
  date.setDate(date.getDate() + DAY_OFFSETS[day])
  return date.toISOString().split('T')[0]
}

function buildGolfNowUrl(date: string, slots: string[]): string {
  const sorted = [...slots].sort()
  const startHour = parseInt(sorted[0].split(':')[0])
  const lastSlot = sorted[sorted.length - 1]
  const endHour = parseInt(lastSlot.split(':')[0]) + 1
  return `https://www.golfnow.com/tee-times/search#sortby=Date&zip=48168&date=${date}&timemin=${startHour}&timemax=${endHour}`
}

function formatTime(slot: string): string {
  const [h, m] = slot.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${ampm}`
}

function groupSlots(slots: string[]): string[] {
  if (slots.length === 0) return []
  const sorted = [...slots].sort()
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const prevMin = parseInt(prev.split(':')[0]) * 60 + parseInt(prev.split(':')[1])
    const currMin = parseInt(sorted[i].split(':')[0]) * 60 + parseInt(sorted[i].split(':')[1])
    if (currMin - prevMin === 30) {
      prev = sorted[i]
    } else {
      const endMin = parseInt(prev.split(':')[0]) * 60 + parseInt(prev.split(':')[1]) + 30
      const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`
      ranges.push(`${formatTime(start)} – ${formatTime(endTime)}`)
      start = sorted[i]
      prev = sorted[i]
    }
  }
  const endMin = parseInt(prev.split(':')[0]) * 60 + parseInt(prev.split(':')[1]) + 30
  const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`
  ranges.push(`${formatTime(start)} – ${formatTime(endTime)}`)
  return ranges
}

Deno.serve(async (req) => {
  const { week_start } = await req.json()
  if (!week_start) {
    return new Response(JSON.stringify({ error: 'week_start required' }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get all availability for this week
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('week_start', week_start)

  if (!availability || availability.length < TOTAL_USERS) {
    return new Response(JSON.stringify({ message: `Only ${availability?.length ?? 0} of ${TOTAL_USERS} have submitted` }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Calculate overlap
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const overlap: Record<string, string[]> = {}
  let hasOverlap = false

  for (const day of days) {
    const allDaySlots = availability.map(a => (a.slots as Record<string, string[]>)[day] || [])
    const common = allDaySlots[0].filter(slot => allDaySlots.every(userSlots => userSlots.includes(slot)))
    if (common.length > 0) {
      overlap[day] = common
      hasOverlap = true
    }
  }

  if (!hasOverlap) {
    return new Response(JSON.stringify({ message: 'No overlap found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check if we already notified for this exact overlap
  const { data: existing } = await supabase
    .from('overlap_notifications')
    .select('id, overlap_hash')
    .eq('week_start', week_start)
    .single()

  const overlapHash = JSON.stringify(overlap)
  if (existing?.overlap_hash === overlapHash) {
    return new Response(JSON.stringify({ message: 'Already notified for this overlap' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build the overlap summary for the email with GolfNow links
  const overlapHtml = days
    .filter(d => overlap[d]?.length > 0)
    .map(d => {
      const date = getDateForDay(week_start, d)
      const golfNowUrl = buildGolfNowUrl(date, overlap[d])
      return `<li><strong>${DAY_LABELS[d]}:</strong> ${groupSlots(overlap[d]).join(', ')} — <a href="${golfNowUrl}" style="color: #16a34a; text-decoration: underline;">Search GolfNow</a></li>`
    })
    .join('')

  // Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  if (!profiles) return new Response('No profiles', { status: 200 })

  // Send email to everyone
  const results = []
  for (const user of profiles) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: user.email,
        subject: `⛳ Everyone's free! Lock in a tee time`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #166534;">&#9971; Tee time found!</h2>
            <p>Great news — all 4 of you are free at the same time this week (${week_start}):</p>
            <ul style="line-height: 1.8;">${overlapHtml}</ul>
            <p>Click the GolfNow links above to find available tee times near 48168!</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Golf Availability App</p>
          </div>
        `,
      }),
    })
    results.push({ email: user.email, status: res.status })
  }

  // Record that we notified for this overlap
  if (existing) {
    await supabase
      .from('overlap_notifications')
      .update({ overlap_hash: overlapHash, notified_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('overlap_notifications')
      .insert({ week_start, overlap_hash: overlapHash })
  }

  return new Response(JSON.stringify({ notified: results, overlap }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
