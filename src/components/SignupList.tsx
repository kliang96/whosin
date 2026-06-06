import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { SignupWithPosition } from '@/lib/types'

interface SignupListProps {
  signups: SignupWithPosition[]
  maxSpots: number
  deviceToken: string | null
}

interface SignupRowProps {
  position: number
  name: string
  isYou: boolean
  isTentative: boolean
}

function SignupRow({ position, name, isYou, isTentative }: SignupRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 text-right text-sm font-semibold tabular-nums text-muted-foreground">
        {position}
      </span>
      <span className={`flex-1 text-sm ${isTentative ? 'text-muted-foreground' : ''}`}>
        {name}
        {isTentative && <span className="ml-1 text-xs">(hopefully)</span>}
      </span>
      {isYou && (
        <Badge variant="secondary" className="text-xs">You</Badge>
      )}
    </div>
  )
}

function EmptyRow({ position }: { position: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 text-right text-sm font-semibold tabular-nums text-muted-foreground">
        {position}
      </span>
      <span className="flex-1 text-sm text-muted-foreground">—</span>
    </div>
  )
}

export function SignupList({ signups, maxSpots, deviceToken }: SignupListProps) {
  const confirmed = signups.filter(s => !s.on_waitlist && !s.is_guest)
  const waitlist  = signups.filter(s => s.on_waitlist  && !s.is_guest)

  const emptySlots = Math.max(0, maxSpots - confirmed.length)

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Players ({confirmed.length}/{maxSpots})
      </p>

      <div className="divide-y">
        {confirmed.map(s => (
          <SignupRow
            key={s.id}
            position={s.position}
            name={s.display_name}
            isYou={!!deviceToken && s.device_token === deviceToken}
            isTentative={s.status === 'tentative'}
          />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <EmptyRow key={`empty-${i}`} position={confirmed.length + i + 1} />
        ))}
      </div>

      {waitlist.length > 0 && (
        <>
          <Separator className="my-3" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Waitlist
          </p>
          <div className="divide-y">
            {waitlist.map(s => (
              <SignupRow
                key={s.id}
                position={s.position}
                name={s.display_name}
                isYou={!!deviceToken && s.device_token === deviceToken}
                isTentative={s.status === 'tentative'}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
