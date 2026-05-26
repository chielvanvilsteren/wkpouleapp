// Game constants (must match FootballGame.tsx)
const W = 800
const BALL_R = 18
const PIPE_W = 62
const BALL_X = 130

// First pipe spawns at W + 60, is "passed" when x + PIPE_W < BALL_X - BALL_R
const FIRST_PIPE_X = W + 60       // 860
const PASS_THRESHOLD_X = BALL_X - BALL_R - PIPE_W  // 50
const FIRST_PIPE_DIST = FIRST_PIPE_X - PASS_THRESHOLD_X  // 810

function getDifficultyPhysics(score: number) {
  const level = Math.floor(score / 10)
  return {
    speed:    Math.min(3.8 + level * 0.35, 6.5),
    interval: Math.max(285 - level * 6,    230),
  }
}

/**
 * Minimum wall-clock ms to legitimately pass `score` pipes at 60fps physics.
 *
 * Derives from actual game constants:
 *   - First pipe travels 810px at level-0 speed
 *   - Each subsequent pipe travels `interval` px at the speed for that score level
 */
export function minGameMs(score: number): number {
  if (score <= 0) return 0

  const FPS = 60
  let frames = Math.ceil(FIRST_PIPE_DIST / getDifficultyPhysics(0).speed)

  for (let s = 1; s < score; s++) {
    const d = getDifficultyPhysics(s)
    frames += Math.ceil(d.interval / d.speed)
  }

  return frames * (1000 / FPS)
}
