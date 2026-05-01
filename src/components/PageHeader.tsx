import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: ReactNode
  badge?: string
}

export default function PageHeader({ title, subtitle, badge }: Props) {
  return (
    <div className="bg-gradient-to-r from-knvb-700 to-knvb-500 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {badge && (
          <span className="inline-block bg-oranje-500 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide mb-3">
            {badge}
          </span>
        )}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
        {subtitle && <div className="text-white/70 mt-1.5 text-sm">{subtitle}</div>}
      </div>
    </div>
  )
}
