export function normalize(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

export function countMatches(predictions: string[], master: string[]): number {
  const masterSet = new Set(master.map(normalize).filter(Boolean))
  return predictions.filter((p) => masterSet.has(normalize(p))).length
}

export function matchResult(home: number, away: number): 'H' | 'D' | 'A' {
  if (home > away) return 'H'
  if (away > home) return 'A'
  return 'D'
}

export function matchPredictionPoints(
  prediction: { home_score: number; away_score: number },
  actual: { home_score: number | null; away_score: number | null },
): number {
  if (actual.home_score === null || actual.away_score === null) return 0
  if (prediction.home_score === actual.home_score && prediction.away_score === actual.away_score) return 3
  if (matchResult(prediction.home_score, prediction.away_score) === matchResult(actual.home_score, actual.away_score)) return 1
  return 0
}

export function flappyPredictionTokens(
  prediction: { home_score: number; away_score: number },
  actual: { home_score: number | null; away_score: number | null },
): number {
  if (actual.home_score === null || actual.away_score === null) return 0
  if (prediction.home_score === actual.home_score && prediction.away_score === actual.away_score) return 5
  if (matchResult(prediction.home_score, prediction.away_score) === matchResult(actual.home_score, actual.away_score)) return 2
  return 0
}

export function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toArray(arr: string[] | undefined | null, len: number): string[] {
  if (!arr || arr.length === 0) return Array(len).fill('')
  const result = [...arr]
  while (result.length < len) result.push('')
  return result.slice(0, len)
}
