'use client'
// src/app/dashboard/page.tsx

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import type { Player } from '@/types'
import '../globals.css'

const POSITIONS = ['Striker', 'Winger', 'Attacking Mid', 'Central Mid', 'Defensive Mid', 'Left Back', 'Right Back', 'Centre Back', 'Goalkeeper']
const AGE_GROUPS = ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18']

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [players, setPlayers]   = useState<Player[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')
  const [userName, setUserName] = useState('')

  const [form, setForm] = useState({
    name: '', age_group: 'U14', position: 'Striker',
    club: '', strong_foot: 'Right' as 'Left'|'Right'|'Both',
    bio: '', privacy: 'private' as 'public'|'private'|'link_only',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserName(user.user_metadata?.full_name || user.email || '')

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setPlayers(data || [])
    setLoading(false)
  }

  const createPlayer = async () => {
    if (!form.name.trim()) { setFormError('Player name is required.'); return }
    if (!form.club.trim()) { setFormError('Club / team name is required.'); return }
    setSaving(true); setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('players')
      .insert({ ...form, user_id: user.id })
      .select()
      .single()

    if (error) { setFormError(error.message); setSaving(false); return }
    setPlayers(prev => [data, ...prev])
    setShowForm(false)
    setSaving(false)
    setForm({ name:'', age_group:'U14', position:'Striker', club:'', strong_foot:'Right', bio:'', privacy:'private' })
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const posColor: Record<string, string> = {
    'Goalkeeper': 'var(--gold)', 'Striker': 'var(--red)', 'Winger': 'var(--orange)',
    'Centre Back': 'var(--blue)', 'default': 'var(--green)',
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 6 }}>Welcome back</p>
            <h1 className="display" style={{ fontSize: 42 }}>{userName.split(' ')[0] || 'Dashboard'}</h1>
            <p style={{ color: 'var(--gray)', marginTop: 6, fontSize: 14 }}>
              {players.length === 0 ? 'Create your first player passport to get started.' : `${players.length} player passport${players.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Player
          </button>
        </div>

        {/* Create player form */}
        {showForm && (
          <div className="card fade-up" style={{ padding: 28, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="display" style={{ fontSize: 26 }}>New Player Passport</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Player Name *</label>
                <input className="input" placeholder="e.g. Marcus Williams" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Club / Team *</label>
                <input className="input" placeholder="e.g. Riverside FC" value={form.club} onChange={e => setForm({...form, club: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Age Group</label>
                <select className="input" value={form.age_group} onChange={e => setForm({...form, age_group: e.target.value})}>
                  {AGE_GROUPS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Position</label>
                <select className="input" value={form.position} onChange={e => setForm({...form, position: e.target.value})}>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Strong Foot</label>
                <select className="input" value={form.strong_foot} onChange={e => setForm({...form, strong_foot: e.target.value as any})}>
                  <option>Right</option><option>Left</option><option>Both</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Profile Visibility</label>
                <select className="input" value={form.privacy} onChange={e => setForm({...form, privacy: e.target.value as any})}>
                  <option value="private">Private (only you)</option>
                  <option value="link_only">Link only</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Bio (optional)</label>
              <textarea className="input" rows={2} placeholder="Short description of the player…" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} style={{ resize: 'vertical' }} />
            </div>

            {formError && (
              <div style={{ marginTop: 14, background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ color: 'var(--red)', fontSize: 13 }}>{formError}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="btn-primary" onClick={createPlayer} disabled={saving}>{saving ? 'Creating…' : 'Create Passport'}</button>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Players grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>Loading…</div>
        ) : players.length === 0 && !showForm ? (
          <div className="card" style={{ padding: 52, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 10 }}>No Players Yet</h3>
            <p style={{ color: 'var(--gray)', marginBottom: 24, fontSize: 14, lineHeight: 1.7 }}>
              Create your first player passport to start uploading clips<br/>and tracking development.
            </p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Create First Passport</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {players.map(player => {
              const col = posColor[player.position] || posColor.default
              return (
                <div
                  key={player.id}
                  className="card"
                  onClick={() => router.push(`/profile/${player.id}`)}
                  style={{ padding: 24, cursor: 'pointer', transition: 'all 0.22s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${col}, transparent)` }} />
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                    <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{initials(player.name)}</div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800 }}>{player.name}</h3>
                      <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 2 }}>{player.club}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <span className="tag">{player.age_group}</span>
                    <span className="tag tag-gray">{player.position}</span>
                    <span className="tag tag-gray">{player.strong_foot} foot</span>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--gray)' }}>{player.privacy === 'public' ? '🌐 Public' : player.privacy === 'link_only' ? '🔗 Link only' : '🔒 Private'}</span>
                    <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>View Passport →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
