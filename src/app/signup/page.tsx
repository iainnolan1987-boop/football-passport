'use client'
// src/app/signup/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../globals.css'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const signUp = async () => {
    if (!agreed) { setError('Please confirm you have read and agree to the terms.'); return }
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true); setError('')

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'parent' } },
    })

    if (authError) { setError(authError.message); setLoading(false); return }
    setDone(true)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, background: 'var(--gdim)', border: '1px solid var(--border2)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
        </div>
        <h2 className="display" style={{ fontSize: 34, marginBottom: 10 }}>Check Your Email</h2>
        <p style={{ color: 'var(--gray)', lineHeight: 1.7, marginBottom: 24 }}>
          We&apos;ve sent a confirmation link to <strong style={{ color: 'var(--white)' }}>{email}</strong>.<br/>
          Click it to activate your account, then sign in.
        </p>
        <button className="btn-primary" onClick={() => router.push('/login')}>Go to Sign In</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: 'var(--green)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="display" style={{ fontSize: 32, display: 'block' }}>Create Account</h1>
          <p style={{ color: 'var(--gray)', marginTop: 6, fontSize: 14 }}>Parent / Guardian account</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Full Name</label>
              <input className="input" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Email</label>
              <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Password</label>
              <input className="input" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <div style={{ background: 'var(--gdim)', border: '1px solid var(--border2)', borderRadius: 12, padding: 14 }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--green)', width: 15, height: 15 }} />
                <p style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.65 }}>
                  I am 18 or over (or a parent/guardian). I agree that all players added to my account are under my care and I have the right to upload footage of them. Consent can be withdrawn at any time.
                </p>
              </label>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={signUp} disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ color: 'var(--gray)', fontSize: 13 }}>
              Already have an account?{' '}
              <button onClick={() => router.push('/login')} style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
