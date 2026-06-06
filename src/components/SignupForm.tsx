import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { signUp, withdraw } from '@/lib/queries'
import type { Session, RosterMember, Signup } from '@/lib/types'

interface SignupFormProps {
  session: Session
  roster: RosterMember[]
  signups: Signup[]
  deviceToken: string
  onSignupComplete: () => void
}

const STORAGE_KEY_PREFIX = 'whosin_signup_'

export function SignupForm({
  session,
  roster,
  signups,
  deviceToken,
  onSignupComplete,
}: SignupFormProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${session.id}`
  const savedRosterId = localStorage.getItem(storageKey)

  const mySignup = signups.find(
    s => s.roster_id === savedRosterId && !s.is_guest,
  )

  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const isLocked = session.status !== 'open'
  const isAccepting = session.status === 'open' || session.status === 'removal_locked'

  const available = roster.filter(
    m => !signups.some(s => s.roster_id === m.id && !s.is_guest),
  )

  async function handleSignup() {
    if (!selectedId) return
    setLoading(true)
    try {
      await signUp({ session_id: session.id, roster_id: selectedId, device_token: deviceToken })
      localStorage.setItem(storageKey, selectedId)
      setSelectedId('')
      onSignupComplete()
      toast.success("You're in!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw() {
    if (!mySignup?.roster_id) return
    setLoading(true)
    try {
      await withdraw({
        session_id: session.id,
        roster_id: mySignup.roster_id,
        device_token: deviceToken,
      })
      localStorage.removeItem(storageKey)
      onSignupComplete()
      toast.success("You've been removed.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdraw failed')
    } finally {
      setLoading(false)
    }
  }

  if (mySignup) {
    return (
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Signed up as {mySignup.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {mySignup.on_waitlist ? 'On waitlist' : 'Confirmed'}
          </p>
        </div>
        {!isLocked && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWithdraw}
            disabled={loading}
          >
            Withdraw
          </Button>
        )}
      </div>
    )
  }

  if (!isAccepting) {
    return (
      <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
        Sign-ups are closed for this session.
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Select value={selectedId} onValueChange={setSelectedId} disabled={loading}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select your name…" />
        </SelectTrigger>
        <SelectContent>
          {available.map(m => (
            <SelectItem key={m.id} value={m.id}>
              {m.display_name}
            </SelectItem>
          ))}
          {available.length === 0 && (
            <SelectItem value="__none" disabled>
              Everyone is signed up
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <Button onClick={handleSignup} disabled={!selectedId || loading}>
        {loading ? 'Signing up…' : "I'm in"}
      </Button>
    </div>
  )
}
