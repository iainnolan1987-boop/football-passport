// src/lib/devData.ts

import type { DevTag, Drill } from '@/types'

export const DEV_TAGS: DevTag[] = [
  { id: 'scanning',        label: 'Scanning',            color: '#0099ff' },
  { id: 'first_touch',     label: 'First Touch',         color: '#00e87a' },
  { id: 'weak_foot',       label: 'Weak Foot',           color: '#ff6b35' },
  { id: 'finishing',       label: 'Finishing',           color: '#ffc107' },
  { id: 'passing',         label: 'Passing',             color: '#0099ff' },
  { id: 'dribbling',       label: 'Dribbling',           color: '#9b59b6' },
  { id: 'defending',       label: 'Defending',           color: '#ff4757' },
  { id: 'body_shape',      label: 'Body Shape',          color: '#00e87a' },
  { id: 'decision_making', label: 'Decision Making',     color: '#ffc107' },
  { id: 'work_rate',       label: 'Work Rate',           color: '#ff6b35' },
  { id: 'movement',        label: 'Movement Off Ball',   color: '#9b59b6' },
]

export const DRILLS: Drill[] = [
  {
    id: 1,
    tag: 'scanning',
    name: '3-Cone Scanning Drill',
    level: 'Beginner',
    mins: 10,
    description: 'Player receives a pass at each cone but must look over both shoulders before the ball arrives. Coach holds up fingers — player must call out the number before controlling.',
    setup: '3 cones in a triangle 5m apart, 1 ball, coach/parent',
    reps: '3 sets × 5 reps at each cone',
    coachTip: 'Shoulders must turn before the ball arrives, not after. Call it out — make it a habit.',
    emoji: '👀',
  },
  {
    id: 2,
    tag: 'weak_foot',
    name: 'Weak Foot Wall Passes',
    level: 'Beginner',
    mins: 15,
    description: 'Find a solid wall. Weak foot only — pass against the wall and control with the weak foot. Start at 3m, move to 5m, then add volleys.',
    setup: 'Wall, 1 ball',
    reps: '50 passes — all with the weaker foot',
    coachTip: 'Keep the ankle locked and toe slightly up on impact. 10 minutes daily beats one hour once a week.',
    emoji: '🦶',
  },
  {
    id: 3,
    tag: 'first_touch',
    name: 'First Touch Away From Pressure',
    level: 'Beginner',
    mins: 12,
    description: 'Coach serves the ball from 8m. Player must take the first touch into a cone gate on either the left or right — the coach calls the direction just before serving.',
    setup: '4 cones (2 gates), 1 ball, partner',
    reps: '4 sets × 6 reps alternating sides',
    coachTip: 'Decide direction before the ball arrives. Open the hips early.',
    emoji: '🎯',
  },
  {
    id: 4,
    tag: 'dribbling',
    name: 'Dribble Through Gates',
    level: 'Intermediate',
    mins: 15,
    description: 'Set 10 gates (two cones 1m wide) randomly in a 15×15m area. Player dribbles and must pass through as many gates as possible in 30 seconds — head must stay up.',
    setup: '20 cones, 1 ball, timer',
    reps: '6 × 30-second rounds with 20 seconds rest',
    coachTip: 'Eyes on the gates, not the ball. The player who looks down the most scores the least.',
    emoji: '⚡',
  },
  {
    id: 5,
    tag: 'finishing',
    name: '5-Angle Finishing',
    level: 'Intermediate',
    mins: 20,
    description: 'Place cones at 5 angles around the penalty area. Player strikes from each position 3 times. Record goals vs attempts. Focus on placement, not power.',
    setup: '5 cones, 6+ balls, goal (or makeshift goal)',
    reps: '3 shots × 5 positions = 15 total',
    coachTip: 'Pick your corner before you start your run. Power means nothing without direction.',
    emoji: '⚽',
  },
  {
    id: 6,
    tag: 'defending',
    name: 'Shadow Defending Drill',
    level: 'Intermediate',
    mins: 12,
    description: 'Attacker dribbles freely in a 10×10m box. Defender mirrors movement, staying 1–2m away, without attempting to win the ball for 10 seconds. Then the coach shouts "go" to press.',
    setup: 'Cones, 1 ball, 2 players',
    reps: '5 × 10-second shadow rounds per player',
    coachTip: 'Stay goal-side. Bend the knees, stay light on the feet. Never lunge.',
    emoji: '🛡️',
  },
  {
    id: 7,
    tag: 'passing',
    name: 'Pass and Move 4-Cone Box',
    level: 'Beginner',
    mins: 12,
    description: '4 players on corners of an 8×8m square. Pass clockwise, then follow your pass to the next cone. Progress to one-touch. Progress again to switching direction on a call.',
    setup: '4 cones, 1 ball, 4 players (or use 2 players across the square)',
    reps: '3 minutes each variation',
    coachTip: 'Pass into the space ahead of the movement — not to their feet.',
    emoji: '🔄',
  },
  {
    id: 8,
    tag: 'movement',
    name: 'Arcing Runs Drill',
    level: 'Advanced',
    mins: 15,
    description: 'Player starts behind a cone representing a defender. Makes a curved arcing run out-to-in to receive a pass played into space. The arc is key — straight runs are easier to defend.',
    setup: '3 cones, 1 ball, passer',
    reps: '10 reps left side, 10 reps right side',
    coachTip: 'Start the run late — timing always beats pace. The arc creates separation.',
    emoji: '🏃',
  },
  {
    id: 9,
    tag: 'body_shape',
    name: 'Open Body Receive and Turn',
    level: 'Beginner',
    mins: 10,
    description: 'Coach delivers ball. Player must open hips sideways-on to receive. They should be able to see both the ball and the "pitch" at the same time before the touch lands.',
    setup: 'Cones, 1 ball, partner',
    reps: '4 sets × 8 reps alternating left and right shoulder',
    coachTip: 'Ask the player: "Can you see the whole pitch before you touch it?" If not, open up more.',
    emoji: '🧍',
  },
  {
    id: 10,
    tag: 'decision_making',
    name: '3v1 Rondo — Quick Play',
    level: 'Intermediate',
    mins: 15,
    description: '3 players keep the ball from 1 defender in a 6×6m grid. Every pass must be made within 3 seconds — if not, possession switches. Forces quick decisions under mild pressure.',
    setup: '4 cones, 1 ball, 4 players',
    reps: '5-minute rounds, rotate defender every 5 losses',
    coachTip: 'Ask "what were your options?" after mistakes — not "why did you do that?"',
    emoji: '🧠',
  },
]

