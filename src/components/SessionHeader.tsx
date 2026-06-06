import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Session } from '@/lib/types'

interface SessionHeaderProps {
  session: Session
  confirmedCount: number
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatCutoff(cutoffAt: string): string {
  return new Date(cutoffAt).toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  open:            { label: 'Open',   variant: 'default' },
  removal_locked:  { label: 'Locked', variant: 'secondary' },
  done:            { label: 'Done',   variant: 'outline' },
  draft:           { label: 'Draft',  variant: 'outline' },
  cancelled:       { label: 'Cancelled', variant: 'destructive' },
}

export function SessionHeader({ session, confirmedCount }: SessionHeaderProps) {
  const spotsLeft = session.max_spots - confirmedCount
  const isFull = spotsLeft <= 0
  const { label, variant } = statusConfig[session.status] ?? { label: session.status, variant: 'outline' }

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold leading-tight">{formatDate(session.date)}</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(session.start_time)} – {formatTime(session.end_time)} · {session.location}
            </p>
          </div>
          <Badge variant={variant}>{label}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {isFull ? (
            <span className="font-medium text-destructive">Full</span>
          ) : (
            <span className="font-medium">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
          )}
          <span className="text-muted-foreground">of {session.max_spots}</span>
        </div>

        {session.status === 'open' && (
          <p className="text-xs text-muted-foreground">
            Sign-ups lock {formatCutoff(session.cutoff_at)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
