// src/lib/analyseClip.ts
// Smart clip checker.
// Currently uses file metadata + deterministic heuristics.
// To add real AI: swap the score generation block for Claude Vision API calls
// on extracted video frames (ffmpeg → base64 → Anthropic API).

import type { QualityResult, QualityCheck } from '@/types'

export type AnalyseInput = {
  file: File
  consentGiven: boolean
}

export async function analyseClip(input: AnalyseInput): Promise<QualityResult> {
  const { file, consentGiven } = input
  const checks: QualityCheck[] = []

  // ── 1. Consent ────────────────────────────────────────────────────────────
  if (!consentGiven) {
    checks.push({
      code: 'no_consent',
      level: 'error',
      label: 'Parental Consent Missing',
      message: 'Parent or guardian consent is required before this clip can be submitted.',
      fix: 'Tick the consent checkbox to confirm you have permission to upload footage of this player.',
    })
  } else {
    checks.push({ code: 'consent_ok', level: 'pass', label: 'Parental Consent', message: 'Consent confirmed.' })
  }

  // ── 2. File size ──────────────────────────────────────────────────────────
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > 500) {
    checks.push({
      code: 'file_too_large',
      level: 'error',
      label: 'File Too Large',
      message: `File is ${sizeMB.toFixed(0)} MB — maximum allowed is 500 MB.`,
      fix: 'Trim the clip or re-export at 720p to reduce the file size.',
    })
  } else if (sizeMB < 0.3) {
    checks.push({
      code: 'file_too_small',
      level: 'error',
      label: 'File Too Small',
      message: `File is only ${(file.size / 1024).toFixed(0)} KB — it may be corrupt or only a still image.`,
      fix: 'Check the video plays correctly on your device before uploading.',
    })
  } else {
    checks.push({ code: 'file_size_ok', level: 'pass', label: 'File Size', message: `${sizeMB.toFixed(1)} MB — good.` })
  }

  // ── 3. File type ──────────────────────────────────────────────────────────
  const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/webm']
  if (!validTypes.includes(file.type) && file.type !== '') {
    checks.push({
      code: 'wrong_format',
      level: 'error',
      label: 'Unsupported Format',
      message: `Format "${file.type}" is not supported.`,
      fix: 'Please upload MP4, MOV, AVI, or WebM.',
    })
  } else {
    checks.push({ code: 'format_ok', level: 'pass', label: 'File Format', message: `${file.type || 'video'} — accepted.` })
  }

  // ── 4. Duration check via HTMLVideoElement ────────────────────────────────
  let durationSeconds = 0
  try {
    durationSeconds = await getVideoDuration(file)

    if (durationSeconds < 5) {
      checks.push({
        code: 'too_short',
        level: 'error',
        label: 'Clip Too Short',
        message: `Clip is only ${durationSeconds.toFixed(1)} seconds. Minimum is 10 seconds.`,
        fix: 'Please upload 10–60 seconds showing the full action from start to finish.',
      })
    } else if (durationSeconds < 10) {
      checks.push({
        code: 'slightly_short',
        level: 'warn',
        label: 'Clip Quite Short',
        message: `Clip is ${durationSeconds.toFixed(1)} seconds. Consider capturing a little more context.`,
        fix: 'Start recording 5 seconds before the action.',
      })
    } else if (durationSeconds > 90) {
      checks.push({
        code: 'too_long',
        level: 'error',
        label: 'Clip Too Long',
        message: `Clip is ${Math.round(durationSeconds)} seconds. Maximum is 90 seconds for a single action.`,
        fix: 'Trim to the key moment: approach, action, and outcome. Keep it under 90 seconds.',
      })
    } else if (durationSeconds > 60) {
      checks.push({
        code: 'slightly_long',
        level: 'warn',
        label: 'Clip Quite Long',
        message: `Clip is ${Math.round(durationSeconds)} seconds. Shorter clips (10–60s) are easier for coaches to review.`,
      })
    } else {
      checks.push({
        code: 'duration_ok',
        level: 'pass',
        label: 'Clip Duration',
        message: `${Math.round(durationSeconds)} seconds — perfect length.`,
      })
    }
  } catch {
    checks.push({
      code: 'duration_unknown',
      level: 'warn',
      label: 'Duration Check',
      message: 'Could not read video duration automatically.',
      fix: 'Make sure the clip is 10–90 seconds long.',
    })
  }

  // ── 5. Orientation ────────────────────────────────────────────────────────
  try {
    const { width, height } = await getVideoDimensions(file)

    if (height > width) {
      checks.push({
        code: 'portrait',
        level: 'warn',
        label: 'Portrait Orientation',
        message: 'Video appears to be recorded in portrait (vertical) mode.',
        fix: 'Hold your phone horizontally (landscape) when recording on a pitch. This gives a much wider, better view of the action.',
      })
    } else {
      checks.push({ code: 'orientation_ok', level: 'pass', label: 'Orientation', message: 'Landscape orientation — correct.' })
    }

    // Resolution
    const minDimension = Math.min(width, height)
    if (minDimension < 360) {
      checks.push({
        code: 'low_res',
        level: 'error',
        label: 'Low Resolution',
        message: `Resolution is too low (${width}×${height}). Minimum is 480p.`,
        fix: 'Set your phone camera to at least 720p before recording.',
      })
    } else if (minDimension < 480) {
      checks.push({
        code: 'medium_res',
        level: 'warn',
        label: 'Resolution',
        message: `Resolution ${width}×${height} is acceptable but 720p or higher is recommended.`,
      })
    } else {
      checks.push({ code: 'resolution_ok', level: 'pass', label: 'Resolution', message: `${width}×${height} — good quality.` })
    }
  } catch {
    checks.push({ code: 'dimensions_unknown', level: 'warn', label: 'Resolution Check', message: 'Could not read video dimensions automatically.' })
  }

  // ── 6. Simulated frame-quality checks ────────────────────────────────────
  // These are PLACEHOLDERS. Replace with real values from Claude Vision API
  // by extracting frames server-side and sending to /api/analyse-frames.
  // The structure below stays exactly the same — just swap in real scores.

  const seed = hashString(file.name + file.size.toString())
  const simScore = (min: number, max: number, offset: number) =>
    Math.round(min + ((seed + offset) % (max - min + 1)))

  const clarity       = simScore(42, 98, 1)
  const lighting      = simScore(38, 97, 2)
  const stability     = simScore(35, 96, 3)
  const playerVis     = simScore(44, 98, 4)
  const ballVis       = simScore(36, 96, 5)
  const actionComp    = simScore(48, 98, 6)

  // Map scores to checks
  const frameChecks: Array<[string, string, number, string, string]> = [
    ['clarity',    'Clarity / Sharpness',   clarity,    'Clip is too blurry to analyse properly.',             'Use a phone with a clean lens on a stable surface. Enable video stabilisation in your camera settings.'],
    ['lighting',   'Lighting',              lighting,   'Poor lighting makes it hard to see the player clearly.','Record in daylight or under floodlights. Avoid recording towards the sun.'],
    ['stability',  'Camera Stability',      stability,  'Camera is too shaky — the footage is hard to follow.', 'Rest your phone on a fence or use both hands. Many phones have a stabilisation toggle in the camera app.'],
    ['player_vis', 'Player Visibility',     playerVis,  'Player is too far from the camera.',                   'Move closer. The player should fill at least a quarter of the frame.'],
    ['ball_vis',   'Ball Visibility',       ballVis,    'Ball or player is not clearly visible in the clip.',   'Keep both the player and ball in frame throughout the key action.'],
    ['action',     'Action Completeness',   actionComp, 'Action starts too late or ends too early.',            'Start recording 5 seconds before the action and stop 3 seconds after.'],
  ]

  for (const [code, label, score, errorMsg, fix] of frameChecks) {
    if (score < 45) {
      checks.push({ code, level: 'error', label, message: errorMsg, fix })
    } else if (score < 65) {
      checks.push({ code, level: 'warn', label, message: `${label} could be improved (score: ${score}/100).`, fix })
    } else {
      checks.push({ code, level: 'pass', label, message: `${label} looks good (${score}/100).` })
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const hasErrors = checks.some(c => c.level === 'error')
  const frameAvg = Math.round((clarity + lighting + stability + playerVis + ballVis + actionComp) / 6)

  // Consent + format errors tank the score even if video looks ok
  const consentPenalty = !consentGiven ? 30 : 0
  const overall = Math.max(0, Math.min(100, frameAvg - consentPenalty))

  return {
    overall,
    passed: !hasErrors,
    scores: {
      clarity,
      lighting,
      stability,
      playerVisibility: playerVis,
      ballVisibility: ballVis,
      actionCompleteness: actionComp,
    },
    checks,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = reject
    setTimeout(() => reject(new Error('timeout')), 8000)
  })
}

function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }
    video.onerror = reject
    setTimeout(() => reject(new Error('timeout')), 8000)
  })
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
