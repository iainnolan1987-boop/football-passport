'use client'
// src/app/login/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../globals.css'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, background: 'var(--green)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="display" style={{ fontSize: 32, display: 'block' }}>Football Passport</h1>
          <p style={{ color: 'var(--gray)', marginTop: 6, fontSize: 14 }}>Sign in to your account</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Email</label>
              <input
                className="input" type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && signIn()}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Password</label>
              <input
                className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && signIn()}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={signIn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ color: 'var(--gray)', fontSize: 13 }}>
              Don&apos;t have an account?{' '}
              <button onClick={() => router.push('/signup')} style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