// Return the best drill for a given set of tags
export function getDrillForTags(tags: string[]): Drill | null {
  if (tags.length === 0) return null
  // Find the first drill that matches any of the selected tags
  for (const tag of tags) {
    const drill = DRILLS.find(d => d.tag === tag)
    if (drill) return drill
  }
  return DRILLS[0]
}

// Dev insights keyed by tag
export const DEV_INSIGHTS: Record<string, {
  strength: string
  improve: string
  parentTip: string
}> = {
  scanning:        { strength: 'Shows awareness of surroundings before receiving', improve: 'Look over shoulder earlier — before the ball is played, not after', parentTip: 'Ask your player where defenders were before they got the ball. Make it a habit of thought.' },
  first_touch:     { strength: 'Good initial ball control under pressure', improve: 'Take the first touch away from pressure, into space', parentTip: 'In the garden, serve the ball and call "left" or "right" — they touch it that way every time.' },
  weak_foot:       { strength: 'Showing willingness to use the weaker foot', improve: 'Weak foot strike needs more confidence and consistency', parentTip: 'Encourage weak foot use in casual kick-abouts at home. Praise the attempt, not just the result.' },
  finishing:       { strength: 'Good composure shown in front of goal', improve: 'Placement over power — pick a corner before striking', parentTip: 'Ask "which corner were you aiming for?" after every finish, whether it goes in or not.' },
  passing:         { strength: 'Accurate short passing in tight spaces', improve: 'Weight of pass needs to match the pace of the run', parentTip: 'In passing drills, ask them to say out loud where they are passing before they do it.' },
  dribbling:       { strength: 'Good close control and low centre of gravity', improve: 'Head must stay up while dribbling to read what is ahead', parentTip: 'Set up a cone course at home and ask them to call out your hand signals while dribbling.' },
  defending:       { strength: 'Good positional instincts and recovery runs', improve: 'Stay on feet — delay rather than dive in', parentTip: 'Watch defending clips together. Pause and ask: "what would you do here?"' },
  body_shape:      { strength: 'Opens up well to receive passes', improve: 'Get sideways-on before the ball arrives, not after', parentTip: 'Watch a professional in the same position for 5 minutes. Count how often they are side-on.' },
  decision_making: { strength: 'Patient in possession, makes few panicked passes', improve: 'Decisions need to come a fraction earlier — before pressure arrives', parentTip: 'After matches, ask "what were your options?" not "why did you do that?" One builds thinking, the other builds fear.' },
  work_rate:       { strength: 'High energy and pressing intensity clearly visible', improve: 'Press smarter — press on the right triggers, not just all the time', parentTip: 'Highlight the sprints and recoveries you see — these get coaches\' attention before anything else.' },
  movement:        { strength: 'Intelligent movement and well-timed runs into space', improve: 'Time the run to stay onside and receive in stride', parentTip: 'Watch where your player goes when they do not have the ball. That is where the game is really won.' },
}
