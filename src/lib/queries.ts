import { supabase } from '@/lib/supabase'
import type {
  Session,
  RosterMember,
  Signup,
  SignupRequest,
  SignupResponse,
  WithdrawRequest,
  WithdrawResponse,
} from '@/lib/types'

export async function getSession(slug: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('session')
    .select('*')
    .eq('public_slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Session
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from('session')
    .select('*')
    .in('status', ['open', 'removal_locked'])
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as Session | null
}

export async function getSignups(sessionId: string): Promise<Signup[]> {
  const { data, error } = await supabase
    .from('signup')
    .select('*')
    .eq('session_id', sessionId)
    .order('on_waitlist', { ascending: true })
    .order('pinned_position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Signup[]
}

export async function getRoster(): Promise<RosterMember[]> {
  const { data, error } = await supabase
    .from('roster')
    .select('*')
    .eq('active', true)
    .order('sort_hint', { ascending: true, nullsFirst: false })
    .order('display_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as RosterMember[]
}

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function callEdge<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${EDGE_BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export async function signUp(payload: SignupRequest): Promise<SignupResponse> {
  return callEdge<SignupResponse>('signup', payload)
}

export async function withdraw(payload: WithdrawRequest): Promise<WithdrawResponse> {
  return callEdge<WithdrawResponse>('withdraw', payload)
}
