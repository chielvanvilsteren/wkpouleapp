import { scoreWithoutShootout } from '@/lib/football-data-score'

describe('scoreWithoutShootout', () => {
  it('uses the full-time score for a regular match', () => {
    expect(scoreWithoutShootout({
      duration: 'REGULAR',
      fullTime: { home: 2, away: 1 },
    })).toEqual({ home: 2, away: 1 })
  })

  it('keeps goals scored during extra time', () => {
    expect(scoreWithoutShootout({
      duration: 'EXTRA_TIME',
      fullTime: { home: 3, away: 2 },
      regularTime: { home: 3, away: 0 },
      extraTime: { home: 0, away: 2 },
    })).toEqual({ home: 3, away: 2 })
  })

  it('excludes penalty-shootout goals', () => {
    expect(scoreWithoutShootout({
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 5, away: 4 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 4, away: 3 },
    })).toEqual({ home: 1, away: 1 })
  })

  it('supports a shootout without extra time', () => {
    expect(scoreWithoutShootout({
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 5, away: 4 },
      regularTime: { home: 1, away: 1 },
      penalties: { home: 4, away: 3 },
    })).toEqual({ home: 1, away: 1 })
  })

  it('refuses a penalty-inclusive score when regular-time details are missing', () => {
    expect(scoreWithoutShootout({
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 5, away: 4 },
      penalties: { home: 4, away: 3 },
    })).toEqual({ home: null, away: null })
  })
})
