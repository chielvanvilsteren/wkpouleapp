export type FootballDataScoreLine = {
  home: number | null
  away: number | null
}

export type FootballDataScore = {
  duration?: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
  fullTime: FootballDataScoreLine
  regularTime?: FootballDataScoreLine
  extraTime?: FootballDataScoreLine
  penalties?: FootballDataScoreLine
}

/**
 * Returns the match score including extra time, but excluding a penalty shootout.
 * If Football-Data does not provide enough detail to separate the shootout,
 * return null scores instead of persisting a penalty-inclusive result.
 */
export function scoreWithoutShootout(score: FootballDataScore): FootballDataScoreLine {
  if (score.duration !== 'PENALTY_SHOOTOUT') return score.fullTime

  const regularHome = score.regularTime?.home
  const regularAway = score.regularTime?.away

  if (regularHome === null || regularHome === undefined || regularAway === null || regularAway === undefined) {
    return { home: null, away: null }
  }

  return {
    home: regularHome + (score.extraTime?.home ?? 0),
    away: regularAway + (score.extraTime?.away ?? 0),
  }
}
