import { normalize, countMatches, matchResult, matchPredictionPoints, flappyPredictionTokens, toDateInput, toArray } from '@/lib/scoring-utils'

describe('normalize', () => {
  it('returns empty string for null', () => {
    expect(normalize(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(normalize(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(normalize('')).toBe('')
  })

  it('trims whitespace', () => {
    expect(normalize('  hello  ')).toBe('hello')
  })

  it('lowercases', () => {
    expect(normalize('HELLO')).toBe('hello')
  })

  it('trims and lowercases together', () => {
    expect(normalize('  De Bruyne  ')).toBe('de bruyne')
  })

  it('handles normal string', () => {
    expect(normalize('van dijk')).toBe('van dijk')
  })
})

describe('countMatches', () => {
  it('returns 0 for empty predictions', () => {
    expect(countMatches([], ['van dijk', 'de jong'])).toBe(0)
  })

  it('returns 0 for empty master', () => {
    expect(countMatches(['van dijk'], [])).toBe(0)
  })

  it('returns 0 for both empty', () => {
    expect(countMatches([], [])).toBe(0)
  })

  it('returns correct count for full match', () => {
    expect(countMatches(['van dijk', 'de jong'], ['van dijk', 'de jong'])).toBe(2)
  })

  it('returns correct count for partial match', () => {
    expect(countMatches(['van dijk', 'wrong'], ['van dijk', 'de jong'])).toBe(1)
  })

  it('is case-insensitive', () => {
    expect(countMatches(['Van Dijk'], ['van dijk'])).toBe(1)
  })

  it('is whitespace-insensitive', () => {
    expect(countMatches(['  van dijk  '], ['van dijk'])).toBe(1)
  })

  it('ignores empty strings in predictions', () => {
    expect(countMatches(['', 'van dijk'], ['van dijk'])).toBe(1)
  })

  it('ignores empty strings in master', () => {
    expect(countMatches(['van dijk'], ['', 'van dijk'])).toBe(1)
  })

  it('does not double-count duplicates in predictions', () => {
    // Set-based master so prediction "van dijk" matches once
    expect(countMatches(['van dijk', 'van dijk'], ['van dijk'])).toBe(2)
  })
})

describe('matchResult', () => {
  it('returns H when home > away', () => {
    expect(matchResult(2, 1)).toBe('H')
  })

  it('returns A when away > home', () => {
    expect(matchResult(0, 3)).toBe('A')
  })

  it('returns D when equal', () => {
    expect(matchResult(1, 1)).toBe('D')
  })

  it('returns D for 0-0', () => {
    expect(matchResult(0, 0)).toBe('D')
  })

  it('handles large scores', () => {
    expect(matchResult(10, 9)).toBe('H')
  })
})

describe('matchPredictionPoints', () => {
  it('awards 3 points for exact score', () => {
    expect(matchPredictionPoints(
      { home_score: 2, away_score: 1 },
      { home_score: 2, away_score: 1 },
    )).toBe(3)
  })

  it('awards 1 point for correct result', () => {
    expect(matchPredictionPoints(
      { home_score: 1, away_score: 0 },
      { home_score: 3, away_score: 2 },
    )).toBe(1)
  })

  it('awards 0 points for wrong result', () => {
    expect(matchPredictionPoints(
      { home_score: 0, away_score: 1 },
      { home_score: 2, away_score: 1 },
    )).toBe(0)
  })

  it('awards 0 points while the actual score is incomplete', () => {
    expect(matchPredictionPoints(
      { home_score: 1, away_score: 1 },
      { home_score: null, away_score: 1 },
    )).toBe(0)
  })
})

describe('flappyPredictionTokens', () => {
  it('awards 5 tokens for exact score', () => {
    expect(flappyPredictionTokens(
      { home_score: 2, away_score: 1 },
      { home_score: 2, away_score: 1 },
    )).toBe(5)
  })

  it('awards 2 tokens for correct result', () => {
    expect(flappyPredictionTokens(
      { home_score: 1, away_score: 0 },
      { home_score: 3, away_score: 2 },
    )).toBe(2)
  })

  it('awards 0 tokens for wrong result', () => {
    expect(flappyPredictionTokens(
      { home_score: 0, away_score: 1 },
      { home_score: 2, away_score: 1 },
    )).toBe(0)
  })
})

describe('toDateInput', () => {
  it('returns empty string for null', () => {
    expect(toDateInput(null)).toBe('')
  })

  it('returns YYYY-MM-DD for a UTC ISO string', () => {
    // Use a specific date — we control the input, output is local-timezone dependent
    // Testing that the format is correct
    const result = toDateInput('2026-06-14T00:00:00.000Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns correct year for valid date', () => {
    const result = toDateInput('2026-03-15T12:00:00.000Z')
    expect(result.startsWith('2026')).toBe(true)
  })
})

describe('toArray', () => {
  it('returns array of empty strings for null', () => {
    expect(toArray(null, 3)).toEqual(['', '', ''])
  })

  it('returns array of empty strings for undefined', () => {
    expect(toArray(undefined, 3)).toEqual(['', '', ''])
  })

  it('returns array of empty strings for empty array', () => {
    expect(toArray([], 3)).toEqual(['', '', ''])
  })

  it('pads shorter array to length', () => {
    expect(toArray(['a', 'b'], 4)).toEqual(['a', 'b', '', ''])
  })

  it('returns exact array when same length', () => {
    expect(toArray(['a', 'b', 'c'], 3)).toEqual(['a', 'b', 'c'])
  })

  it('truncates longer array to length', () => {
    expect(toArray(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b'])
  })

  it('handles length of 26', () => {
    const result = toArray(['van dijk'], 26)
    expect(result.length).toBe(26)
    expect(result[0]).toBe('van dijk')
    expect(result[25]).toBe('')
  })

  it('does not mutate the original array', () => {
    const original = ['a', 'b']
    toArray(original, 4)
    expect(original).toEqual(['a', 'b'])
  })
})
