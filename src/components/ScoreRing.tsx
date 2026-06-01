'use client'
// src/components/ScoreRing.tsx

type Props = { score: number; size?: number }

export default function ScoreRing({ score, size = 96 }: Props) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 75 ? 'var(--green)' : score >= 55 ? 'var(--gold)' : 'var(--red)'
  const label = score >= 75 ? 'Good' : score >= 55 ? 'Fair' : 'Poor'

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div className="display" style={{ fontSize: size * 0.27, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: size * 0.12, color: 'var(--gray)', fontWeight: 700 }}>{label}</div>
      </div>
    </div>
  )
}
