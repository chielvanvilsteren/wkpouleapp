'use client'

import { useRouter } from 'next/navigation'
import StickerbalModal from '@/components/StickerbalModal'
import StickerbalBackground from '@/components/StickerbalBackground'

export default function SpelPage() {
  const router = useRouter()
  return (
    <>
      <StickerbalBackground />
      <StickerbalModal onClose={() => router.push('/')} />
    </>
  )
}
