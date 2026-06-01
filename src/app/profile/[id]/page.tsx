'use client'
// src/app/profile/[id]/page.tsx

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import ScoreRing from '@/components/ScoreRing'
import { DEV_TAGS, DRILLS, DEV_INSIGHTS } from '@/lib/devData'
import type { Player, Clip } from '@/types'
import '../../globals.css'

type Tab = 'timeline' | 'stats' | 'development'

export default function ProfilePage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const supabase  = createClient()

  const [player, setPlayer] = useState<Player | null>(null)
  const [clips,  setClips]  = useState<Clip[]>([])
  const [tab,    setTab]    = useState<Tab>('timeline')
  const [loading, setLoading] = useState(true)
  const [expandedClip, setExpandedClip] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadProfile() }, [id])

  const loadProfile = async () => {
    setLoading(true)
    const { data: playerData } = await supabase.from('players').select('*').eq('id', id).single()
    if (!playerData) { router.push('/dashboard'); return }
    setPlayer(playerData)

    const { data: clipData } = await supabase
      .from('clips')
      .select('*')
      .eq('player_id', id)
      .order('match_date', { ascending: false })

    setClips(clipData || [])
    setLoading(false)
  }

  const deleteClip = async (clipId: string, filePath: string) => {
    if (!confirm('Delete this clip? This cannot be undone.')) return
    setDeletingId(clipId)
    await supabase.storage.from('clips').remove([filePath])
    await supabase.from('clips').delete().eq('id', clipId)
    setClips(prev => prev.filter(c => c.id !== clipId))
    setDeletingId(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray)' }}>Loading passport…</div>
    </div>
  )

  if (!player) return null

  const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const approvedClips = clips.filter(c => c.status === 'approved')
  const pendingClips  = clips.filter(c => c.status === 'pending')

  // Aggregate dev tags across all clips
  const allTags = clips.flatMap(c => c.dev_tags || [])
  const tagCounts = allTags.reduce((acc: Record<string, number>, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {})
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const avgScore = clips.length > 0 ? Math.round(clips.filter(c => c.quality_score).reduce((a, c) => a + (c.quality_score || 0), 0) / clips.filter(c => c.quality_score).length) : null

  // Primary drill from most recent clip that has one
  const latestDrillId = clips.find(c => c.primary_drill_id)?.primary_drill_id
  const recommendedDrill = latestDrillId ? DRILLS.find(d => d.id === latestDrillId) : null

  const typeColors: Record<string, string> = {
    Goal: 'var(--green)', Assist: 'var(--blue)', Save: 'var(--gold)',
    Skill: 'var(--purple)', Tackle: 'var(--red)', 'Team Move': 'var(--orange)',
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Header */}
        <div className="card" style={{ padding: 26, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--green), var(--blue))' }} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="avatar" style={{ width: 76, height: 76, fontSize: 24 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className="tag">{player.age_group}</span>
                <span className="tag tag-gray">{player.position}</span>
                <span className="tag tag-gray">{player.strong_foot} foot</span>
                <span className="tag tag-gray">{player.privacy === 'public' ? '🌐 Public' : player.privacy === 'link_only' ? '🔗 Link' : '🔒 Private'}</span>
              </div>
              <h1 className="display" style={{ fontSize: 36, marginBottom: 3 }}>{player.name}</h1>
              <p style={{ color: 'var(--gray)', fontSize: 14 }}>{player.club}</p>
              {player.bio && <p style={{ color: 'var(--gray)', fontSize: 14, lineHeight: 1.7, marginTop: 10, maxWidth: 500 }}>{player.bio}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-primary btn-sm" onClick={() => router.push(`/upload?player=${player.id}`)}>
                📤 Upload Clip
              </button>
              <button className="btn-ghost btn-sm" onClick={() => router.push('/dashboard')}>← Dashboard</button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            ['Total Clips', clips.length, 'var(--white)'],
            ['Approved',    approvedClips.length, 'var(--green)'],
            ['Pending',     pendingClips.length, 'var(--gold)'],
            ['Avg Score',   avgScore !== null ? `${avgScore}` : '—', avgScore && avgScore >= 75 ? 'var(--green)' : avgScore && avgScore >= 55 ? 'var(--gold)' : 'var(--red)'],
            ['Focus Tags',  topTags.length, 'var(--blue)'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="stat-box">
              <div className="display" style={{ fontSize: 26, color: color as string }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 5, background: 'var(--card)', borderRadius: 100, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {(['timeline', 'stats', 'development'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', border: 'none',
                background: tab === t ? 'var(--green)' : 'transparent',
                color: tab === t ? '#000' : 'var(--gray)',
                transition: 'all 0.18s', textTransform: 'capitalize',
              }}
            >
              {t === 'timeline' ? '📋 Timeline' : t === 'stats' ? '📊 Stats' : '🎯 Development'}
            </button>
          ))}
        </div>

        {/* ── TIMELINE TAB ─────────────────────────────────────────────────── */}
        {tab === 'timeline' && (
          <div>
            {clips.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🎬</div>
                <h3 className="display" style={{ fontSize: 26, marginBottom: 10 }}>No Clips Yet</h3>
                <p style={{ color: 'var(--gray)', marginBottom: 22, fontSize: 14 }}>Upload the first clip for {player.name}</p>
                <button className="btn-primary" onClick={() => router.push(`/upload?player=${player.id}`)}>Upload First Clip</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {clips.map(clip => {
                  const drill = clip.primary_drill_id ? DRILLS.find(d => d.id === clip.primary_drill_id) : null
                  const isExpanded = expandedClip === clip.id
                  const typeColor = typeColors[clip.clip_type] || 'var(--green)'

                  return (
                    <div key={clip.id} className="card" style={{ overflow: 'hidden' }}>
                      {/* Clip header — always visible */}
                      <div
                        style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 20, cursor: 'pointer' }}
                        onClick={() => setExpandedClip(isExpanded ? null : clip.id)}
                      >
                        {/* Thumbnail / play area */}
                        <div className="video-thumb" style={{ width: 110, borderRadius: 12, flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                            <span className="tag" style={{ fontSize: 9, background: `${typeColor}20`, color: typeColor, borderColor: `${typeColor}40` }}>{clip.clip_type}</span>
                          </div>
                          {clip.video_url ? (
                            <a href={clip.video_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                              <div className="play-btn" style={{ width: 36, height: 36 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="#000"><polygon points="5,3 19,12 5,21"/></svg>
                              </div>
                            </a>
                          ) : (
                            <div className="play-btn" style={{ width: 36, height: 36 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="#000"><polygon points="5,3 19,12 5,21"/></svg>
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span className={`tag ${clip.status === 'approved' ? '' : clip.status === 'rejected' ? 'tag-red' : 'tag-gold'}`}>
                              {clip.status === 'approved' ? '✓ Approved' : clip.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                            </span>
                            {clip.quality_score && <span className="tag tag-gray">Score: {clip.quality_score}/100</span>}
                          </div>
                          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                            {clip.caption || `${clip.clip_type} vs ${clip.opponent || 'Unknown'}`}
                          </p>
                          <p style={{ color: 'var(--gray)', fontSize: 13 }}>
                            {new Date(clip.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {clip.opponent && ` · vs ${clip.opponent}`}
                          </p>
                          {(clip.dev_tags || []).length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                              {(clip.dev_tags || []).map(t => {
                                const ft = DEV_TAGS.find(d => d.id === t)
                                return ft ? <span key={t} className="tag" style={{ fontSize: 9, background: `${ft.color}15`, color: ft.color, borderColor: `${ft.color}30` }}>{ft.label}</span> : null
                              })}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          {clip.quality_score && <ScoreRing score={clip.quality_score} size={48} />}
                          <span style={{ color: 'var(--gray)', fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="fade-up" style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Quality report summary */}
                            {clip.quality_data && (
                              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quality Report</p>
                                {([
                                  ['Clarity',     (clip.quality_data as any).scores?.clarity],
                                  ['Lighting',    (clip.quality_data as any).scores?.lighting],
                                  ['Stability',   (clip.quality_data as any).scores?.stability],
                                  ['Player Vis',  (clip.quality_data as any).scores?.playerVisibility],
                                  ['Ball Vis',    (clip.quality_data as any).scores?.ballVisibility],
                                  ['Action',      (clip.quality_data as any).scores?.actionCompleteness],
                                ] as [string, number][]).map(([l, v]) => {
                                  if (!v) return null
                                  const col = v >= 75 ? 'var(--green)' : v >= 55 ? 'var(--gold)' : 'var(--red)'
                                  return (
                                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                      <span style={{ fontSize: 12, color: 'var(--gray)', width: 80, flexShrink: 0 }}>{l}</span>
                                      <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${v}%`, background: col }} /></div>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: col, width: 28, textAlign: 'right' }}>{v}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* Dev insights */}
                            {(clip.dev_tags || []).length > 0 && (() => {
                              const primaryTag = clip.dev_tags[0]
                              const insight = DEV_INSIGHTS[primaryTag]
                              return insight ? (
                                <div style={{ display: 'grid', gap: 10 }}>
                                  {[
                                    { label: '💪 Strength', text: insight.strength, col: 'var(--green)' },
                                    { label: '🎯 To Improve', text: insight.improve, col: 'var(--orange)' },
                                    { label: '👨‍👧 Parent Tip', text: insight.parentTip, col: 'var(--purple)' },
                                  ].map(r => (
                                    <div key={r.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                                      <p style={{ fontSize: 11, fontWeight: 700, color: r.col, marginBottom: 4 }}>{r.label}</p>
                                      <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.65 }}>{r.text}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : null
                            })()}

                            {/* Recommended drill */}
                            {drill && (
                              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📚 Recommended Drill</p>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: 28, flexShrink: 0 }}>{drill.emoji}</span>
                                  <div>
                                    <p style={{ fontWeight: 700, marginBottom: 4 }}>{drill.name}</p>
                                    <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 6 }}>{drill.mins} mins · {drill.level}</p>
                                    <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.65 }}>{drill.description}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Video link + delete */}
                            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                              {clip.video_url && (
                                <a href={clip.video_url} target="_blank" rel="noreferrer" className="btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                                  ▶ Watch Clip
                                </a>
                              )}
                              <button
                                className="btn-ghost btn-sm"
                                style={{ color: 'var(--red)', borderColor: 'rgba(255,71,87,0.3)' }}
                                onClick={() => deleteClip(clip.id, clip.file_path)}
                                disabled={deletingId === clip.id}
                              >
                                {deletingId === clip.id ? 'Deleting…' : '🗑 Delete Clip'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STATS TAB ────────────────────────────────────────────────────── */}
        {tab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 22 }}>
              <p style={{ fontWeight: 700, marginBottom: 16 }}>Clip Breakdown</p>
              {['Goal','Assist','Save','Skill','Tackle','Team Move'].map(type => {
                const count = clips.filter(c => c.clip_type === type).length
                const pct = clips.length > 0 ? (count / clips.length) * 100 : 0
                return (
                  <div key={type} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--gray)' }}>{type}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: typeColors[type] || 'var(--green)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="card" style={{ padding: 22 }}>
              <p style={{ fontWeight: 700, marginBottom: 16 }}>Quality Over Time</p>
              {clips.filter(c => c.quality_score).map(clip => (
                <div key={clip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{clip.clip_type}</p>
                    <p style={{ fontSize: 11, color: 'var(--gray)' }}>{new Date(clip.match_date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: (clip.quality_score || 0) >= 75 ? 'var(--green)' : (clip.quality_score || 0) >= 55 ? 'var(--gold)' : 'var(--red)' }}>
                      {clip.quality_score}/100
                    </p>
                  </div>
                </div>
              ))}
              {clips.filter(c => c.quality_score).length === 0 && (
                <p style={{ color: 'var(--gray)', fontSize: 13 }}>No quality scores yet</p>
              )}
            </div>
          </div>
        )}

        {/* ── DEVELOPMENT TAB ──────────────────────────────────────────────── */}
        {tab === 'development' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top focus areas */}
            <div className="card" style={{ padding: 22 }}>
              <p style={{ fontWeight: 700, marginBottom: 16 }}>Focus Areas (from all clips)</p>
              {topTags.length === 0 ? (
                <p style={{ color: 'var(--gray)', fontSize: 14 }}>No development tags yet. Add them when uploading clips.</p>
              ) : topTags.map(([tagId, count]) => {
                const ft = DEV_TAGS.find(d => d.id === tagId)
                if (!ft) return null
                return (
                  <div key={tagId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span className="tag" style={{ background: `${ft.color}18`, color: ft.color, borderColor: `${ft.color}35`, minWidth: 110 }}>{ft.label}</span>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${(count / Math.max(...Object.values(tagCounts))) * 100}%`, background: ft.color }} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--gray)', minWidth: 40 }}>{count} clip{count !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>

            {/* Insight for primary tag */}
            {topTags.length > 0 && (() => {
              const [primaryTagId] = topTags[0]
              const insight = DEV_INSIGHTS[primaryTagId]
              const ft = DEV_TAGS.find(d => d.id === primaryTagId)
              return insight && ft ? (
                <div className="card" style={{ padding: 22, borderColor: `${ft.color}25` }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: ft.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                    Primary Focus: {ft.label}
                  </p>
                  {[
                    { icon: '💪', label: 'Strength', text: insight.strength },
                    { icon: '🎯', label: 'Area to Improve', text: insight.improve },
                    { icon: '👨‍👧', label: 'Parent Coaching Tip', text: insight.parentTip },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.label}</p>
                        <p style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.7 }}>{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            {/* Recommended drill */}
            {recommendedDrill && (
              <div className="card" style={{ padding: 22 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>📚 Recommended Drill</p>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ fontSize: 36, flexShrink: 0 }}>{recommendedDrill.emoji}</span>
                  <div>
                    <div style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                      <span className="tag tag-gray">{recommendedDrill.level}</span>
                      <span className="tag tag-gray">{recommendedDrill.mins} mins</span>
                    </div>
                    <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{recommendedDrill.name}</p>
                    <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>{recommendedDrill.description}</p>
                    <p style={{ fontSize: 13, color: 'var(--gray)' }}><strong style={{ color: 'var(--white)' }}>Setup:</strong> {recommendedDrill.setup}</p>
                    <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}><strong style={{ color: 'var(--white)' }}>Reps:</strong> {recommendedDrill.reps}</p>
                    <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}><strong style={{ color: 'var(--white)' }}>Coach tip:</strong> {recommendedDrill.coachTip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
