import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, roster_id } = await req.json()

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
      .select('id, status')
      .eq('id', session_id)
      .single()

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ message: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (session.status !== 'open') {
      return new Response(
        JSON.stringify({ message: 'Withdrawals are locked for this session' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: existing, error: findErr } = await supabase
      .from('signup')
      .select('id, on_waitlist')
      .eq('session_id', session_id)
      .eq('roster_id', roster_id)
      .eq('is_guest', false)
      .single()

    if (findErr || !existing) {
      return new Response(
        JSON.stringify({ message: 'Signup not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { error: deleteErr } = await supabase
      .from('signup')
      .delete()
      .eq('id', existing.id)

    if (deleteErr) throw deleteErr

    let promotedId: string | null = null

    if (!existing.on_waitlist) {
      const { data: topWaitlister } = await supabase
        .from('signup')
        .select('id')
        .eq('session_id', session_id)
        .eq('on_waitlist', true)
        .order('pinned_position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (topWaitlister) {
        await supabase
          .from('signup')
          .update({ on_waitlist: false })
          .eq('id', topWaitlister.id)

        promotedId = topWaitlister.id
      }
    }

    return new Response(
      JSON.stringify({ removed_id: existing.id, promoted_id: promotedId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
