'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DisplayRefresh() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [router])

  return null
}
