export type SessionStatus = 'draft' | 'open' | 'removal_locked' | 'done' | 'cancelled'

export type SignupStatus = 'confirmed' | 'tentative'

export type ActivityType =
  | 'add'
  | 'remove'
  | 'promote'
  | 'guest_add'
  | 'guest_remove'
  | 'tentative'
  | 'config'
  | 'attendance'

export interface Session {
  id: string
  date: string
  start_time: string
  end_time: string
  location: string
  max_spots: number
  waitlist_size: number | null
  cutoff_at: string
  status: SessionStatus
  public_slug: string
  created_at: string
}

export interface RosterMember {
  id: string
  display_name: string
  sort_hint: number | null
  active: boolean
  created_at: string
}

export interface Signup {
  id: string
  session_id: string
  roster_id: string | null
  display_name: string
  status: SignupStatus
  is_guest: boolean
  host_signup_id: string | null
  guest_index: number | null
  guest_name: string | null
  on_waitlist: boolean
  pinned_position: number | null
  device_token: string | null
  attended: boolean
  attended_at: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  session_id: string
  type: ActivityType
  actor: string | null
  summary: string
  created_at: string
}

export interface SignupWithPosition extends Signup {
  position: number
}

export interface SignupRequest {
  session_id: string
  roster_id: string
  device_token: string
}

export interface SignupResponse {
  signup: Signup
  on_waitlist: boolean
  position: number
}

export interface WithdrawRequest {
  session_id: string
  roster_id: string
  device_token: string
}

export interface WithdrawResponse {
  removed_id: string
  promoted_id: string | null
}
