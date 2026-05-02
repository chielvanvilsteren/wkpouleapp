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
