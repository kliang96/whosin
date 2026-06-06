import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { SessionHeader } from '@/components/SessionHeader'
import { SignupList } from '@/components/SignupList'
import { SignupForm } from '@/components/SignupForm'
import { supabase } from '@/lib/supabase'
import { getSession, getCurrentSession, getSignups, getRoster } from '@/lib/queries'
import type { Session, Signup, RosterMember, SignupWithPosition } from '@/lib/types'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function SessionSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function SessionPage() {
  const { slug } = useParams<{ slug?: string }>()

  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [signups, setSignups] = useState<Signup[]>([])
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const deviceToken = useMemo(() => {
    const key = 'whosin_device_token'
    let token = localStorage.getItem(key)
    if (!token) {
      token = generateUUID()
      localStorage.setItem(key, token)
    }
    return token
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const s = slug ? await getSession(slug) : await getCurrentSession()
        setSession(s)
        if (s) {
          const [sups, ros] = await Promise.all([getSignups(s.id), getRoster()])
          setSignups(sups)
          setRoster(ros)
        }
      } catch (e) {
        setError('Failed to load session.')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [slug])

  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel(`session:${session.id}:signups`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signup',
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          void getSignups(session.id).then(setSignups)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session])

  if (loading) return <SessionSkeleton />

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-4">
        <p className="text-lg font-semibold">No active session</p>
        <p className="text-sm text-muted-foreground">Check back closer to Friday.</p>
      </div>
    )
  }

  const confirmed = signups.filter(s => !s.on_waitlist && !s.is_guest)
  const waitlist  = signups.filter(s => s.on_waitlist  && !s.is_guest)

  const confirmedWithPos: SignupWithPosition[] = confirmed.map((s, i) => ({ ...s, position: i + 1 }))
  const waitlistWithPos:  SignupWithPosition[] = waitlist.map((s, i)  => ({ ...s, position: i + 1 }))

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <SessionHeader session={session} confirmedCount={confirmed.length} />
      <SignupForm
        session={session}
        roster={roster}
        signups={signups}
        deviceToken={deviceToken}
        onSignupComplete={() => void getSignups(session.id).then(setSignups)}
      />
      <SignupList
        signups={[...confirmedWithPos, ...waitlistWithPos]}
        maxSpots={session.max_spots}
        deviceToken={deviceToken}
      />
    </div>
  )
}
