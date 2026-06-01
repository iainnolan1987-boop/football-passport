// src/types/index.ts

export type Profile = {
  id: string
  user_id: string
  full_name: string
  role: 'parent' | 'coach' | 'club_admin' | 'admin'
  created_at: string
}

export type Player = {
  id: string
  user_id: string          // parent who owns this profile
  name: string
  age_group: string        // e.g. 'U14'
  position: string
  club: string
  strong_foot: 'Left' | 'Right' | 'Both'
  bio: string
  privacy: 'public' | 'private' | 'link_only'
  created_at: string
}

export type Clip = {
  id: string
  player_id: string
  uploaded_by: string      // user id
  match_date: string
  opponent: string | null
  clip_type: 'Goal' | 'Assist' | 'Save' | 'Skill' | 'Tackle' | 'Team Move'
  caption: string | null
  video_url: string        // Supabase Storage public URL
  file_path: string        // path inside the bucket e.g. "userId/clipId.mp4"
  status: 'pending' | 'approved' | 'rejected'
  parent_consent: boolean
  quality_score: number | null
  quality_data: QualityResult | null
  dev_tags: string[]
  primary_drill_id: number | null
  likes_count: number
  created_at: string
  // joined
  player?: Player
}

export type QualityCheck = {
  code: string
  level: 'error' | 'warn' | 'pass'
  label: string
  message: string
  fix?: string
}

export type QualityResult = {
  overall: number
  passed: boolean
  scores: {
    clarity: number
    lighting: number
    stability: number
    playerVisibility: number
    ballVisibility: number
    actionCompleteness: number
  }
  checks: QualityCheck[]
}

export type DevTag = {
  id: string
  label: string
  color: string
}

export type Drill = {
  id: number
  tag: string
  name: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  mins: number
  description: string
  setup: string
  reps: string
  coachTip: string
  emoji: string
}
