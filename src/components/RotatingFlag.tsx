'use client'

import { useEffect, useState } from 'react'
import WavingFlag from './WavingFlag'

// WC 2026 qualified/likely participating nations (flagcdn.com codes)
const WC_2026_CODES = [
  'nl', 'de', 'fr', 'es', 'pt', 'gb-eng', 'it', 'be', 'ch', 'at',
  'hr', 'rs', 'tr', 'hu', 'sk', 'gb-sct', 'dk', 'se', 'cz', 'pl',
  'ro', 'ua', 'gr',
  'us', 'ca', 'mx', 'pa', 'jm', 'cr', 'hn',
  'br', 'ar', 'co', 'uy', 'ec', 'pe', 'cl', 've', 'py',
  'ma', 'sn', 'eg', 'ng', 'za', 'ci', 'cm', 'gh', 'dz', 'tn',
  'jp', 'kr', 'au', 'sa', 'ir', 'iq', 'jo', 'cn', 'uz',
]

type Props = {
  className?: string
}

export default function RotatingFlag({ className = '' }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % WC_2026_CODES.length)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const flagUrl = `https://flagcdn.com/w320/${WC_2026_CODES[index]}.png`

  return <WavingFlag className={className} flagUrl={flagUrl} />
}
