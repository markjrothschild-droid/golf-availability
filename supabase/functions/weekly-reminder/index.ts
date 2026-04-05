// Supabase Edge Function: Weekly email reminder
// Sends a nudge to anyone who hasn't updated availability for the current week.
//
// Deploy: supabase functions deploy weekly-reminder --no-verify-jwt
// Trigger: Set up a Supabase Cron Job (pg_cron) or call via HTTP

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get current week's Monday
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  const weekStart = monday.toISOString().split('T')[0]

  // Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  if (!profiles) return new Response('No profiles found', { status: 200 })

  // Get who has already updated this week
  const { data: availability } = await supabase
    .from('availability')
    .select('user_id')
    .eq('week_start', weekStart)

  const updatedUserIds = new Set((availability || []).map(a => a.user_id))

  // Find who hasn't updated
  const needsReminder = profiles.filter(p => !updatedUserIds.has(p.id))

  if (needsReminder.length === 0) {
    return new Response(JSON.stringify({ message: 'Everyone has updated!' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Send emails via Resend
  const results = []
  for (const user of needsReminder) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: user.email,
        subject: `Golf this week? Mark your availability!`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #166534;">&#9971; Hey ${user.display_name}!</h2>
            <p>You haven't marked your golf availability for this week yet (${weekStart}).</p>
            <p>The crew is waiting on you! Jump in and mark when you're free so we can find a time that works for everyone.</p>
            <p style="margin-top: 24px;">
              <a href="${SUPABASE_URL.replace('.supabase.co', '.vercel.app') || 'https://your-app-url.com'}"
                 style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Mark My Availability
              </a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
              Golf Availability App
            </p>
          </div>
        `,
      }),
    })
    results.push({ email: user.email, status: res.status })
  }

  return new Response(JSON.stringify({ reminded: results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
