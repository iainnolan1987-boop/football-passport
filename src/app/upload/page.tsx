'use client'
// src/app/upload/page.tsx
// Full 4-step upload flow:
// Step 1 → Select player + fill details
// Step 2 → Upload video to Supabase Storage + run smart analyser
// Step 3 → Show quality report (score, passed checks, errors, warnings)
// Step 4 → Select development focus tags → save clip record to DB

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { analyseClip }  from '@/lib/analyseClip'
import { DEV_TAGS, DRILLS, getDrillForTags } from '@/lib/devData'
import Nav from '@/components/Nav'
import ScoreRing from '@/components/ScoreRing'
import type { Player, QualityResult, Drill } from '@/types'
import '../globals.css'

const CLIP_TYPES = ['Goal', 'Assist', 'Save', 'Skill', 'Tackle', 'Team Move'] as const

  function UploadPageContent() {
  const router      = useRouter()
  const supabase    = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── State ─────────────────────────────────────────────────────────────────
  const [step, setStep]           = useState<1|2|3|4>(1)
  const [players, setPlayers]     = useState<Player[]>([])
  const [file, setFile]           = useState<File | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [analysis, setAnalysis]   = useState<QualityResult | null>(null)
  const [selTags, setSelTags]     = useState<string[]>([])
  const [drill, setDrill]         = useState<Drill | null>(null)
  const [saving, setSaving]       = useState(false)
  const [savedClipId, setSavedClipId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')

  const [form, setForm] = useState({
    player_id: '',
    match_date: new Date().toISOString().slice(0, 10),
    opponent:   '',
    clip_type:  'Goal' as typeof CLIP_TYPES[number],
    caption:    '',
    consent:    false,
  })

  useEffect(() => { loadPlayers() }, [])

  const loadPlayers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('players').select('*').eq('user_id', user.id).order('name')
    setPlayers(data || [])
    // Pre-select if only one player
    if (data?.length === 1 && !form.player_id) setForm(f => ({...f, player_id: data[0].id}))
  }

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = (f: File) => {
    setFile(f)
    setUploadError('')
  }

  // ── Step 1 → 2: upload + analyse ─────────────────────────────────────────
  const runUploadAndAnalyse = async () => {
    if (!file)             { setUploadError('Please select a video file.'); return }
    if (!form.player_id)   { setUploadError('Please select a player.'); return }
    if (!form.consent)     { setUploadError('Parent/guardian consent is required.'); return }

    setUploading(true)
    setStep(2)
    setUploadError('')

    try {
      // 1. Run smart analyser (reads file metadata locally — no server needed)
      const result = await analyseClip({ file, consentGiven: form.consent })
      setAnalysis(result)

      // 2. Upload to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext      = file.name.split('.').pop() || 'mp4'
      const filePath = `${user.id}/${Date.now()}.${ext}`

      // Simulate upload progress (Supabase JS v2 doesn't expose progress natively)
      // For real progress, use XMLHttpRequest — see TROUBLESHOOTING in README
      const progressInterval = setInterval(() => {
        setUploadPct(p => Math.min(p + 8, 88))
      }, 200)

      const { error: storageError } = await supabase.storage
        .from('clips')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      clearInterval(progressInterval)
      setUploadPct(100)

      if (storageError) throw storageError

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage.from('clips').getPublicUrl(filePath)

      // 4. Save clip record to database
      const { data: clip, error: dbError } = await supabase
        .from('clips')
        .insert({
          player_id:     form.player_id,
          uploaded_by:   user.id,
          match_date:    form.match_date,
          opponent:      form.opponent || null,
          clip_type:     form.clip_type,
          caption:       form.caption || null,
          video_url:     publicUrl,
          file_path:     filePath,
          parent_consent: form.consent,
          status:        'pending',
          quality_score: result.overall,
          quality_data:  result,
          dev_tags:      [],
        })
        .select()
        .single()

      if (dbError) throw dbError
      setSavedClipId(clip.id)

    } catch (err: any) {
      setUploadError(err.message || 'Upload failed — see troubleshooting below.')
      setStep(1)
    } finally {
      setUploading(false)
    }
  }

  // ── Step 3 → 4 ────────────────────────────────────────────────────────────
  const goToTags = () => setStep(4)

  // ── Step 4: save tags + drill ─────────────────────────────────────────────
  const saveTags = async () => {
    if (!savedClipId) return
    setSaving(true)
    const recommended = getDrillForTags(selTags)
    setDrill(recommended)

    await supabase
      .from('clips')
      .update({ dev_tags: selTags, primary_drill_id: recommended?.id || null })
      .eq('id', savedClipId)

    setSaving(false)
    setStep(4)  // stay on step 4 but now show the result
  }

  const finishAndViewProfile = () => {
    const player = players.find(p => p.id === form.player_id)
    if (player) router.push(`/profile/${player.id}`)
    else router.push('/dashboard')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleTag = (id: string) =>
    setSelTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const errorChecks  = analysis?.checks.filter(c => c.level === 'error')  || []
  const warnChecks   = analysis?.checks.filter(c => c.level === 'warn')   || []
  const passedChecks = analysis?.checks.filter(c => c.level === 'pass')   || []

  const stepLabels = ['Details', 'Uploading', 'Quality Report', 'Dev Focus']

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32 }}>
          {stepLabels.map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--green)' : active ? 'var(--green)' : 'var(--bg3)',
                  border: `1px solid ${done || active ? 'var(--green)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: done || active ? '#000' : 'var(--gray)',
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--white)' : 'var(--gray2)', whiteSpace: 'nowrap' }} className="hide-mobile">
                  {label}
                </span>
                {i < 3 && <div style={{ width: 20, height: 1, background: 'var(--border)', flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Form ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="fade-up">
            <p className="section-label" style={{ marginBottom: 8 }}>Smart Clip Upload</p>
            <h1 className="display" style={{ fontSize: 40, marginBottom: 6 }}>Upload a Clip</h1>
            <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
              Your video will be analysed for quality automatically. We&apos;ll tell you exactly what to improve.
            </p>

            <div className="card" style={{ padding: 26 }}>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
                style={{
                  border: `2px dashed ${dragOver || file ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 16, padding: 40, textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s', background: file ? 'var(--gdim)' : 'transparent', marginBottom: 24,
                }}
              >
                <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {file ? (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{file.name}</p>
                    <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload</p>
                    <button onClick={e => { e.stopPropagation(); setFile(null) }} style={{ marginTop: 10, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📹</div>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>Drop your video here</p>
                    <p style={{ color: 'var(--gray)', fontSize: 13 }}>MP4, MOV, AVI · Max 500 MB · 10–90 seconds</p>
                    <div className="btn-ghost btn-sm" style={{ marginTop: 14, display: 'inline-flex' }}>Browse Files</div>
                  </>
                )}
              </div>

              {/* Form fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Player *</label>
                  <select className="input" value={form.player_id} onChange={e => setForm({...form, player_id: e.target.value})}>
                    <option value="">Select player…</option>
                    {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.age_group} · {p.club})</option>)}
                  </select>
                  {players.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--orange)', marginTop: 6 }}>
                      No players found.{' '}
                      <button onClick={() => router.push('/dashboard')} style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700 }}>
                        Create one first →
                      </button>
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Match Date *</label>
                  <input type="date" className="input" value={form.match_date} onChange={e => setForm({...form, match_date: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Opponent (optional)</label>
                  <input className="input" placeholder="e.g. Eastside Youth FC" value={form.opponent} onChange={e => setForm({...form, opponent: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Clip Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                  {CLIP_TYPES.map(t => (
                    <button key={t} onClick={() => setForm({...form, clip_type: t})} style={{
                      padding: '9px 6px', borderRadius: 10, fontFamily: "'DM Sans', sans-serif",
                      border: `1px solid ${form.clip_type === t ? 'var(--green)' : 'var(--border)'}`,
                      background: form.clip_type === t ? 'var(--gdim)' : 'transparent',
                      color: form.clip_type === t ? 'var(--green)' : 'var(--gray)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s',
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Caption (optional)</label>
                <textarea className="input" rows={2} placeholder="Describe the moment…" value={form.caption} onChange={e => setForm({...form, caption: e.target.value})} style={{ resize: 'vertical' }} />
              </div>

              {/* Consent */}
              <div style={{ background: 'var(--gdim)', border: '1px solid var(--border2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.consent} onChange={e => setForm({...form, consent: e.target.checked})} style={{ marginTop: 3, accentColor: 'var(--green)', width: 16, height: 16 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Parent / Guardian Consent *</p>
                    <p style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.65 }}>
                      I confirm I am the parent/guardian of the player shown in this video and I give consent for this clip to be uploaded, analysed, and (if approved) displayed on Football Passport. I understand I can withdraw consent at any time by deleting the clip.
                    </p>
                  </div>
                </label>
              </div>

              {uploadError && (
                <div style={{ marginBottom: 16, background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upload Error</p>
                  <p style={{ color: 'var(--red)', fontSize: 13, opacity: 0.85 }}>{uploadError}</p>
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px' }}
                onClick={runUploadAndAnalyse}
                disabled={uploading || !file}
              >
                🔍 Upload & Analyse Clip
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Uploading ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="fade-up" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg3)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--green)" strokeWidth="6"
                  strokeDasharray={`${(uploadPct / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`} strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.25s' }} />
              </svg>
              <span style={{ fontSize: 28, position: 'relative', zIndex: 1 }}>📤</span>
            </div>
            <h2 className="display" style={{ fontSize: 34, marginBottom: 8 }}>
              {uploadPct < 100 ? 'Uploading…' : 'Analysing…'}
            </h2>
            <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 8 }}>
              {uploadPct < 100 ? `${Math.round(uploadPct)}% uploaded` : 'Running quality checks…'}
            </p>
            <p style={{ color: 'var(--gray2)', fontSize: 12 }}>Do not close this tab</p>
          </div>
        )}

        {/* ── STEP 3: Quality Report ───────────────────────────────────────── */}
        {step === 3 && analysis && (
          <div className="fade-up">
            <p className="section-label" style={{ marginBottom: 8 }}>Quality Report</p>
            <h2 className="display" style={{ fontSize: 40, marginBottom: 24 }}>
              {analysis.passed ? 'Clip Passed ✓' : 'Issues Found'}
            </h2>

            {/* Score + summary */}
            <div className="card" style={{ padding: 26, marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing score={analysis.overall} size={100} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                  {analysis.overall >= 75 ? 'Good quality — ready for review.' : analysis.overall >= 55 ? 'Acceptable, but some things to improve.' : 'Quality issues detected.'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {errorChecks.length > 0  && <span className="tag tag-red">{errorChecks.length} error{errorChecks.length !== 1 ? 's' : ''}</span>}
                  {warnChecks.length > 0   && <span className="tag tag-warn">{warnChecks.length} warning{warnChecks.length !== 1 ? 's' : ''}</span>}
                  {passedChecks.length > 0 && <span className="tag">{passedChecks.length} passed</span>}
                </div>
                <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
                  {analysis.passed
                    ? 'Your clip has been saved and sent for admin review. Add development tags next to get personalised feedback.'
                    : 'Your clip has been saved. You can still add development tags, but consider re-uploading a better version.'}
                </p>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="card" style={{ padding: 22, marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Quality Breakdown</p>
              {([
                ['Clarity / Sharpness', analysis.scores.clarity],
                ['Lighting',            analysis.scores.lighting],
                ['Camera Stability',    analysis.scores.stability],
                ['Player Visibility',   analysis.scores.playerVisibility],
                ['Ball Visibility',     analysis.scores.ballVisibility],
                ['Action Completeness', analysis.scores.actionCompleteness],
              ] as [string, number][]).map(([label, val]) => {
                const col = val >= 75 ? 'var(--green)' : val >= 55 ? 'var(--gold)' : 'var(--red)'
                return (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: 'var(--gray)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{val}</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${val}%`, background: col }} /></div>
                  </div>
                )
              })}
            </div>

            {/* Errors — must fix */}
            {errorChecks.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>❌ Issues to Fix</p>
                {errorChecks.map((c, i) => (
                  <div key={i} style={{ background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.label}: {c.message}</p>
                    {c.fix && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', opacity: 0.7, flexShrink: 0, marginTop: 1 }}>FIX:</span>
                        <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>{c.fix}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {warnChecks.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>⚠️ Suggestions</p>
                {warnChecks.map((c, i) => (
                  <div key={i} style={{ background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.18)', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                    <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--white)' }}>{c.label}:</strong> {c.message}
                      {c.fix && <><br /><span style={{ color: 'var(--gold)', opacity: 0.8 }}>{c.fix}</span></>}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Passed */}
            {passedChecks.length > 0 && (
              <details style={{ marginBottom: 20 }}>
                <summary style={{ color: 'var(--gray)', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
                  ✅ {passedChecks.length} check{passedChecks.length !== 1 ? 's' : ''} passed
                </summary>
                {passedChecks.map((c, i) => (
                  <div key={i} style={{ padding: '8px 14px', fontSize: 13, color: 'var(--gray)', borderBottom: '1px solid var(--border)' }}>
                    ✓ {c.label}: {c.message}
                  </div>
                ))}
              </details>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn-ghost" onClick={() => router.push('/upload')}>Upload Another</button>
              <button className="btn-primary" onClick={goToTags} style={{ flex: 1, justifyContent: 'center' }}>
                Add Development Tags →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Dev Tags ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="fade-up">
            {!drill ? (
              <>
                <p className="section-label" style={{ marginBottom: 8 }}>Development Focus</p>
                <h2 className="display" style={{ fontSize: 38, marginBottom: 6 }}>Tag This Clip</h2>
                <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
                  Which skills are shown in this clip? Select all that apply. We&apos;ll recommend a drill based on your selections.
                </p>

                <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 9 }}>
                    {DEV_TAGS.map(tag => {
                      const on = selTags.includes(tag.id)
                      return (
                        <button key={tag.id} onClick={() => toggleTag(tag.id)} style={{
                          padding: '12px 10px', borderRadius: 12,
                          border: `1px solid ${on ? tag.color : 'var(--border)'}`,
                          background: on ? `${tag.color}14` : 'transparent',
                          color: on ? tag.color : 'var(--gray)',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s',
                          textAlign: 'left', fontFamily: "'DM Sans', sans-serif",
                        }}>
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>

                  {selTags.length > 0 && (
                    <div style={{ marginTop: 16, padding: 14, background: 'var(--gdim)', border: '1px solid var(--border2)', borderRadius: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 4 }}>{selTags.length} area{selTags.length !== 1 ? 's' : ''} selected</p>
                      <p style={{ fontSize: 13, color: 'var(--gray)' }}>
                        Primary drill will match: <strong style={{ color: 'var(--white)' }}>{DEV_TAGS.find(t => t.id === selTags[0])?.label}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-ghost" onClick={finishAndViewProfile}>Skip, View Profile</button>
                  <button className="btn-primary" onClick={saveTags} disabled={saving || selTags.length === 0} style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Saving…' : '⚡ Get My Drill Recommendation'}
                  </button>
                </div>
              </>
            ) : (
              /* Drill result */
              <>
                <p className="section-label" style={{ marginBottom: 8 }}>All Done!</p>
                <h2 className="display" style={{ fontSize: 38, marginBottom: 6 }}>Clip Saved ✓</h2>
                <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 24 }}>
                  Your clip is pending admin review. Here&apos;s your recommended training drill.
                </p>

                <div className="card" style={{ padding: 26, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {selTags.map(t => {
                      const ft = DEV_TAGS.find(d => d.id === t)
                      return ft ? <span key={t} className="tag" style={{ background: `${ft.color}18`, color: ft.color, borderColor: `${ft.color}35` }}>{ft.label}</span> : null
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
                    <span style={{ fontSize: 40, flexShrink: 0 }}>{drill.emoji}</span>
                    <div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span className="tag tag-gray">{drill.level}</span>
                        <span className="tag tag-gray">{drill.mins} mins</span>
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{drill.name}</h3>
                      <p style={{ color: 'var(--gray)', fontSize: 14, lineHeight: 1.7 }}>{drill.description}</p>
                    </div>
                  </div>

                  {[['⚙️ Setup', drill.setup], ['🔁 Reps', drill.reps], ['💡 Coach Tip', drill.coachTip]].map(([l, v]) => (
                    <div key={l} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray2)', marginBottom: 4 }}>{l}</p>
                      <p style={{ fontSize: 14, color: 'var(--gray)' }}>{v}</p>
                    </div>
                  ))}
                </div>

                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15 }} onClick={finishAndViewProfile}>
                  View Player Passport →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default function UploadPage() {
return (
<Suspense fallback={<div>Loading upload page...</div>}>
<UploadPageContent />
</Suspense>
)
}