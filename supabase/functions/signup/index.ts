import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, roster_id, device_token } = await req.json()

    if (!session_id || !roster_id) {
      return new Response(
        JSON.stringify({ message: 'session_id and roster_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: session, error: sessionErr } = await supabase
      .from('session')
      .select('id, status, max_spots, waitlist_size')
      .eq('id', session_id)
      .single()

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ message: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!['open', 'removal_locked'].includes(session.status)) {
      return new Response(
        JSON.stringify({ message: 'Session is not accepting sign-ups' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { count: dupeCount } = await supabase
      .from('signup')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('roster_id', roster_id)
      .eq('is_guest', false)

    if ((dupeCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({ message: 'Already signed up for this session' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { count: confirmedCount } = await supabase
      .from('signup')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('on_waitlist', false)

    const onWaitlist = (confirmedCount ?? 0) >= session.max_spots

    if (onWaitlist && session.waitlist_size !== null) {
      const { count: waitlistCount } = await supabase
        .from('signup')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session_id)
        .eq('on_waitlist', true)

      if ((waitlistCount ?? 0) >= session.waitlist_size) {
        return new Response(
          JSON.stringify({ message: 'Waitlist is full' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    const { data: rosterMember } = await supabase
      .from('roster')
      .select('display_name')
      .eq('id', roster_id)
      .single()

    if (!rosterMember) {
      return new Response(
        JSON.stringify({ message: 'Roster member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: newSignup, error: insertErr } = await supabase
      .from('signup')
      .insert({
        session_id,
        roster_id,
        display_name: rosterMember.display_name,
        on_waitlist: onWaitlist,
        device_token: device_token ?? null,
        status: 'confirmed',
        is_guest: false,
      })
      .select()
      .single()

    if (insertErr || !newSignup) {
      throw insertErr ?? new Error('Insert failed')
    }

    const { count: positionCount } = await supabase
      .from('signup')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('on_waitlist', onWaitlist)
      .lte('created_at', newSignup.created_at)

    return new Response(
      JSON.stringify({
        signup: newSignup,
        on_waitlist: onWaitlist,
        position: positionCount ?? 1,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
