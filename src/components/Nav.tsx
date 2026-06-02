'use client'

// src/components/Nav.tsx

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const router = useRouter()
  const path = usePathname()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/upload',    label: 'Upload Clip' },
  ]

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(7,9,12,0.93)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 20px',
        height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: 32, height: 32, background: 'var(--green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="display" style={{ fontSize: 19, color: 'var(--white)' }}>Football Passport</span>
        </button>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => router.push(l.href)}
              style={{
                border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: path === l.href ? 700 : 500,
                color: path === l.href ? 'var(--white)' : 'var(--gray)',
                padding: '8px 14px', borderRadius: 100,
                background: path === l.href ? 'rgba(255,255,255,0.06)' : 'transparent',
                transition: 'all 0.18s',
              }}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={signOut}
            style={{
              background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              color: 'var(--gray)', padding: '7px 14px', borderRadius: 100, marginLeft: 8,
              transition: 'all 0.18s',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}